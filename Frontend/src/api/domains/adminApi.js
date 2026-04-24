import apiClient from "@/api/client";

export const adminApi = {
  dashboard: () => apiClient.get("/admin/dashboard"),
  listUsers: (params) => apiClient.get("/admin/users", { params }),
  showUser: (id) => apiClient.get(`/admin/users/${id}`),
  createUser: (data) => apiClient.post("/admin/users", data),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  updateUserStatus: (id, data) =>
    apiClient.patch(`/admin/users/${id}/status`, data),
  verifyDoctor: (id) => apiClient.post(`/admin/users/${id}/verify`),
  createAnnouncement: (data) => apiClient.post("/admin/announcements", data),
  announcements: (params) => apiClient.get("/admin/announcements", { params }),
  getAnnouncement: (id) => apiClient.get(`/admin/announcements/${id}`),
  updateAnnouncement: (id, data) =>
    apiClient.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => apiClient.delete(`/admin/announcements/${id}`),
  publicAnnouncements: () => apiClient.get("/announcements"),
  listStructures: (params) => apiClient.get("/admin/structures", { params }),
  createStructure: (data) => apiClient.post("/admin/structures", data),
  getStructure: (id) => apiClient.get(`/admin/structures/${id}`),
  updateStructure: (id, data) => apiClient.put(`/admin/structures/${id}`, data),
  deleteStructure: (id) => apiClient.delete(`/admin/structures/${id}`),
  listServices: (structureId) =>
    apiClient.get(`/admin/structures/${structureId}/services`),
  createService: (structureId, data) =>
    apiClient.post(`/admin/structures/${structureId}/services`, data),
  updateService: (structureId, serviceId, data) =>
    apiClient.put(
      `/admin/structures/${structureId}/services/${serviceId}`,
      data,
    ),
  deleteService: (structureId, serviceId) =>
    apiClient.delete(`/admin/structures/${structureId}/services/${serviceId}`),
  listTypeStructures: (params) =>
    apiClient.get("/admin/type-structures", { params }),
  createTypeStructure: (data) => apiClient.post("/admin/type-structures", data),
  updateTypeStructure: (id, data) =>
    apiClient.put(`/admin/type-structures/${id}`, data),
  deleteTypeStructure: (id) => apiClient.delete(`/admin/type-structures/${id}`),
  listGestionnaires: (params) =>
    apiClient.get("/admin/gestionnaires", { params }),
  createGestionnaire: (data) => apiClient.post("/admin/gestionnaires", data),
  listRoles: () => apiClient.get("/admin/roles"),
  getRole: (id) => apiClient.get(`/admin/roles/${id}`),
  createRole: (data) => apiClient.post("/admin/roles", data),
  updateRole: (id, data) => apiClient.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/admin/roles/${id}`),
  listPermissions: () => apiClient.get("/admin/permissions"),
  rolesMatrix: () => apiClient.get("/admin/roles-matrix"),
  getUserRoles: (userId) => apiClient.get(`/admin/users/${userId}/roles`),
  assignUserRoles: (userId, data) =>
    apiClient.post(`/admin/users/${userId}/roles`, data),
  getSettings: () => apiClient.get("/admin/settings"),
  updateSetting: (key, value) =>
    apiClient.put(`/admin/settings/${key}`, { value }),
  updateSettings: (settings) => apiClient.put("/admin/settings", { settings }),
  visioMetrics: (period = "24h") =>
    apiClient.get("/admin/monitoring/visio-metrics", { params: { period } }),
};

