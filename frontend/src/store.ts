import { create } from 'zustand';
import { workspace } from '../wailsjs/go/models';
import { SaveWorkspace, ListWorkspaces, CreateWorkspace, DeleteWorkspace } from '../wailsjs/go/main/App';
import { useModalStore } from './modalStore';
import { v4 as uuidv4 } from 'uuid';

export type Workspace = workspace.Workspace;
export type Command = workspace.Command;

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeTerminalId: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  setActiveTerminal: (id: string | null) => void;
  
  createWorkspace: (name: string, path: string) => Promise<void>;
  saveWorkspace: (ws: Workspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  updateActiveWorkspaceLayout: (layoutJson: string) => void;
  addCommandToActiveWorkspace: (name: string, cmdStr: string, isGlobal: boolean, isStartup: boolean) => Promise<void>;
  updateWorkspacePath: (id: string, newPath: string) => Promise<void>;
  toggleCommandGlobal: (commandId: string) => Promise<void>;
  toggleCommandStartup: (commandId: string) => Promise<void>;
  importCommands: (sourceWorkspaceId: string, commandIds: string[]) => Promise<void>;
  removeCommand: (commandId: string) => Promise<void>;
  updateCommand: (id: string, name: string, cmdStr: string, isGlobal: boolean, isStartup: boolean) => Promise<void>;
  
  navigateAndRunCommand: (workspaceId: string, commandStr: string) => Promise<void>;
}

