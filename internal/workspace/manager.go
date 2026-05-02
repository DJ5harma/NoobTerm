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

	"NoobTerm/internal/models"
	"github.com/google/uuid"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type Manager struct {
	workspacesDir string
	mu            sync.Mutex
	ctx           context.Context
	lastBranches  map[string]string
	lastHeadTimes map[string]time.Time
	workspaces    map[string]*models.Workspace
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

	m := &Manager{
		workspacesDir: dir,
		lastBranches:  make(map[string]string),
		lastHeadTimes: make(map[string]time.Time),
		workspaces:    make(map[string]*models.Workspace),
	}

	// Initial load
	if _, err := m.List(); err != nil {
		return nil, err
	}

	return m, nil
}

func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
	go m.monitorBranches()
}

func (m *Manager) getGitBranch(wsID, path string) string {
	gitDir := filepath.Join(path, ".git")
	headPath := filepath.Join(gitDir, "HEAD")

	// Check if directory exists first
	info, err := os.Stat(headPath)
	if err != nil {
		return ""
	}

	m.mu.Lock()
	lastTime, exists := m.lastHeadTimes[wsID]
	lastBranch := m.lastBranches[wsID]
	m.mu.Unlock()

	if exists && info.ModTime().Equal(lastTime) {
		return lastBranch
	}

	m.mu.Lock()
	m.lastHeadTimes[wsID] = info.ModTime()
	m.mu.Unlock()

	cmd := exec.Command("git", "symbolic-ref", "--short", "HEAD")
	cmd.Dir = path
	hideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		// Fallback for detached HEAD
		cmd = exec.Command("git", "rev-parse", "--short", "HEAD")
		cmd.Dir = path
		hideWindow(cmd)
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
			m.mu.Lock()
			// Use a slice to avoid holding lock during I/O
			var workspaces []*models.Workspace
			for _, ws := range m.workspaces {
				workspaces = append(workspaces, ws)
			}
			m.mu.Unlock()

			for _, ws := range workspaces {
				branch := m.getGitBranch(ws.ID, ws.Path)
				
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

func (m *Manager) Create(name, path string) (*models.Workspace, error) {
	ws := &models.Workspace{
		ID:        uuid.New().String(),
		Name:      name,
		Path:      path,
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
		Layout:    "", // Will be initialized by frontend
		Commands:  []models.Command{},
	}

	if err := m.Save(ws); err != nil {
		return nil, err
	}

	m.mu.Lock()
	m.workspaces[ws.ID] = ws
	m.mu.Unlock()

	return ws, nil
}

func (m *Manager) List() ([]*models.Workspace, error) {
	m.mu.Lock()
	if len(m.workspaces) > 0 {
		var list []*models.Workspace
		for _, ws := range m.workspaces {
			list = append(list, ws)
		}
		m.mu.Unlock()
		return list, nil
	}
	m.mu.Unlock()

	files, err := os.ReadDir(m.workspacesDir)
	if err != nil {
		return nil, err
	}

	var workspaces []*models.Workspace
	m.mu.Lock()
	for _, f := range files {
		if filepath.Ext(f.Name()) == ".json" {
			data, err := os.ReadFile(filepath.Join(m.workspacesDir, f.Name()))
			if err != nil {
				continue
			}
			var ws models.Workspace
			if err := json.Unmarshal(data, &ws); err == nil {
				if ws.Commands == nil {
					ws.Commands = []models.Command{}
				}
				workspaces = append(workspaces, &ws)
				m.workspaces[ws.ID] = &ws
			}
		}
	}
	m.mu.Unlock()
	return workspaces, nil
}

func (m *Manager) Save(ws *models.Workspace) error {
	m.mu.Lock()
	ws.UpdatedAt = time.Now().UnixMilli()
	m.workspaces[ws.ID] = ws
	m.mu.Unlock()

	data, err := json.MarshalIndent(ws, "", "  ")
	if err != nil {
		return err
	}

	path := filepath.Join(m.workspacesDir, fmt.Sprintf("%s.json", ws.ID))
	return os.WriteFile(path, data, 0644)
}

func (m *Manager) Delete(id string) error {
	m.mu.Lock()
	delete(m.workspaces, id)
	delete(m.lastBranches, id)
	delete(m.lastHeadTimes, id)
	m.mu.Unlock()

	path := filepath.Join(m.workspacesDir, fmt.Sprintf("%s.json", id))
	return os.Remove(path)
}
