import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'joy' | 'lightfun' | 'pro' | 'normal';

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'normal',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'termspace-theme-v2',
    }
  )
);
