import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { disconnectEcho } from "@/api/echo";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      requiresTwoFactor: false,
      pendingUserId: null,

      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          requiresTwoFactor: false,
          pendingUserId: null,
        }),

      setUser: (user) => set({ user }),

      setTwoFactorPending: (userId) =>
        set({
          requiresTwoFactor: true,
          pendingUserId: userId,
        }),

      logout: () => {
        disconnectEcho();
        set({
          user: null,
          isAuthenticated: false,
          requiresTwoFactor: false,
          pendingUserId: null,
        });
      },

      // Helpers rôles & permissions
      hasRole: (role) => get().user?.roles?.includes(role) ?? false,
      hasRoles: (roles) => roles.some((r) => get().user?.roles?.includes(r)),
      hasPermission: (perm) => get().user?.permissions?.includes(perm) ?? false,
      isAdmin: () => get().user?.roles?.includes("admin") ?? false,
      isDoctor: () =>
        get().user?.roles?.some((r) => ["doctor", "specialist"].includes(r)) ??
        false,
      isPatient: () => get().user?.roles?.includes("patient") ?? false,
      isPS: () => get().user?.roles?.includes("health_professional") ?? false,
    }),
    {
      name: "tlm-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
