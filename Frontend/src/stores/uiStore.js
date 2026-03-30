import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen:    true,
  activePage:     '',
  notifications:  [],
  unreadCount:    0,
  wsConnected:    false,

  toggleSidebar:  ()              => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActivePage:  (page)          => set({ activePage: page }),
  setUnreadCount: (count)         => set({ unreadCount: count }),
  setWsConnected: (connected)     => set({ wsConnected: connected }),
  addNotification:(n)             => set((s) => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  markNotificationRead: (id)      => set((s) => ({
    notifications: s.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  clearNotifications: ()          => set({ notifications: [], unreadCount: 0 }),
}))