const getNewDefaultLayout = () => JSON.stringify({
  global: { tabEnableClose: true },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "row",
        weight: 40,
        children: [
          {
            type: "tabset",
            weight: 50,
            children: [
              {
                type: "tab",
                name: "Primary",
                component: "terminal",
                config: { id: uuidv4() }
              }
            ]
          },
          {
            type: "tabset",
            weight: 50,
            children: [
              {
                type: "tab",
                name: "Secondary",
                component: "terminal",
                config: { id: uuidv4() }
              }
            ]
          }
        ]
      },
      {
        type: "tabset",
        weight: 60,
        children: [
          {
            type: "tab",
            name: "Main",
            component: "terminal",
            config: { id: uuidv4() }
          }
        ]
      }
    ]
  }
});

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeTerminalId: null,

  fetchWorkspaces: async () => {
    try {
      const result = await ListWorkspaces();
      const safeWorkspaces = (Array.isArray(result) ? result : []) as Workspace[];
      
      const fixedWorkspaces = safeWorkspaces.map(ws => ({
        ...ws,
        layout: ws.layout || getNewDefaultLayout(),
        commands: ws.commands || []
      })) as Workspace[];

      set({ workspaces: fixedWorkspaces });
      
      if (fixedWorkspaces.length > 0 && !get().activeWorkspaceId) {
        set({ activeWorkspaceId: fixedWorkspaces[0].id });
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      set({ workspaces: [] });
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  createWorkspace: async (name, path) => {
    const ws = await CreateWorkspace(name, path);
    const newWs = { 
      ...ws, 
      layout: getNewDefaultLayout(),
      commands: ws.commands || []
    } as Workspace;
    set(state => ({ 
      workspaces: [...(state.workspaces || []), newWs],
      activeWorkspaceId: newWs.id
    }));
    await SaveWorkspace(newWs as any);
  },

  saveWorkspace: async (ws) => {
    await SaveWorkspace(ws as any);
  },

  deleteWorkspace: async (id) => {
    await DeleteWorkspace(id);
    set(state => {
      const workspaces = (state.workspaces || []).filter(w => w.id !== id);
      const activeWorkspaceId = state.activeWorkspaceId === id ? (workspaces.length > 0 ? workspaces[0].id : null) : state.activeWorkspaceId;
      return { workspaces, activeWorkspaceId };
    });
  },

  updateActiveWorkspaceLayout: (layoutJson) => {
    const { workspaces, activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    const updatedWorkspaces = workspaces.map(ws => 
      ws.id === activeWorkspaceId ? { ...ws, layout: layoutJson } : ws
    ) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const activeWs = updatedWorkspaces.find(w => w.id === activeWorkspaceId);
    if (activeWs) {
      SaveWorkspace(activeWs as any);
    }
  },

  addCommandToActiveWorkspace: async (name, cmdStr, isGlobal, isStartup) => {
    const { activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    // Use a simple, reliable ID generation
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);

    const newCommand = {
      id,
      name,
      command: cmdStr,
      isGlobal,
      isStartup,
      variables: []
    };

    set(state => {
      const updatedWorkspaces = state.workspaces.map(ws => {
        if (ws.id === activeWorkspaceId) {
          const currentCommands = Array.isArray(ws.commands) ? ws.commands : [];
          return {
            ...ws,
            commands: [...currentCommands, newCommand]
          };
        }
        return ws;
      });
      return { workspaces: updatedWorkspaces as Workspace[] };
    });
    
    // Get the updated workspace to save
    const updatedState = get();
    const activeWs = updatedState.workspaces.find(w => w.id === activeWorkspaceId);
    
    if (activeWs) {
      try {
        await SaveWorkspace(activeWs as any);
      } catch (err) {
        console.error("Failed to save workspace after adding command:", err);
        useModalStore.getState().alert("Persistence Error", "Saved to UI, but failed to persist to disk: " + err);
      }
    }
  },

  updateCommand: async (id, name, cmdStr, isGlobal, isStartup) => {
    const { workspaces, activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    const updatedWorkspaces = workspaces.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return {
          ...ws,
          commands: (ws.commands || []).map(cmd => 
            cmd.id === id ? { ...cmd, name, command: cmdStr, isGlobal, isStartup } : cmd
          )
        };
      }
      return ws;
    }) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const activeWs = updatedWorkspaces.find(w => w.id === activeWorkspaceId);
    if (activeWs) {
        await SaveWorkspace(activeWs as any);
    }
  },

  toggleCommandStartup: async (commandId) => {
    const { workspaces, activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    const updatedWorkspaces = workspaces.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return {
          ...ws,
          commands: (ws.commands || []).map(cmd => 
            cmd.id === commandId ? { ...cmd, isStartup: !cmd.isStartup } : cmd
          )
        };
      }
      return ws;
    }) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const activeWs = updatedWorkspaces.find(w => w.id === activeWorkspaceId);
    if (activeWs) {
        await SaveWorkspace(activeWs as any);
    }
  },

  updateWorkspacePath: async (id, newPath) => {
    const { workspaces } = get();
    const updatedWorkspaces = workspaces.map(ws => 
      ws.id === id ? { ...ws, path: newPath } : ws
    ) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const updatedWs = updatedWorkspaces.find(w => w.id === id);
    if (updatedWs) {
      await SaveWorkspace(updatedWs as any);
    }
  },

  toggleCommandGlobal: async (commandId) => {
    const { workspaces } = get();
    const updatedWorkspaces = workspaces.map(ws => ({
      ...ws,
      commands: (ws.commands || []).map(cmd => 
        cmd.id === commandId ? { ...cmd, isGlobal: !cmd.isGlobal } : cmd
      )
    })) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    // Save all workspaces to persist global flag
    await Promise.all(updatedWorkspaces.map(ws => SaveWorkspace(ws as any)));
  },

  importCommands: async (sourceWorkspaceId, commandIds) => {
    const { workspaces, activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    const sourceWs = workspaces.find(w => w.id === sourceWorkspaceId);
    if (!sourceWs) return;

    const commandsToImport = (sourceWs.commands || [])
        .filter(cmd => commandIds.includes(cmd.id))
        .map(cmd => ({ 
            ...cmd, 
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            isGlobal: false // Imported commands start as local
        }));

    const updatedWorkspaces = workspaces.map(ws => {
        if (ws.id === activeWorkspaceId) {
            return {
                ...ws,
                commands: [...(ws.commands || []), ...commandsToImport]
            };
        }
        return ws;
    }) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const activeWs = updatedWorkspaces.find(w => w.id === activeWorkspaceId);
    if (activeWs) {
        await SaveWorkspace(activeWs as any);
    }
  },

  removeCommand: async (commandId) => {
    const { workspaces, activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;

    const updatedWorkspaces = workspaces.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return {
          ...ws,
          commands: (ws.commands || []).filter(cmd => cmd.id !== commandId)
        };
      }
      return ws;
    }) as Workspace[];

    set({ workspaces: updatedWorkspaces });
    
    const activeWs = updatedWorkspaces.find(w => w.id === activeWorkspaceId);
    if (activeWs) {
        await SaveWorkspace(activeWs as any);
    }
  },

  navigateAndRunCommand: async (workspaceId, commandStr) => {
    // This is a complex action that will be coordinated in App.tsx 
    // because it needs access to the active flexlayout model.
    // For now, we just switch the workspace.
    set({ activeWorkspaceId: workspaceId });
  }
}));
