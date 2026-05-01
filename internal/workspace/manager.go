package workspace

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type Manager struct {
	workspacesDir string
	mu            sync.Mutex
	ctx           context.Context
	lastBranches  map[string]string
}

func NewManager() (*Manager, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dir := filepath.Join(home, ".termspace", "workspaces")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	return &Manager{
		workspacesDir: dir,
		lastBranches:  make(map[string]string),
	}, nil
}

func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
	go m.monitorBranches()
}

func (m *Manager) getGitBranch(path string) string {
	// Check if directory exists first
	if _, err := os.Stat(filepath.Join(path, ".git")); os.IsNotExist(err) {
		return ""
	}

	cmd := exec.Command("git", "symbolic-ref", "--short", "HEAD")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil {
		// Fallback for detached HEAD
		cmd = exec.Command("git", "rev-parse", "--short", "HEAD")
		cmd.Dir = path
		out, err = cmd.Output()
		if err != nil {
			return ""
		}
		return fmt.Sprintf("(%s)", strings.TrimSpace(string(out)))
	}
	return strings.TrimSpace(string(out))
}

func (m *Manager) monitorBranches() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			workspaces, err := m.List()
			if err != nil {
				continue
			}

			for _, ws := range workspaces {
				branch := m.getGitBranch(ws.Path)
				
				m.mu.Lock()
				last, ok := m.lastBranches[ws.ID]
				if !ok || last != branch {
					m.lastBranches[ws.ID] = branch
					wailsRuntime.EventsEmit(m.ctx, "workspace-git-"+ws.ID, branch)
				}
				m.mu.Unlock()
			}
		}
	}
}

func (m *Manager) Create(name, path string) (*Workspace, error) {
	ws := &Workspace{
		ID:        uuid.New().String(),
		Name:      name,
		Path:      path,
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
		Layout:    "", // Will be initialized by frontend
		Commands:  []Command{},
	}

	if err := m.Save(ws); err != nil {
		return nil, err
	}

	return ws, nil
}

func (m *Manager) List() ([]*Workspace, error) {
	workspaces := []*Workspace{}
	files, err := os.ReadDir(m.workspacesDir)
	if err != nil {
		return workspaces, err
	}

	for _, f := range files {
		if filepath.Ext(f.Name()) == ".json" {
			data, err := os.ReadFile(filepath.Join(m.workspacesDir, f.Name()))
			if err != nil {
				continue
			}
			var ws Workspace
			if err := json.Unmarshal(data, &ws); err == nil {
				if ws.Commands == nil {
					ws.Commands = []Command{}
				}
				workspaces = append(workspaces, &ws)
			}
		}
	}
	return workspaces, nil
}

func (m *Manager) Save(ws *Workspace) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	ws.UpdatedAt = time.Now().UnixMilli()
	data, err := json.MarshalIndent(ws, "", "  ")
	if err != nil {
		return err
	}

	path := filepath.Join(m.workspacesDir, fmt.Sprintf("%s.json", ws.ID))
	return os.WriteFile(path, data, 0644)
}

func (m *Manager) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.workspacesDir, fmt.Sprintf("%s.json", id))
	return os.Remove(path)
}
