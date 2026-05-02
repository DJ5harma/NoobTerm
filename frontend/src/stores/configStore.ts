import { create } from 'zustand';
import { terminal } from '../../wailsjs/go/models';
import { GetConfig, SaveConfig, GetAvailableShells } from '../../wailsjs/go/main/App';

export type Config = terminal.Config;
export type ShellInfo = terminal.ShellInfo;

interface ConfigState {
  config: Config | null;
  availableShells: ShellInfo[];
  fetchConfig: () => Promise<void>;
  fetchAvailableShells: () => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  availableShells: [],

  fetchConfig: async () => {
    try {
      const config = await GetConfig();
      set({ config });
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  },

  fetchAvailableShells: async () => {
    try {
      const shells = await GetAvailableShells();
      set({ availableShells: shells });
    } catch (err) {
      console.error('Failed to fetch shells:', err);
    }
  },

  saveConfig: async (config) => {
    try {
      await SaveConfig(config as any);
      set({ config });
    } catch (err) {
      console.error('Failed to save config:', err);
      throw err;
    }
  },
}));
