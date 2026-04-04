/**
 * Adaptateur de mocks pour le développement frontend
 * Active/désactive les mocks via VITE_USE_MOCKS=true dans .env
 *
 * Usage: Importer mockClient au lieu de apiClient quand les mocks sont nécessaires
 */

import {
  mockUsers,
  mockAppointments,
  mockAvailableSlots,
  mockDoctors,
  mockSpecialties,
  mockConsultations,
  mockInbox,
  mockConversation,
  mockDocuments,
  mockPrescriptions,
  mockDoctorDashboard,
  mockAdminDashboard,
  createMockResponse,
  createMockPaginatedResponse,
  createMockError,
} from "./mockData";

const MOCK_DELAY = 300; // Simuler la latence réseau

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// État de session pour les mocks
let mockAuthState = {
  user: null,
  token: null,
};

/**
 * Handlers pour chaque endpoint
 */
const mockHandlers = {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  "POST /auth/login": async ({ email }) => {
    await delay(MOCK_DELAY);

    // Déterminer le rôle selon l'email
    let user;
    if (email.includes("admin")) {
      user = mockUsers.admin;
    } else if (email.includes("doctor") || email.includes("dr.")) {
      user = mockUsers.doctor;
    } else if (email.includes("specialist")) {
      user = mockUsers.specialist;
    } else {
      user = mockUsers.patient;
    }

    const token = `mock_token_${Date.now()}`;
    mockAuthState = { user, token };

    return createMockResponse(
      {
        user,
        token,
        requires_two_factor: false,
      },
      "Connexion réussie",
    );
  },

  "POST /auth/register": async (data) => {
    await delay(MOCK_DELAY);
    const user = {
      ...mockUsers.patient,
      id: Date.now(),
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      email: data.email,
      roles: [data.role || "patient"],
    };
    const token = `mock_token_${Date.now()}`;
    mockAuthState = { user, token };
    return createMockResponse({ user, token }, "Inscription réussie");
  },

  "POST /auth/logout": async () => {
    await delay(MOCK_DELAY);
    mockAuthState = { user: null, token: null };
    return createMockResponse(null, "Déconnexion réussie");
  },

  "GET /auth/me": async () => {
    await delay(MOCK_DELAY);
    if (!mockAuthState.user) {
      throw createMockError("Non authentifié", {}, 401);
    }
    return createMockResponse(mockAuthState.user);
  },

  // ── Annuaire ─────────────────────────────────────────────────────────────────
  "GET /directory/doctors": async (params) => {
    await delay(MOCK_DELAY);
    let filtered = [...mockDoctors];

    if (params?.specialty) {
      filtered = filtered.filter((d) =>
        d.specialty.toLowerCase().includes(params.specialty.toLowerCase()),
      );
    }
    if (params?.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.full_name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q),
      );
    }

    return createMockPaginatedResponse(
      filtered,
      params?.page || 1,
      params?.per_page || 15,
    );
  },

  "GET /directory/doctors/:id": async (_, id) => {
    await delay(MOCK_DELAY);
    const doctor = mockDoctors.find((d) => d.id === parseInt(id));
    if (!doctor) throw createMockError("Médecin non trouvé", {}, 404);
    return createMockResponse(doctor);
  },

  "GET /directory/specialties": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockSpecialties);
  },

  "GET /directory/appointments/slots": async (params) => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockAvailableSlots);
  },

  // ── Rendez-vous ──────────────────────────────────────────────────────────────
  "GET /appointments": async (params) => {
    await delay(MOCK_DELAY);
    let filtered = [...mockAppointments];

    if (params?.status) {
      filtered = filtered.filter((a) => a.status === params.status);
    }

    return createMockPaginatedResponse(
      filtered,
      params?.page || 1,
      params?.per_page || 15,
    );
  },

  "GET /appointments/:id": async (_, id) => {
    await delay(MOCK_DELAY);
    const appointment = mockAppointments.find((a) => a.id === parseInt(id));
    if (!appointment) throw createMockError("Rendez-vous non trouvé", {}, 404);
    return createMockResponse(appointment);
  },

  "POST /appointments": async (data) => {
    await delay(MOCK_DELAY);
    const newAppointment = {
      id: Date.now(),
      reference: `RDV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      ...data,
      status: "pending",
      patient: mockAuthState.user
        ? { id: mockAuthState.user.id, full_name: mockAuthState.user.full_name }
        : mockAppointments[0].patient,
      doctor:
        mockDoctors.find((d) => d.id === data.doctor_id) ||
        mockAppointments[0].doctor,
      can_start: false,
      can_cancel: true,
      can_confirm: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockAppointments.unshift(newAppointment);
    return createMockResponse(newAppointment, "Rendez-vous créé avec succès");
  },

  "POST /appointments/:id/confirm": async (_, id) => {
    await delay(MOCK_DELAY);
    const appointment = mockAppointments.find((a) => a.id === parseInt(id));
    if (!appointment) throw createMockError("Rendez-vous non trouvé", {}, 404);
    appointment.status = "confirmed";
    appointment.can_confirm = false;
    appointment.can_start = true;
    return createMockResponse(appointment, "Rendez-vous confirmé");
  },

  "POST /appointments/:id/cancel": async (data, id) => {
    await delay(MOCK_DELAY);
    const appointment = mockAppointments.find((a) => a.id === parseInt(id));
    if (!appointment) throw createMockError("Rendez-vous non trouvé", {}, 404);
    appointment.status = "cancelled";
    appointment.cancellation_reason = data.reason;
    appointment.can_cancel = false;
    appointment.can_start = false;
    return createMockResponse(appointment, "Rendez-vous annulé");
  },

  // ── Consultations ────────────────────────────────────────────────────────────
  "GET /consultations/dashboard": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockDoctorDashboard);
  },

  "POST /consultations/appointments/:appointmentId/start": async (
    _,
    appointmentId,
  ) => {
    await delay(MOCK_DELAY);
    const consultation = {
      id: Date.now(),
      appointment_id: parseInt(appointmentId),
      status: "in_progress",
      started_at: new Date().toISOString(),
      ended_at: null,
      video_room: {
        provider: "twilio",
        room_name: `consultation-${Date.now()}-mock`,
        token: "mock_video_token_xyz",
      },
      patient: mockAppointments[0].patient,
      doctor: mockAppointments[0].doctor,
    };
    return createMockResponse(consultation, "Consultation démarrée");
  },

  "POST /consultations/:id/end": async (data, id) => {
    await delay(MOCK_DELAY);
    return createMockResponse(
      {
        id: parseInt(id),
        status: "completed",
        started_at: mockConsultations[0].started_at,
        ended_at: new Date().toISOString(),
        duration_minutes: 25,
        summary: data?.summary || null,
      },
      "Consultation terminée",
    );
  },

  // ── Documents ────────────────────────────────────────────────────────────────
  "GET /documents": async (params) => {
    await delay(MOCK_DELAY);
    let filtered = [...mockDocuments];
    if (params?.type) {
      filtered = filtered.filter((d) => d.type === params.type);
    }
    return createMockPaginatedResponse(filtered);
  },

  // ── Prescriptions ────────────────────────────────────────────────────────────
  "GET /prescriptions": async () => {
    await delay(MOCK_DELAY);
    return createMockPaginatedResponse(mockPrescriptions);
  },

  // ── Messages ─────────────────────────────────────────────────────────────────
  "GET /messages/inbox": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockInbox);
  },

  "GET /messages/unread": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse({ count: 1 });
  },

  "GET /messages/conversation/:userId": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockConversation);
  },

  "POST /messages": async (data) => {
    await delay(MOCK_DELAY);
    const message = {
      id: Date.now(),
      content: data.content,
      sender_id: mockAuthState.user?.id || 1,
      is_mine: true,
      read_at: null,
      attachments: [],
      created_at: new Date().toISOString(),
    };
    return createMockResponse(message, "Message envoyé");
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  "GET /admin/dashboard": async () => {
    await delay(MOCK_DELAY);
    return createMockResponse(mockAdminDashboard);
  },
};

/**
 * Trouve le handler correspondant à la requête
 */
const findHandler = (method, url) => {
  const cleanUrl = url.replace(/\?.*$/, ""); // Retirer les query params

  for (const [pattern, handler] of Object.entries(mockHandlers)) {
    const [patternMethod, patternPath] = pattern.split(" ");
    if (patternMethod !== method) continue;

    // Convertir le pattern en regex
    const regex = new RegExp(
      "^" + patternPath.replace(/:(\w+)/g, "([^/]+)") + "$",
    );
    const match = cleanUrl.match(regex);

    if (match) {
      return { handler, params: match.slice(1) };
    }
  }
  return null;
};

/**
 * Client mock qui simule les appels API
 */
export const createMockClient = () => {
  const mockRequest = async (method, url, data = {}, config = {}) => {
    console.log(`[MOCK] ${method} ${url}`, data);

    const result = findHandler(method, url);

    if (!result) {
      console.warn(`[MOCK] No handler for ${method} ${url}`);
      throw createMockError(`Mock not implemented: ${method} ${url}`, {}, 501);
    }

    try {
      // Extraire les params de l'URL et les query params
      const urlParams = new URLSearchParams(url.split("?")[1] || "");
      const queryParams = Object.fromEntries(urlParams.entries());
      const allParams = { ...queryParams, ...config.params };

      const response = await result.handler(
        method === "GET" ? allParams : data,
        ...result.params,
      );
      console.log(`[MOCK OK] ${method} ${url}`, response);
      return { data: response };
    } catch (error) {
      console.error(`[MOCK ERR] ${method} ${url}`, error);
      const err = new Error(error.message || "Mock error");
      err.response = { status: error.status || 500, data: error };
      throw err;
    }
  };

  return {
    get: (url, config) => mockRequest("GET", url, {}, config),
    post: (url, data, config) => mockRequest("POST", url, data, config),
    put: (url, data, config) => mockRequest("PUT", url, data, config),
    patch: (url, data, config) => mockRequest("PATCH", url, data, config),
    delete: (url, config) => mockRequest("DELETE", url, {}, config),
  };
};

export const mockClient = createMockClient();
