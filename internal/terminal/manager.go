package terminal

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"NoobTerm/internal/models"
	"github.com/aymanbagabas/go-pty"
	"github.com/shirou/gopsutil/v3/process"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxBufferBytes = 100 * 1024 

type TerminalStats struct {
	CPU    float64 `json:"cpu"`
	Memory uint64  `json:"memory"`
	Status string  `json:"status"`
}

type Session struct {
	ID        string
	PTY       pty.Pty
	Cmd       *pty.Cmd
	Quit      chan struct{}
	Buffer    bytes.Buffer
	IsRunning bool
	mu        sync.Mutex
}

type Manager struct {
	sessions map[string]*Session
	mu       sync.Mutex
	ctx      context.Context
	config   models.Config
	configPath string
}

func NewManager() *Manager {
	home, _ := os.UserHomeDir()
	configDir := filepath.Join(home, ".termspace")
	os.MkdirAll(configDir, 0755)
	configPath := filepath.Join(configDir, "config.json")

	m := &Manager{
		sessions: make(map[string]*Session),
		configPath: configPath,
	}
	m.loadConfig()
	return m
}

func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
}

func (m *Manager) loadConfig() {
	data, err := os.ReadFile(m.configPath)
	if err == nil {
		json.Unmarshal(data, &m.config)
	}
	if m.config.DefaultShell == "" {
		if runtime.GOOS == "windows" {
			m.config.DefaultShell = "powershell.exe"
		} else {
			m.config.DefaultShell = os.Getenv("SHELL")
			if m.config.DefaultShell == "" {
				m.config.DefaultShell = "bash"
			}
		}
	}
}

func (m *Manager) SaveConfig(config models.Config) error {
	m.mu.Lock()
	m.config = config
	m.mu.Unlock()

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.configPath, data, 0644)
}

func (m *Manager) GetConfig() models.Config {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.config
}

func (m *Manager) GetAvailableShells() []models.ShellInfo {
	var shells []models.ShellInfo
	var searchList []string

	if runtime.GOOS == "windows" {
		searchList = []string{
			"powershell.exe",
			"pwsh.exe",
			"cmd.exe",
			"bash.exe",
			"git-bash.exe",
		}
	} else {
		searchList = []string{
			"bash",
			"zsh",
			"fish",
			"sh",
		}
	}

	for _, name := range searchList {
		if path, err := exec.LookPath(name); err == nil {
			shells = append(shells, models.ShellInfo{
				Name: strings.TrimSuffix(name, ".exe"),
				Path: path,
			})
		}
	}

	// Also check some common absolute paths if not in PATH
	if runtime.GOOS == "windows" {
		commonPaths := []string{
			`C:\Program Files\Git\bin\bash.exe`,
			`C:\Program Files\Git\git-bash.exe`,
			`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`,
			`C:\Windows\System32\cmd.exe`,
		}
		for _, p := range commonPaths {
			if _, err := os.Stat(p); err == nil {
				exists := false
				for _, s := range shells {
					if s.Path == p {
						exists = true
						break
					}
				}
				if !exists {
					name := filepath.Base(p)
					shells = append(shells, models.ShellInfo{
						Name: strings.TrimSuffix(name, ".exe"),
						Path: p,
					})
				}
			}
		}
	}

	return shells
}

func (m *Manager) Create(id, cwd string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if session, ok := m.sessions[id]; ok {
		return session.ID, nil
	}

	p, err := pty.New()
	if err != nil {
		return "", err
	}

	shell := m.config.DefaultShell
	if fullPath, err := exec.LookPath(shell); err == nil {
		shell = fullPath
	}

	cmd := p.Command(shell)
	if cwd != "" {
		cmd.Dir = cwd
	}

	if err := cmd.Start(); err != nil {
		p.Close()
		return "", err
	}

	session := &Session{
		ID:   id,
		PTY:  p,
		Cmd:  cmd,
		Quit: make(chan struct{}),
	}

	m.sessions[id] = session
	go m.readOutput(session)
	go m.monitorStats(session)

	return id, nil
}

