package workspace

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Manager struct {
	workspacesDir string
	mu            sync.Mutex
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
	}, nil
}

func (m *Manager) Create(name, path string) (*Workspace, error) {
	ws := &Workspace{
		ID:        uuid.New().String(),
		Name:      name,
		Path:      path,
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
		Tabs:      []Tab{},
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
				if ws.Tabs == nil {
					ws.Tabs = []Tab{}
				}
				if ws.Commands == nil {
					ws.Commands = []Command{}
				}
				for i := range ws.Tabs {
					if ws.Tabs[i].Panes == nil {
						ws.Tabs[i].Panes = []Pane{}
					}
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
