import { create } from 'zustand';

export type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  defaultValue: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;

  alert: (title: string, message: string) => Promise<void>;
  confirm: (title: string, message: string, options?: { confirmLabel?: string, cancelLabel?: string }) => Promise<boolean>;
  prompt: (title: string, message: string, defaultValue?: string, options?: { confirmLabel?: string, cancelLabel?: string }) => Promise<string | null>;
  close: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
  defaultValue: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},

  alert: (title, message) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmLabel: 'OK',
        onConfirm: () => {
          set({ isOpen: false });
          resolve();
        }
      });
    });
  },

  confirm: (title, message, options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmLabel: options?.confirmLabel || 'Confirm',
        cancelLabel: options?.cancelLabel || 'Cancel',
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        }
      });
    });
  },

  prompt: (title, message, defaultValue = '', options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        confirmLabel: options?.confirmLabel || 'OK',
        cancelLabel: options?.cancelLabel || 'Cancel',
        onConfirm: (value) => {
          set({ isOpen: false });
          resolve(value);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(null);
        }
      });
    });
  },

  close: () => set({ isOpen: false })
}));
