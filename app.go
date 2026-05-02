package main

import (
	"context"
	"fmt"

	"NoobTerm/internal/models"
	"NoobTerm/internal/system"
	"NoobTerm/internal/terminal"
	"NoobTerm/internal/workspace"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	terminalManager  *terminal.Manager
	workspaceManager *workspace.Manager
}

// NewApp creates a new App struct
func NewApp() *App {
	wm, _ := workspace.NewManager()
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

func (a *App) GetOrCreateTerminal(id, cwd string) (string, error) {
	return a.terminalManager.Create(id, cwd)
}

func (a *App) GetTerminalBuffer(id string) (string, error) {
	return a.terminalManager.GetBuffer(id), nil
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

func (a *App) GetAvailableShells() []models.ShellInfo {
	return a.terminalManager.GetAvailableShells()
}

func (a *App) GetConfig() models.Config {
	return a.terminalManager.GetConfig()
}

func (a *App) SaveConfig(config models.Config) error {
	return a.terminalManager.SaveConfig(config)
}

func (a *App) GetOpenPorts() ([]models.PortInfo, error) {
	return system.GetOpenPorts()
}

func (a *App) GetSystemStats() (*models.SystemStats, error) {
	return system.GetSystemStats()
}

func (a *App) SelectDirectory() (string, error) {
	return wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Workspace Directory",
	})
}

// Workspace methods

func (a *App) CreateWorkspace(name, path string) (*models.Workspace, error) {
	if a.workspaceManager == nil {
		return nil, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.Create(name, path)
}

func (a *App) ListWorkspaces() ([]*models.Workspace, error) {
	if a.workspaceManager == nil {
		return nil, fmt.Errorf("workspace manager not initialized")
	}
	return a.workspaceManager.List()
}

func (a *App) SaveWorkspace(ws *models.Workspace) error {
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
