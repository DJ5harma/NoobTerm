package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
	Tabs      []Tab     `json:"tabs"`
	Commands  []Command `json:"commands"`
}

type Tab struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Panes      []Pane     `json:"panes"`
	RootLayout LayoutNode `json:"rootLayout"`
}

type Pane struct {
	ID        string      `json:"id"`
	CWD       string      `json:"cwd"`
	ProcessID int         `json:"processId,omitempty"`
	Layout    *LayoutNode `json:"layout"`
}

type LayoutNode struct {
	Type      string        `json:"type"` // "split" or "pane"
	Direction string        `json:"direction,omitempty"` // "horizontal" or "vertical"
	Children  []*LayoutNode `json:"children,omitempty"`
	PaneID    string        `json:"paneId,omitempty"`
}

type Command struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Command   string            `json:"command"`
	Group     string            `json:"group,omitempty"`
	Variables []CommandVariable `json:"variables,omitempty"`
}

type CommandVariable struct {
	Name    string `json:"name"`
	Default string `json:"default,omitempty"`
}

type WorkspaceManager struct {
	workspacesDir string
	mu            sync.Mutex
}

func NewWorkspaceManager() (*WorkspaceManager, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dir := filepath.Join(home, ".termspace", "workspaces")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	return &WorkspaceManager{
		workspacesDir: dir,
	}, nil
}

func (wm *WorkspaceManager) CreateWorkspace(name, path string) (*Workspace, error) {
	ws := &Workspace{
		ID:        uuid.New().String(),
		Name:      name,
		Path:      path,
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
		Tabs:      []Tab{},
		Commands:  []Command{},
	}

	if err := wm.SaveWorkspace(ws); err != nil {
		return nil, err
	}

	return ws, nil
}

func (wm *WorkspaceManager) ListWorkspaces() ([]*Workspace, error) {
	workspaces := []*Workspace{}
	files, err := os.ReadDir(wm.workspacesDir)
	if err != nil {
		return workspaces, err
	}

	for _, f := range files {
		if filepath.Ext(f.Name()) == ".json" {
			data, err := os.ReadFile(filepath.Join(wm.workspacesDir, f.Name()))
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

func (wm *WorkspaceManager) SaveWorkspace(ws *Workspace) error {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	ws.UpdatedAt = time.Now().UnixMilli()
	data, err := json.MarshalIndent(ws, "", "  ")
	if err != nil {
		return err
	}

	path := filepath.Join(wm.workspacesDir, fmt.Sprintf("%s.json", ws.ID))
	return os.WriteFile(path, data, 0644)
}

func (wm *WorkspaceManager) DeleteWorkspace(id string) error {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	path := filepath.Join(wm.workspacesDir, fmt.Sprintf("%s.json", id))
	return os.Remove(path)
}
