import { create } from 'zustand';
import { workspace } from '../wailsjs/go/models';
import { SaveWorkspace, ListWorkspaces, CreateWorkspace, DeleteWorkspace } from '../wailsjs/go/main/App';

type Workspace = workspace.Workspace;

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  
  createWorkspace: (name: string, path: string) => Promise<void>;
  saveWorkspace: (ws: Workspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  updateActiveWorkspaceLayout: (layoutJson: string) => void;
}

const DEFAULT_LAYOUT = JSON.stringify({
  global: { tabEnableClose: true },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 100,
        children: [
          {
            type: "tab",
            name: "Terminal",
            component: "terminal",
            config: { id: "initial-terminal" }
          }
        ]
      }
    ]
  }
});

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  fetchWorkspaces: async () => {
    try {
      const result = await ListWorkspaces();
      const safeWorkspaces = (Array.isArray(result) ? result : []) as Workspace[];
      
      const fixedWorkspaces = safeWorkspaces.map(ws => ({
        ...ws,
        layout: ws.layout || DEFAULT_LAYOUT
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

  createWorkspace: async (name, path) => {
    const ws = await CreateWorkspace(name, path);
    const newWs = { ...ws, layout: DEFAULT_LAYOUT } as Workspace;
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
  }
}));
