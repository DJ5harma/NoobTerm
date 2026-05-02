import { create } from 'zustand';
import { models } from '../../wailsjs/go/models';
import { GetOpenPorts, GetSystemStats } from '../../wailsjs/go/main/App';

export type PortInfo = models.PortInfo;
export type SystemStats = models.SystemStats;

interface SystemState {
  openPorts: PortInfo[];
  systemStats: SystemStats | null;
  fetchSystemStats: () => Promise<void>;
  fetchOpenPorts: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  openPorts: [],
  systemStats: null,

  fetchSystemStats: async () => {
    try {
      const stats = await GetSystemStats();
      set({ systemStats: stats });
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  },

  fetchOpenPorts: async () => {
    try {
      const ports = await GetOpenPorts();
      set({ openPorts: ports || [] });
    } catch (err) {
      console.error('Failed to fetch open ports:', err);
    }
  },
}));
