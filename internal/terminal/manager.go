package terminal

import (
	"context"
	"io"
	"log"
	"os"
	"os/exec"
	"runtime"
	"sync"

	"github.com/aymanbagabas/go-pty"
	"github.com/google/uuid"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type Session struct {
	ID   string
	PTY  pty.Pty
	Cmd  *pty.Cmd
	Quit chan struct{}
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

func (m *Manager) Create(cwd string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

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

	// Resolve absolute path to shell to avoid relative path issues in go-pty
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

	id := uuid.New().String()
	session := &Session{
		ID:   id,
		PTY:  p,
		Cmd:  cmd,
		Quit: make(chan struct{}),
	}

	m.sessions[id] = session

	// Read output in a goroutine
	go m.readOutput(session)

	return id, nil
}

func (m *Manager) readOutput(session *Session) {
	buf := make([]byte, 1024*10)
	for {
		select {
		case <-session.Quit:
			return
		default:
			n, err := session.PTY.Read(buf)
			if n > 0 {
				// Emit event to frontend
				wailsRuntime.EventsEmit(m.ctx, "terminal-output-"+session.ID, string(buf[:n]))
			}
			if err != nil {
				if err != io.EOF {
					log.Printf("Terminal %s read error: %v", session.ID, err)
				}
				m.Close(session.ID)
				return
			}
		}
	}
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
	// Notify frontend that terminal is closed
	wailsRuntime.EventsEmit(m.ctx, "terminal-closed-"+id, nil)
}
