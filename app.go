package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	terminalManager  *TerminalManager
	workspaceManager *WorkspaceManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	wm, err := NewWorkspaceManager()
	if err != nil {
		fmt.Printf("Error creating workspace manager: %v\n", err)
	}
	return &App{
		terminalManager:  NewTerminalManager(),
		workspaceManager: wm,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.terminalManager.SetContext(ctx)
}

// SelectDirectory opens a directory dialog and returns the selected path
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		DefaultDirectory: "",
		Title:            "Select Workspace Directory",
	})
}

// Terminal methods

func (a *App) CreateTerminal(cwd string) (string, error) {
	return a.terminalManager.CreateTerminal(cwd)
}

func (a *App) WriteTerminal(id, data string) error {
	return a.terminalManager.WriteTerminal(id, data)
}

func (a *App) ResizeTerminal(id string, cols, rows int) error {
	return a.terminalManager.ResizeTerminal(id, cols, rows)
}

func (a *App) CloseTerminal(id string) {
	a.terminalManager.CloseTerminal(id)
}

// Workspace methods

func (a *App) CreateWorkspace(name, path string) (*Workspace, error) {
	if a.workspaceManager == nil {
		return nil, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.CreateWorkspace(name, path)
}

func (a *App) ListWorkspaces() ([]*Workspace, error) {
	if a.workspaceManager == nil {
		return []*Workspace{}, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.ListWorkspaces()
}

func (a *App) SaveWorkspace(ws *Workspace) error {
	if a.workspaceManager == nil {
		return fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.SaveWorkspace(ws)
}

func (a *App) DeleteWorkspace(id string) error {
	if a.workspaceManager == nil {
		return fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.DeleteWorkspace(id)
}
