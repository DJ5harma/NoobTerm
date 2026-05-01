package terminal

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"

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
}

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
	}
}

func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
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

	var shell string
	if runtime.GOOS == "windows" {
		shell = "powershell.exe"
	} else {
		shell = os.Getenv("SHELL")
		if shell == "" {
			shell = "bash"
		}
	}

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

	for {
		select {
		case <-session.Quit:
			return
		case <-ticker.C:
			if session.Cmd.Process == nil {
				continue
			}

			stats := TerminalStats{
				Status: "running",
			}

			// Try to get process info
			p, err := process.NewProcess(int32(session.Cmd.Process.Pid))
			if err != nil {
				stats.Status = "crashed"
				wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, stats)
				return
			}

			// Check if shell exited
			if ok, _ := p.IsRunning(); !ok {
				stats.Status = "exited"
				wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, stats)
				return
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
				childCPU, _ := child.CPUPercent()
				childMem, _ := child.MemoryInfo()
				stats.CPU += childCPU
				if childMem != nil {
					stats.Memory += childMem.RSS
				}
			}

			wailsRuntime.EventsEmit(m.ctx, "terminal-stats-"+session.ID, stats)
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
