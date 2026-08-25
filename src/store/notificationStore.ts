import { create } from 'zustand';
import type { AppNotification } from '@models/notification';
import { mockNotifications } from '@data/mock/notifications';

interface NotificationStore {
  notifications: AppNotification[];
  isLoading: boolean;

  loadNotifications: () => Promise<void>;
  getUnreadCount: () => number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: AppNotification) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  isLoading: false,

  loadNotifications: async () => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 200));
    set({ notifications: mockNotifications, isLoading: false });
  },

  getUnreadCount: () => get().notifications.filter(n => !n.read).length,

  markAsRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),

  markAllAsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),

  addNotification: (n) => set(state => ({
    notifications: [n, ...state.notifications],
  })),
}));
