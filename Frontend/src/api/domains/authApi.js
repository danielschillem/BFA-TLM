import apiClient, { fetchCsrfCookie } from "@/api/client";

export const authApi = {
  register: async (data) => {
    await fetchCsrfCookie();
    return apiClient.post("/auth/register", data);
  },
  login: async (data) => {
    await fetchCsrfCookie();
    return apiClient.post("/auth/login", data);
  },
  verifyTwoFactor: (data) => apiClient.post("/auth/two-factor/verify", data),
  resendTwoFactor: () => apiClient.post("/auth/two-factor/resend", {}),
  logout: () => apiClient.post("/auth/logout", {}),
  sessions: () => apiClient.get("/auth/sessions"),
  revokeSession: (sessionId) => apiClient.delete(`/auth/sessions/${sessionId}`),
  revokeOtherSessions: () => apiClient.delete("/auth/sessions/others"),
  me: () => apiClient.get("/auth/me"),
  updateProfile: (data) => apiClient.put("/auth/profile", data),
  changePassword: (data) => apiClient.put("/auth/password", data),
  forgotPassword: (data) => apiClient.post("/auth/password/forgot", data),
  resetPassword: (data) => apiClient.post("/auth/password/reset", data),
};

