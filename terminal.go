package main

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

type TerminalSession struct {
	ID   string
	PTY  pty.Pty
	Cmd  *pty.Cmd
	Quit chan struct{}
}

type TerminalManager struct {
	sessions map[string]*TerminalSession
	mu       sync.Mutex
	ctx      context.Context
}

func NewTerminalManager() *TerminalManager {
	return &TerminalManager{
		sessions: make(map[string]*TerminalSession),
	}
}

func (tm *TerminalManager) SetContext(ctx context.Context) {
	tm.ctx = ctx
}

func (tm *TerminalManager) CreateTerminal(cwd string) (string, error) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

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
	session := &TerminalSession{
		ID:   id,
		PTY:  p,
		Cmd:  cmd,
		Quit: make(chan struct{}),
	}

	tm.sessions[id] = session

	// Read output in a goroutine
	go tm.readOutput(session)

	return id, nil
}

func (tm *TerminalManager) readOutput(session *TerminalSession) {
	buf := make([]byte, 1024*10)
	for {
		select {
		case <-session.Quit:
			return
		default:
			n, err := session.PTY.Read(buf)
			if n > 0 {
				// Emit event to frontend
				wailsRuntime.EventsEmit(tm.ctx, "terminal-output-"+session.ID, string(buf[:n]))
			}
			if err != nil {
				if err != io.EOF {
					log.Printf("Terminal %s read error: %v", session.ID, err)
				}
				tm.CloseTerminal(session.ID)
				return
			}
		}
	}
}

func (tm *TerminalManager) WriteTerminal(id, data string) error {
	tm.mu.Lock()
	session, ok := tm.sessions[id]
	tm.mu.Unlock()

	if !ok {
		return nil
	}

	_, err := session.PTY.Write([]byte(data))
	return err
}

func (tm *TerminalManager) ResizeTerminal(id string, cols, rows int) error {
	tm.mu.Lock()
	session, ok := tm.sessions[id]
	tm.mu.Unlock()

	if !ok {
		return nil
	}

	return session.PTY.Resize(cols, rows)
}

func (tm *TerminalManager) CloseTerminal(id string) {
	tm.mu.Lock()
	session, ok := tm.sessions[id]
	if !ok {
		tm.mu.Unlock()
		return
	}
	delete(tm.sessions, id)
	tm.mu.Unlock()

	close(session.Quit)
	session.PTY.Close()
	if session.Cmd.Process != nil {
		session.Cmd.Process.Kill()
	}
	// Notify frontend that terminal is closed
	wailsRuntime.EventsEmit(tm.ctx, "terminal-closed-"+id, nil)
}
