import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  showShellModal: boolean;
  showThemeModal: boolean;
  showShortcutsModal: boolean;
  showDashboard: boolean;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowShellModal: (show: boolean) => void;
  setShowThemeModal: (show: boolean) => void;
  setShowShortcutsModal: (show: boolean) => void;
  setShowDashboard: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  showShellModal: false,
  showThemeModal: false,
  showShortcutsModal: false,
  showDashboard: false,

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setShowShellModal: (show) => set({ showShellModal: show }),
  setShowThemeModal: (show) => set({ showThemeModal: show }),
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  setShowDashboard: (show) => set({ showDashboard: show }),
}));
