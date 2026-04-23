import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { disconnectEcho } from "@/api/echo";

const LOGOUT_SYNC_KEY = "tlm-auth-logout-signal";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      requiresTwoFactor: false,
      pendingUserId: null,
      /** Sanctum personal access token (abilities: 2fa-pending) until OTP succeeds */
      twoFactorToken: null,

      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          requiresTwoFactor: false,
          pendingUserId: null,
          twoFactorToken: null,
        }),

      setUser: (user) => set({ user }),

      setTwoFactorPending: (userId, token) =>
        set({
          requiresTwoFactor: true,
          pendingUserId: userId,
          twoFactorToken: token ?? null,
        }),

      logout: (options = {}) => {
        const { broadcast = true } = options;
        disconnectEcho();
        set({
          user: null,
          isAuthenticated: false,
          requiresTwoFactor: false,
          pendingUserId: null,
          twoFactorToken: null,
        });
        if (broadcast) {
          localStorage.setItem(LOGOUT_SYNC_KEY, String(Date.now()));
        }
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
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const authStoreKeys = {
  LOGOUT_SYNC_KEY,
};
