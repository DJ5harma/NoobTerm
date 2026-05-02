import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Model, TabNode, Action, Actions, DockLocation, TabSetNode, ITabSetRenderValues, BorderNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

// Components
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import CommandBar from './components/CommandBar';
import StatusBar from './components/StatusBar';
import GlobalModal from './components/GlobalModal';
import TabLabel from './components/TabLabel';
import TerminalContextMenu from './components/TerminalContextMenu';
import CommandPalette, { SearchResult } from './components/CommandPalette';

// Hooks & Stores
import { useWorkspaceStore } from './store';
import { useThemeStore } from './themeStore';
import { useModalStore } from './modalStore';
import { useTerminalMonitor } from './hooks/useTerminalMonitor';
import { useStartupCommands } from './hooks/useStartupCommands';

// Utils & Backend
import { CloseTerminal, WriteTerminal } from '../wailsjs/go/main/App';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cleanTerminalTitle } from './utils/terminal';

interface ContextMenu {
  x: number;
  y: number;
  node: TabNode;
}

function App() {
  const { 
    workspaces, 
    activeWorkspaceId, 
    fetchWorkspaces, 
    fetchConfig, 
    fetchAvailableShells, 
    setActiveWorkspace, 
    setActiveTerminal, 
    updateActiveWorkspaceLayout,
    isSidebarCollapsed,
    setSidebarCollapsed,
    setShowShellModal,
    setShowThemeModal
  } = useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();
  const { prompt: modalPrompt, confirm: modalConfirm } = useModalStore();
  
  // Custom Hooks
  const { runningTerminals, terminalStats, handleRunningChange, handleStatsChange } = useTerminalMonitor();
  const { executeStartupCommands } = useStartupCommands();

  const [model, setModel] = useState<Model | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // Ref to handle navigation actions after a workspace switch
  const pendingNavigation = useRef<{ terminalId?: string; command?: string } | null>(null);
  
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const lastWorkspaceId = useRef<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
    fetchConfig();
    fetchAvailableShells();
  }, [fetchWorkspaces, fetchConfig, fetchAvailableShells]);

  const findFirstTabset = useCallback((currentModel: Model): string | null => {
    let targetTabset: string | null = null;
    currentModel.visitNodes((node) => {
        if (!targetTabset && node.getType() === 'tabset') {
            targetTabset = node.getId();
        }
    });
    return targetTabset;
  }, []);

  const addTerminalToTabset = useCallback((tabsetNodeId: string) => {
    if (model) {
      model.doAction(
        Actions.addNode(
          { type: "tab", component: "terminal", name: "Terminal", config: { id: uuidv4() } },
          tabsetNodeId,
          DockLocation.CENTER,
          -1
        )
      );
      saveLayout();
    }
  }, [model]);

  const saveLayout = useCallback(() => {
    if (model) {
      updateActiveWorkspaceLayout(JSON.stringify(model.toJson()));
    }
  }, [model, updateActiveWorkspaceLayout]);

  // Keyboard Shortcuts (Global)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;

        // Helper to check if we should handle this shortcut
        const isAppShortcut = (
            (isCtrl && ['p', 'n', 'b', 't', 'w', ',', '\\', '|'].includes(e.key)) ||
            (isCtrl && e.key === 'Tab') ||
            (isCtrl && isAlt && e.key.toLowerCase() === 't')
        );

        if (!isAppShortcut) return;

        // Skip if typing in an input (unless it's the command palette shortcut)
        // We only block shortcuts if they would interfere with text entry (like Ctrl+N in a textarea)
        const target = e.target as HTMLElement;
        const isRealInput = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) && 
                           !target.classList.contains('xterm-helper-textarea');
        
        if (isRealInput && e.key !== 'p') return;

        // If we reach here, it's an app shortcut we want to handle
        e.preventDefault();
        e.stopPropagation();

        // General
        if (isCtrl && e.key === 'p') {
            setIsPaletteOpen(prev => !prev);
        } else if (isCtrl && e.key === 'n') {
            if ((window as any).handleCreateWorkspace) (window as any).handleCreateWorkspace();
        } else if (isCtrl && e.key === 'b') {
            setSidebarCollapsed(!isSidebarCollapsed);
        }

        // Terminal & Tabs
        if (model) {
            if (isCtrl && e.key === 't') {
                const targetTabset = findFirstTabset(model);
                if (targetTabset) addTerminalToTabset(targetTabset);
            } else if (isCtrl && e.key === 'w') {
                const activeTab = model.getActiveTabset()?.getSelectedNode();
                if (activeTab) {
                    model.doAction(Actions.deleteTab(activeTab.getId()));
                    saveLayout();
                }
            } else if (isCtrl && e.key === 'Tab') {
                const tabset = model.getActiveTabset();
                if (tabset) {
                    const children = tabset.getChildren();
                    const selected = tabset.getSelected();
                    const nextIndex = isShift 
                        ? (selected - 1 + children.length) % children.length 
                        : (selected + 1) % children.length;
                    model.doAction(Actions.selectTab(children[nextIndex].getId()));
                }
            } else if (isCtrl && (e.key === '\\' || e.key === '|')) {
                const activeTabset = model.getActiveTabset();
                if (activeTabset) {
                    model.doAction(Actions.addNode(
                        { type: "tab", component: "terminal", name: "Terminal", config: { id: uuidv4() } },
                        activeTabset.getId(),
                        isShift ? DockLocation.RIGHT : DockLocation.BOTTOM,
                        -1
                    ));
                    saveLayout();
                }
            }
        }

        // Settings
        if (isCtrl && e.key === ',') {
            setShowShellModal(true);
        } else if (isCtrl && isAlt && e.key.toLowerCase() === 't') {
            const themes: any[] = ['normal', 'joy', 'pro'];
            const currentIndex = themes.indexOf(theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            setTheme(nextTheme);
        }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase!
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [model, isSidebarCollapsed, theme, findFirstTabset, addTerminalToTabset, saveLayout, setSidebarCollapsed, setShowShellModal, setTheme]);

  // Handle Workspace Switching & Layout Loading
  useEffect(() => {
    if (activeWorkspace) {
      if (activeWorkspaceId !== lastWorkspaceId.current || !model) {
        try {
          const json = JSON.parse(activeWorkspace.layout);
          const newModel = Model.fromJson(json);
          setModel(newModel);
          lastWorkspaceId.current = activeWorkspaceId;

          // Trigger Startup Commands
          if (activeWorkspaceId) {
            executeStartupCommands(activeWorkspace, newModel);
          }
        } catch (e) {
          console.error("Failed to parse layout JSON", e);
        }
      }
    } else {
      setModel(null);
      lastWorkspaceId.current = null;
    }
  }, [activeWorkspaceId, activeWorkspace, model, executeStartupCommands]);

  const runCommandInNewTerminal = useCallback((currentModel: Model, command: string) => {
    const targetTabset = findFirstTabset(currentModel);
    if (targetTabset) {
        const newId = uuidv4();
        currentModel.doAction(Actions.addNode({
            type: "tab",
            name: "Running...",
            component: "terminal",
            config: { id: newId }
        }, targetTabset, DockLocation.CENTER, -1));

        // Wait longer for backend PTY and terminal mounting
        setTimeout(() => {
            WriteTerminal(newId, command + '\r');
        }, 1000);
    }
  }, [findFirstTabset]);

  // Process Pending Navigations (after model is loaded/ready)
  useEffect(() => {
    if (model && pendingNavigation.current && activeWorkspaceId === lastWorkspaceId.current) {
        const { terminalId, command } = pendingNavigation.current;
        pendingNavigation.current = null;

        if (terminalId) {
            model.doAction(Actions.selectTab(terminalId));
        } else if (command) {
            runCommandInNewTerminal(model, command);
        }
    }
  }, [model, activeWorkspaceId, runCommandInNewTerminal]);

  const onModelChange = useCallback(() => {
    saveLayout();
  }, [saveLayout]);

  const onAction = useCallback((action: Action) => {
    if (action.type === Actions.SELECT_TAB) {
      const nodeId = action.data.tabNode;
      const node = model?.getNodeById(nodeId) as TabNode;
      if (node && node.getComponent() === 'terminal') {
        const config = node.getConfig();
        if (config?.id) {
            setActiveTerminal(config.id);
        }
      }
    }
    if (action.type === Actions.DELETE_TAB) {
      const nodeId = (action.data as any).node;
      const node = model?.getNodeById(nodeId) as TabNode;
      const config = node?.getConfig();
      if (config?.id) {
        CloseTerminal(config.id);
      }
    }
    return action;
  }, [model]);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const config = node.getConfig();
    
    if (component === "terminal") {
      return (
        <Terminal 
            id={config.id} 
            cwd={activeWorkspace?.path} 
            onStatsChange={(stats) => handleStatsChange(config.id, stats)}
            onRunningChange={(isRunning) => handleRunningChange(config.id, isRunning)}
            onTitleChange={(title) => {
                const cleanTitle = cleanTerminalTitle(title);
                if (cleanTitle) {
                    model?.doAction(Actions.renameTab(node.getId(), cleanTitle));
                    saveLayout();
                }
            }}
        />
      );
    }
    return <div>Unknown component</div>;
  };

  const onRenderTabSet = useCallback((node: TabSetNode | BorderNode, renderValues: ITabSetRenderValues) => {
    if (node instanceof TabSetNode) {
      renderValues.buttons.push(
        <button
          key="add-terminal"
          className="flexlayout__tabset_button"
          style={{
            border: 'none', background: 'transparent', color: 'var(--accent)',
            cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center'
          }}
          onClick={() => addTerminalToTabset(node.getId())}
          title="Add Terminal"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      );
    }
  }, [addTerminalToTabset]);

  const onRenderTab = useCallback((node: TabNode, renderValues: any) => {
    const config = node.getConfig();
    if (config && config.id) {
        renderValues.content = (
            <TabLabel 
                name={renderValues.content}
                isRunning={runningTerminals.has(config.id)}
                stats={terminalStats[config.id]}
                onClose={() => {
                  if (model) {
                    model.doAction(Actions.deleteTab(node.getId()));
                    saveLayout();
                  }
                }}
            />
        );
    }
  }, [runningTerminals, terminalStats, model, saveLayout]);

  const onContextMenu = useCallback((node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
    if (node instanceof TabNode) {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, node });
    }
  }, []);

  const handleRename = async () => {
    if (contextMenu && model) {
      const currentName = contextMenu.node.getName();
      const newName = await modalPrompt("Rename Tab", "Enter new name for the terminal tab:", currentName);
      if (newName) {
        model.doAction(Actions.renameTab(contextMenu.node.getId(), newName));
        saveLayout();
      }
    }
  };

  const handleDelete = async () => {
    if (contextMenu && model) {
      const confirmed = await modalConfirm("Delete Tab", `Are you sure you want to close "${contextMenu.node.getName()}"?`);
      if (confirmed) {
        model.doAction(Actions.deleteTab(contextMenu.node.getId()));
        saveLayout();
      }
    }
  };

  const handlePaletteSelect = (result: SearchResult) => {
    if (result.type === 'workspace') {
        setActiveWorkspace(result.id);
    } else if (result.type === 'terminal') {
        if (result.workspaceId === activeWorkspaceId) {
            if (model && result.terminalId) model.doAction(Actions.selectTab(result.terminalId));
        } else {
            pendingNavigation.current = { terminalId: result.terminalId };
            setActiveWorkspace(result.workspaceId);
        }
    } else if (result.type === 'command') {
        if (result.workspaceId === activeWorkspaceId) {
            if (model && result.command) runCommandInNewTerminal(model, result.command);
        } else {
            pendingNavigation.current = { command: result.command };
            setActiveWorkspace(result.workspaceId);
        }
    }
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div data-theme={theme} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <Sidebar onSearchClick={() => setIsPaletteOpen(true)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {activeWorkspace && model ? (
          <>
            <div style={{ flex: 1, position: 'relative', padding: (theme === 'joy') ? '12px' : '0' }}>
              <Layout 
                model={model} 
                factory={factory} 
                onModelChange={onModelChange}
                onAction={onAction}
                onRenderTabSet={onRenderTabSet}
                onRenderTab={onRenderTab}
                onContextMenu={onContextMenu}
              />
            </div>
            <CommandBar />
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="fade-in" style={{ textAlign: 'center', opacity: 0.5 }}>
               <h1 style={{ fontSize: '3rem', margin: 0 }}>Termspace</h1>
               <p>Select a workspace to start your journey!</p>
            </div>
          </div>
        )}
        <StatusBar />
      </div>

      {contextMenu && (
        <TerminalContextMenu 
            x={contextMenu.x}
            y={contextMenu.y}
            onRename={handleRename}
            onDelete={handleDelete}
            onClose={() => setContextMenu(null)}
        />
      )}

      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={handlePaletteSelect}
      />

      <GlobalModal />
    </div>
  );
}

export default App;