func (m *Manager) monitorStats(session *Session) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var lastCPU float64
	var lastMem uint64
	var lastStatus string

	for {
		select {
		case <-session.Quit:
			return
		case <-ticker.C:
			if session.Cmd.Process == nil {
				continue
			}

			// Try to get process info
			p, err := process.NewProcess(int32(session.Cmd.Process.Pid))
			if err != nil {
				if lastStatus != "crashed" {
					lastStatus = "crashed"
					wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, TerminalStats{Status: "crashed"})
				}
				return
			}

			// Check if shell exited
			isRunning, _ := p.IsRunning()
			if !isRunning {
				if lastStatus != "exited" {
					lastStatus = "exited"
					wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, TerminalStats{Status: "exited"})
				}
				return
			}

			stats := TerminalStats{
				Status: "running",
			}

			// Get CPU and Memory
			cpu, _ := p.CPUPercent()
			memInfo, _ := p.MemoryInfo()

			stats.CPU = cpu
			if memInfo != nil {
				stats.Memory = memInfo.RSS
			}

			// Also sum up children resources
			children, _ := p.Children()
			for _, child := range children {
				if childIsRunning, _ := child.IsRunning(); !childIsRunning {
					continue
				}
				childCPU, _ := child.CPUPercent()
				childMem, _ := child.MemoryInfo()
				stats.CPU += childCPU
				if childMem != nil {
					stats.Memory += childMem.RSS
				}
			}

			// Only emit if status changed or stats changed significantly
			// Threshold: 0.5% CPU change or 1MB memory change
			memDiff := uint64(0)
			if stats.Memory > lastMem {
				memDiff = stats.Memory - lastMem
			} else {
				memDiff = lastMem - stats.Memory
			}

			cpuDiff := stats.CPU - lastCPU
			if cpuDiff < 0 {
				cpuDiff = -cpuDiff
			}

			if stats.Status != lastStatus || cpuDiff > 0.5 || memDiff > 1024*1024 {
				wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, stats)
				lastCPU = stats.CPU
				lastMem = stats.Memory
				lastStatus = stats.Status
			}
		}
	}
}

func (m *Manager) readOutput(session *Session) {
	buf := make([]byte, 1024*10)
	lastActivity := time.Now()
	
	// Start a ticker to check for inactivity and reset IsRunning
	// Using a separate goroutine to manage the timer
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-session.Quit:
				return
			case <-ticker.C:
				session.mu.Lock()
				if session.IsRunning && time.Since(lastActivity) > 2*time.Second {
					session.IsRunning = false
					wailsRuntime.EventsEmit(m.ctx, "terminal-state-"+session.ID, false)
				}
				session.mu.Unlock()
			}
		}
	}()

	for {
		select {
		case <-session.Quit:
			return
		default:
			n, err := session.PTY.Read(buf)
			if n > 0 {
				data := buf[:n]
				
				session.mu.Lock()
				lastActivity = time.Now()
				if !session.IsRunning {
					session.IsRunning = true
					wailsRuntime.EventsEmit(m.ctx, "terminal-state-"+session.ID, true)
				}

				if session.Buffer.Len()+len(data) > maxBufferBytes {
					session.Buffer.Reset()
				}
				session.Buffer.Write(data)
				session.mu.Unlock()

				wailsRuntime.EventsEmit(m.ctx, "terminal-output-"+session.ID, string(data))
			}
			if err != nil {
				m.Close(session.ID)
				return
			}
		}
	}
}

func (m *Manager) GetBuffer(id string) string {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok {
		return ""
	}

	session.mu.Lock()
	defer session.mu.Unlock()
	return session.Buffer.String()
}

func (m *Manager) Write(id, data string) error {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok {
		return nil
	}

	_, err := session.PTY.Write([]byte(data))
	return err
}

func (m *Manager) Resize(id string, cols, rows int) error {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok {
		return nil
	}

	return session.PTY.Resize(cols, rows)
}

func (m *Manager) Close(id string) {
	m.mu.Lock()
	session, ok := m.sessions[id]
	if !ok {
		m.mu.Unlock()
		return
	}
	delete(m.sessions, id)
	m.mu.Unlock()

	close(session.Quit)
	session.PTY.Close()
	if session.Cmd.Process != nil {
		session.Cmd.Process.Kill()
	}
}
