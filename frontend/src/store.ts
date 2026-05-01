import { create } from 'zustand';
import { main } from '../wailsjs/go/models';
import { v4 as uuidv4 } from 'uuid';
import { SaveWorkspace, ListWorkspaces, CreateWorkspace, DeleteWorkspace } from '../wailsjs/go/main/App';

type Workspace = main.Workspace;
type Tab = main.Tab;
type Pane = main.Pane;
type LayoutNode = main.LayoutNode;
type Command = main.Command;

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeTabId: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  setActiveTab: (id: string | null) => void;
  
  createWorkspace: (name: string, path: string) => Promise<void>;
  saveActiveWorkspace: () => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  addTab: (workspaceId: string, name: string) => void;
  removeTab: (workspaceId: string, tabId: string) => void;
  
  addPane: (tabId: string, direction: 'horizontal' | 'vertical', splitPaneId: string) => void;
  removePane: (tabId: string, paneId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeTabId: null,

  fetchWorkspaces: async () => {
    try {
      console.log('Fetching workspaces...');
      const result = await ListWorkspaces();
      console.log('Workspaces result:', result);
      const safeWorkspaces = Array.isArray(result) ? result : [];
      set({ workspaces: safeWorkspaces });
      
      if (safeWorkspaces.length > 0 && !get().activeWorkspaceId) {
        const firstWs = safeWorkspaces[0];
        set({ 
          activeWorkspaceId: firstWs.id,
          activeTabId: (firstWs.tabs && firstWs.tabs.length > 0) ? firstWs.tabs[0].id : null
        });
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      set({ workspaces: [] });
    }
  },

  setActiveWorkspace: (id) => {
    const safeWorkspaces = get().workspaces || [];
    const ws = safeWorkspaces.find(w => w.id === id);
    set({ 
      activeWorkspaceId: id,
      activeTabId: (ws && ws.tabs && ws.tabs.length > 0) ? ws.tabs[0].id : null
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  createWorkspace: async (name, path) => {
    const ws = await CreateWorkspace(name, path);
    set(state => ({ 
      workspaces: [...(state.workspaces || []), ws],
      activeWorkspaceId: ws.id,
      activeTabId: null
    }));
  },

  saveActiveWorkspace: async () => {
    const { workspaces, activeWorkspaceId } = get();
    const ws = (workspaces || []).find(w => w.id === activeWorkspaceId);
    if (ws) {
      await SaveWorkspace(ws);
    }
  },

  deleteWorkspace: async (id) => {
    await DeleteWorkspace(id);
    set(state => {
      const workspaces = (state.workspaces || []).filter(w => w.id !== id);
      const activeWorkspaceId = state.activeWorkspaceId === id ? (workspaces.length > 0 ? workspaces[0].id : null) : state.activeWorkspaceId;
      return { workspaces, activeWorkspaceId };
    });
  },

  addTab: (workspaceId, name) => {
    const tabId = uuidv4();
    const paneId = uuidv4();
    const newTab = {
      id: tabId,
      name,
      panes: [{
        id: paneId,
        cwd: '',
        layout: { type: 'pane', paneId: paneId }
      }],
      rootLayout: { type: 'pane', paneId: paneId }
    } as any;

    set(state => ({
      workspaces: state.workspaces.map(ws => 
        ws.id === workspaceId 
          ? { ...ws, tabs: [...ws.tabs, newTab] } 
          : ws
      ) as any,
      activeTabId: state.activeWorkspaceId === workspaceId ? tabId : state.activeTabId
    }));
    get().saveActiveWorkspace();
  },

  removeTab: (workspaceId, tabId) => {
    set(state => {
      const ws = state.workspaces.find(w => w.id === workspaceId);
      if (!ws) return state;
      const tabs = ws.tabs.filter(t => t.id !== tabId);
      const activeTabId = state.activeTabId === tabId ? (tabs.length > 0 ? tabs[0].id : null) : state.activeTabId;
      return {
        workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, tabs } : w) as any,
        activeTabId
      };
    });
    get().saveActiveWorkspace();
  },

  addPane: (tabId, direction, splitPaneId) => {
    const newPaneId = uuidv4();
    set(state => {
      const activeWs = state.workspaces.find(w => w.id === state.activeWorkspaceId);
      if (!activeWs) return state;

      const tabs = activeWs.tabs.map(tab => {
        if (tab.id !== tabId) return tab;

        const findAndSplit = (node: LayoutNode): LayoutNode => {
          if (node.type === 'pane' && node.paneId === splitPaneId) {
            return {
              type: 'split',
              direction,
              children: [
                { type: 'pane', paneId: splitPaneId },
                { type: 'pane', paneId: newPaneId }
              ]
            } as any;
          }
          if (node.type === 'split' && node.children) {
            return {
              ...node,
              children: node.children.map(findAndSplit)
            } as any;
          }
          return node;
        };

        const newRootLayout = findAndSplit(tab.rootLayout);
        const newPanes = [...tab.panes, { id: newPaneId, cwd: activeWs.path, layout: { type: 'pane', paneId: newPaneId } }];
        
        return { ...tab, panes: newPanes, rootLayout: newRootLayout } as any;
      });

      return {
        workspaces: state.workspaces.map(w => w.id === state.activeWorkspaceId ? { ...w, tabs } : w) as any
      };
    });
    get().saveActiveWorkspace();
  },

  removePane: (tabId, paneId) => {
    // TODO: Implement complex layout removal
    get().saveActiveWorkspace();
  }
}));
