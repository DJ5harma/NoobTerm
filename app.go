package main

import (
	"context"
	"fmt"

	"NoobTerm/internal/terminal"
	"NoobTerm/internal/workspace"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	terminalManager  *terminal.Manager
	workspaceManager *workspace.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	wm, err := workspace.NewManager()
	if err != nil {
		fmt.Printf("Error creating workspace manager: %v\n", err)
	}
	return &App{
		terminalManager:  terminal.NewManager(),
		workspaceManager: wm,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.terminalManager.SetContext(ctx)
	if a.workspaceManager != nil {
		a.workspaceManager.SetContext(ctx)
	}
}

// SelectDirectory opens a directory dialog and returns the selected path
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		DefaultDirectory: "",
		Title:            "Select Workspace Directory",
	})
}

// Terminal methods

func (a *App) GetOrCreateTerminal(id, cwd string) (string, error) {
	return a.terminalManager.Create(id, cwd)
}

func (a *App) GetTerminalBuffer(id string) string {
	return a.terminalManager.GetBuffer(id)
}

func (a *App) WriteTerminal(id, data string) error {
	return a.terminalManager.Write(id, data)
}

func (a *App) ResizeTerminal(id string, cols, rows int) error {
	return a.terminalManager.Resize(id, cols, rows)
}

func (a *App) CloseTerminal(id string) {
	a.terminalManager.Close(id)
}

func (a *App) GetAvailableShells() []terminal.ShellInfo {
	return a.terminalManager.GetAvailableShells()
}

func (a *App) GetConfig() terminal.Config {
	return a.terminalManager.GetConfig()
}

func (a *App) SaveConfig(config terminal.Config) error {
	return a.terminalManager.SaveConfig(config)
}

func (a *App) GetOpenPorts() ([]workspace.PortInfo, error) {
	return workspace.GetOpenPorts()
}

// Workspace methods

func (a *App) CreateWorkspace(name, path string) (*workspace.Workspace, error) {
	if a.workspaceManager == nil {
		return nil, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.Create(name, path)
}

func (a *App) ListWorkspaces() ([]*workspace.Workspace, error) {
	if a.workspaceManager == nil {
		return []*workspace.Workspace{}, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.List()
}

func (a *App) SaveWorkspace(ws *workspace.Workspace) error {
	if a.workspaceManager == nil {
		return fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.Save(ws)
}

func (a *App) DeleteWorkspace(id string) error {
	if a.workspaceManager == nil {
		return fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.Delete(id)
}
