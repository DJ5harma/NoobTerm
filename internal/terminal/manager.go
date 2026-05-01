package terminal

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"runtime"
	"sync"

	"github.com/aymanbagabas/go-pty"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxBufferBytes = 100 * 1024 

type Session struct {
	ID     string
	PTY    pty.Pty
	Cmd    *pty.Cmd
	Quit   chan struct{}
	Buffer bytes.Buffer
	mu     sync.Mutex
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
				data := buf[:n]
				
				session.mu.Lock()
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
