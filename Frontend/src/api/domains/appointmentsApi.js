import apiClient from "@/api/client";

export const appointmentsApi = {
  list: (params) => apiClient.get("/appointments", { params }),
  create: (data) => apiClient.post("/appointments", data),
  get: (id) => apiClient.get(`/appointments/${id}`),
  confirm: (id) => apiClient.post(`/appointments/${id}/confirm`, {}),
  cancel: (id, data) => apiClient.post(`/appointments/${id}/cancel`, data),
  reject: (id, data) => apiClient.post(`/appointments/${id}/reject`, data),
  reschedule: (id, data) => apiClient.post(`/appointments/${id}/reschedule`, data),
  delegate: (id, data) => apiClient.post(`/appointments/${id}/delegate`, data),
  recordConsent: (id, data) => apiClient.post(`/appointments/${id}/consent`, data),
  downloadPdf: (id) =>
    apiClient.get(`/appointments/${id}/pdf`, { responseType: "blob" }),
  availableSlots: (params) =>
    apiClient.get("/directory/appointments/slots", { params }),
};

