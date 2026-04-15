import apiClient from "./client";

const defaultSharePayload = { share_with: ["patient"] };

const toConsultationStartRequest = (input, payload = {}) => {
  if (typeof input === "object" && input !== null) {
    const { appointment_id, appointmentId, id, ...rest } = input;
    const appointment = appointment_id ?? appointmentId ?? id;
    if (appointment) {
      return {
        url: `/consultations/appointments/${appointment}/start`,
        data: rest,
      };
    }
  } else if (input !== undefined && input !== null && input !== "") {
    return { url: `/consultations/appointments/${input}/start`, data: payload };
  }

  throw new Error(
    "appointment_id est requis pour demarrer une consultation depuis un rendez-vous.",
  );
};

const toTerminologySearchParams = (params = {}) => {
  if (!params || typeof params !== "object") return params;

  const { q, term, ...rest } = params;
  const normalizedTerm = term ?? q;

  return normalizedTerm ? { ...rest, term: normalizedTerm } : rest;
};

const toDicomThumbnailPath = (studyId) => `/dicom/studies/${studyId}/thumbnail`;

const toCertificatStatsPath = () => "/certificats-deces/statistiques";

const toMessageSendPayload = (recipientOrPayload, payload = {}) => {
  if (typeof recipientOrPayload === "object" && recipientOrPayload !== null) {
    return recipientOrPayload;
  }
  return { recipient_id: recipientOrPayload, ...payload };
};

const toSharePayload = (payload) => {
  if (!payload) return defaultSharePayload;
  if (Array.isArray(payload)) return { share_with: payload };
  if (Array.isArray(payload.share_with)) return payload;
  return { ...defaultSharePayload, ...payload };
};
// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => apiClient.post("/auth/register", data),
  login: (data) => apiClient.post("/auth/login", data),
  verifyTwoFactor: (data) => apiClient.post("/auth/two-factor/verify", data),
  resendTwoFactor: () => apiClient.post("/auth/two-factor/resend", {}),
  logout: () => apiClient.post("/auth/logout", {}),
  me: () => apiClient.get("/auth/me"),
  updateProfile: (data) => apiClient.put("/auth/profile", data),
  changePassword: (data) => apiClient.put("/auth/password", data),
  forgotPassword: (data) => apiClient.post("/auth/password/forgot", data),
  resetPassword: (data) => apiClient.post("/auth/password/reset", data),
};

// ── Annuaire médecins ─────────────────────────────────────────────────────────
export const directoryApi = {
  search: (params) => apiClient.get("/directory/doctors", { params }),
  getDoctor: (id) => apiClient.get(`/directory/doctors/${id}`),
  getSpecialties: () => apiClient.get("/directory/specialties"),
  getStructures: (params) => apiClient.get("/directory/structures", { params }),
  getSlots: (params) =>
    apiClient.get("/directory/appointments/slots", { params }),
  getAvailability: (params) =>
    apiClient.get("/directory/appointments/availability", { params }),
  createSchedule: (data) => apiClient.post("/directory/schedule", data),
  deleteSchedule: (id) => apiClient.delete(`/directory/schedule/${id}`),
  mySchedule: () => apiClient.get("/directory/schedule"),
};

// ── Rendez-vous ───────────────────────────────────────────────────────────────
export const appointmentsApi = {
  list: (params) => apiClient.get("/appointments", { params }),
  create: (data) => apiClient.post("/appointments", data),
  get: (id) => apiClient.get(`/appointments/${id}`),
  confirm: (id) => apiClient.post(`/appointments/${id}/confirm`, {}),
  cancel: (id, data) => apiClient.post(`/appointments/${id}/cancel`, data),
  reject: (id, data) => apiClient.post(`/appointments/${id}/reject`, data),
  reschedule: (id, data) =>
    apiClient.post(`/appointments/${id}/reschedule`, data),
  delegate: (id, data) => apiClient.post(`/appointments/${id}/delegate`, data),
  recordConsent: (id, data) =>
    apiClient.post(`/appointments/${id}/consent`, data),
  downloadPdf: (id) =>
    apiClient.get(`/appointments/${id}/pdf`, { responseType: "blob" }),
  availableSlots: (params) =>
    apiClient.get("/directory/appointments/slots", { params }),
};

// ── Consultations ─────────────────────────────────────────────────────────────
export const consultationsApi = {
  list: (params) => apiClient.get("/consultations", { params }),
  get: (id) => apiClient.get(`/consultations/${id}`),
  start: (appointmentOrData, payload) => {
    const request = toConsultationStartRequest(appointmentOrData, payload);
    return apiClient.post(request.url, request.data);
  },
  end: (id) => apiClient.post(`/consultations/${id}/end`, {}),
  recordConsent: (id, d) => apiClient.post(`/consultations/${id}/consent`, d),
  rateVideoQuality: (id, d) =>
    apiClient.post(`/consultations/${id}/rate-video`, d),
  refreshJitsiToken: (id) =>
    apiClient.post(`/consultations/${id}/jitsi-token`, {}),
  getLivekitToken: (id) =>
    apiClient.post(`/consultations/${id}/livekit-token`, {}),
  transmitParams: (id, d) =>
    apiClient.post(`/consultations/${id}/medical-parameters`, d),
  createReport: (id, d) => apiClient.post(`/consultations/${id}/report`, d),
  signReport: (consultationId) =>
    apiClient.post(`/consultations/${consultationId}/report/sign`, {}),
  shareReport: (consultationId, payload) =>
    apiClient.post(
      `/consultations/${consultationId}/report/share`,
      toSharePayload(payload),
    ),
  downloadReportPdf: (consultationId) =>
    apiClient.get(`/consultations/${consultationId}/report/pdf`, {
      responseType: "blob",
    }),
  downloadPrescriptionPdf: (consultationId) =>
    apiClient.get(`/consultations/${consultationId}/prescription/pdf`, {
      responseType: "blob",
    }),
  dashboard: () => apiClient.get("/consultations/dashboard"),
};

// ── Téléexpertise ─────────────────────────────────────────────────────────────
export const teleexpertiseApi = {
  list: (params) => apiClient.get("/teleexpertise", { params }),
  create: (data) => apiClient.post("/teleexpertise", data),
  get: (id) => apiClient.get(`/teleexpertise/${id}`),
  accept: (id) => apiClient.post(`/teleexpertise/${id}/accept`, {}),
  reject: (id, d) => apiClient.post(`/teleexpertise/${id}/reject`, d),
  respond: (id, d) => apiClient.post(`/teleexpertise/${id}/respond`, d),
  stats: () => apiClient.get("/teleexpertise/stats"),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (params) => apiClient.get("/documents", { params }),
  upload: (data) =>
    apiClient.post("/documents", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  download: (id) =>
    apiClient.get(`/documents/${id}/download`, { responseType: "blob" }),
  delete: (id) => apiClient.delete(`/documents/${id}`),
};

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const prescriptionsApi = {
  list: (params) => apiClient.get("/prescriptions", { params }),
  create: (cId, d) => apiClient.post(`/consultations/${cId}/prescriptions`, d),
  sign: (id) => apiClient.post(`/prescriptions/${id}/sign`, {}),
  share: (id, d) => apiClient.post(`/prescriptions/${id}/share`, d),
};

// ── Paiements ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (cId, d) =>
    apiClient.post(`/payments/consultations/${cId}/initiate`, d),
  initiateForAppointment: (rdvId, d) =>
    apiClient.post(`/payments/appointments/${rdvId}/initiate`, d),
  confirm: (data) => apiClient.post("/payments/confirm", data),
  doctorValidate: (id) => apiClient.post(`/payments/${id}/doctor-validate`, {}),
  downloadInvoice: (id) =>
    apiClient.get(`/payments/${id}/invoice`, { responseType: "blob" }),
  statement: (params) => apiClient.get("/payments/statement", { params }),
  // Paramètres de frais publics
  getSettings: () => apiClient.get("/payments/settings"),
  // Calculer les frais avant paiement
  calculateFees: (d) => apiClient.post("/payments/calculate-fees", d),
};

// ── Messagerie ────────────────────────────────────────────────────────────────
export const messagesApi = {
  inbox: () => apiClient.get("/messages/inbox"),
  unreadCount: () => apiClient.get("/messages/unread"),
  conversation: (userId, p) =>
    apiClient.get(`/messages/conversation/${userId}`, { params: p }),
  send: (userIdOrPayload, data) =>
    apiClient.post("/messages", toMessageSendPayload(userIdOrPayload, data)),
  // Envoi avec pièce jointe (multipart/form-data)
  sendWithAttachment: (recipientId, body, file) => {
    const formData = new FormData();
    formData.append("recipient_id", recipientId);
    if (body) formData.append("body", body);
    if (file) formData.append("attachment", file);
    return apiClient.post("/messages", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Marquer comme lu
  markAsRead: (messageIds) =>
    apiClient.post("/messages/read", { message_ids: messageIds }),
  // Recherche
  search: (query, withUser) =>
    apiClient.get("/messages/search", {
      params: { q: query, with_user: withUser },
    }),
  // Supprimer un message
  delete: (id) => apiClient.delete(`/messages/${id}`),
  // Télécharger la pièce jointe
  attachmentUrl: (messageId) => `/messages/${messageId}/attachment`,
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params) => apiClient.get("/notifications", { params }),
  unreadCount: () => apiClient.get("/notifications/unread-count"),
  markAsRead: (id) => apiClient.post(`/notifications/${id}/read`, {}),
  markAllAsRead: () => apiClient.post("/notifications/read-all", {}),
};

// ── Dossier patient ───────────────────────────────────────────────────────────
export const patientRecordApi = {
  get: (patientId) => apiClient.get(`/patients/${patientId}/record`),
  update: (pId, data) => apiClient.put(`/patients/${pId}/record`, data),
};

// ── Dossier médical — sous-entités CRUD ───────────────────────────────────────
export const antecedentsApi = {
  create: (data) => apiClient.post("/antecedents", data),
  update: (id, data) => apiClient.put(`/antecedents/${id}`, data),
  delete: (id) => apiClient.delete(`/antecedents/${id}`),
};

export const allergiesApi = {
  create: (data) => apiClient.post("/allergies", data),
  update: (id, data) => apiClient.put(`/allergies/${id}`, data),
  delete: (id) => apiClient.delete(`/allergies/${id}`),
};

export const diagnosticsApi = {
  create: (data) => apiClient.post("/diagnostics", data),
  update: (id, data) => apiClient.put(`/diagnostics/${id}`, data),
  delete: (id) => apiClient.delete(`/diagnostics/${id}`),
};

export const examensApi = {
  create: (data) => apiClient.post("/examens", data),
  update: (id, data) => apiClient.put(`/examens/${id}`, data),
  delete: (id) => apiClient.delete(`/examens/${id}`),
};

export const traitementsApi = {
  create: (data) => apiClient.post("/traitements", data),
  update: (id, data) => apiClient.put(`/traitements/${id}`, data),
  delete: (id) => apiClient.delete(`/traitements/${id}`),
};

export const habitudesDeVieApi = {
  create: (data) => apiClient.post("/habitudes-de-vie", data),
  update: (id, data) => apiClient.put(`/habitudes-de-vie/${id}`, data),
  delete: (id) => apiClient.delete(`/habitudes-de-vie/${id}`),
};

export const constantesApi = {
  listByDossier: (dossierId) =>
    apiClient.get(`/dossiers/${dossierId}/constantes`),
};

// ── Patients (recherche/CRUD) ─────────────────────────────────────────────────
export const patientsApi = {
  list: (params) => apiClient.get("/patients", { params }),
  create: (data) => apiClient.post("/patients", data),
  get: (id) => apiClient.get(`/patients/${id}`),
  update: (id, data) => apiClient.put(`/patients/${id}`, data),
  delete: (id) => apiClient.delete(`/patients/${id}`),
};

// ── Consentements patient (REST) ──────────────────────────────────────────────
export const consentsApi = {
  list: (params) => apiClient.get("/consents", { params }),
  create: (data) => apiClient.post("/consents", data),
  check: () => apiClient.get("/consents/check"),
  get: (id) => apiClient.get(`/consents/${id}`),
  withdraw: (id) => apiClient.post(`/consents/${id}/withdraw`, {}),
  patientHistory: (patientId, params) =>
    apiClient.get(`/consents/patient/${patientId}/history`, { params }),
};

// ── Référentiels (pays, localités, grades, types PS, actes) ───────────────────
export const referentielsApi = {
  pays: () => apiClient.get("/pays"),
  localites: (params) => apiClient.get("/localites", { params }),
  grades: () => apiClient.get("/grades"),
  typesProfessionnelSante: () => apiClient.get("/type-professionnel-santes"),
  actes: () => apiClient.get("/actes"),
  typeSalles: () => apiClient.get("/type-salles"),
};

// ── Gestionnaire (structure_manager) ──────────────────────────────────────────
export const gestionnaireApi = {
  dashboard: () => apiClient.get("/gestionnaire/dashboard"),
  listProfessionnels: (params) =>
    apiClient.get("/gestionnaire/professionnels", { params }),
  createProfessionnel: (data) =>
    apiClient.post("/gestionnaire/professionnels", data),
  getProfessionnel: (id) => apiClient.get(`/gestionnaire/professionnels/${id}`),
  updateProfessionnel: (id, data) =>
    apiClient.put(`/gestionnaire/professionnels/${id}`, data),
  toggleStatus: (id) =>
    apiClient.patch(`/gestionnaire/professionnels/${id}/toggle-status`),
  listServices: () => apiClient.get("/gestionnaire/services"),
  createService: (data) => apiClient.post("/gestionnaire/services", data),
  // Salles
  listSalles: () => apiClient.get("/gestionnaire/salles"),
  createSalle: (data) => apiClient.post("/gestionnaire/salles", data),
  updateSalle: (id, data) => apiClient.put(`/gestionnaire/salles/${id}`, data),
  deleteSalle: (id) => apiClient.delete(`/gestionnaire/salles/${id}`),
};

// ── Administration ────────────────────────────────────────────────────────────
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

  // Structures
  listStructures: (params) => apiClient.get("/admin/structures", { params }),
  createStructure: (data) => apiClient.post("/admin/structures", data),
  getStructure: (id) => apiClient.get(`/admin/structures/${id}`),
  updateStructure: (id, data) => apiClient.put(`/admin/structures/${id}`, data),
  deleteStructure: (id) => apiClient.delete(`/admin/structures/${id}`),

  // Services d'une structure
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

  // Types de structures
  listTypeStructures: (params) =>
    apiClient.get("/admin/type-structures", { params }),
  createTypeStructure: (data) => apiClient.post("/admin/type-structures", data),
  updateTypeStructure: (id, data) =>
    apiClient.put(`/admin/type-structures/${id}`, data),
  deleteTypeStructure: (id) => apiClient.delete(`/admin/type-structures/${id}`),

  // Gestionnaires
  listGestionnaires: (params) =>
    apiClient.get("/admin/gestionnaires", { params }),
  createGestionnaire: (data) => apiClient.post("/admin/gestionnaires", data),

  // Rôles & Permissions
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

  // Paramètres de la plateforme
  getSettings: () => apiClient.get("/admin/settings"),
  updateSetting: (key, value) =>
    apiClient.put(`/admin/settings/${key}`, { value }),
  updateSettings: (settings) => apiClient.put("/admin/settings", { settings }),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditApi = {
  myLogs: (params) => apiClient.get("/audit/my-logs", { params }),
  list: (params) => apiClient.get("/audit/logs", { params }),
  report: (params) => apiClient.get("/audit/report", { params }),
};

// ── FHIR R4 ───────────────────────────────────────────────────────────────────
export const fhirApi = {
  metadata: () => apiClient.get("/fhir/metadata"),
  searchPatient: (params) => apiClient.get("/fhir/Patient", { params }),
  readPatient: (id) => apiClient.get(`/fhir/Patient/${id}`),
  patientEverything: (id, params) =>
    apiClient.get(`/fhir/Patient/${id}/$everything`, { params }),
  searchPractitioner: (params) =>
    apiClient.get("/fhir/Practitioner", { params }),
  readPractitioner: (id) => apiClient.get(`/fhir/Practitioner/${id}`),
  searchOrganization: (params) =>
    apiClient.get("/fhir/Organization", { params }),
  readOrganization: (id) => apiClient.get(`/fhir/Organization/${id}`),
  searchEncounter: (params) => apiClient.get("/fhir/Encounter", { params }),
  readEncounter: (id) => apiClient.get(`/fhir/Encounter/${id}`),
  searchObservation: (params) => apiClient.get("/fhir/Observation", { params }),
  searchCondition: (params) => apiClient.get("/fhir/Condition", { params }),
  searchAllergyIntolerance: (p) =>
    apiClient.get("/fhir/AllergyIntolerance", { params: p }),
  searchMedicationRequest: (p) =>
    apiClient.get("/fhir/MedicationRequest", { params: p }),
  searchDiagnosticReport: (p) =>
    apiClient.get("/fhir/DiagnosticReport", { params: p }),
  searchAppointment: (params) => apiClient.get("/fhir/Appointment", { params }),
  searchConsent: (params) => apiClient.get("/fhir/Consent", { params }),
  searchImagingStudy: (params) =>
    apiClient.get("/fhir/ImagingStudy", { params }),
};

// ── CDA R2 ────────────────────────────────────────────────────────────────────
export const cdaApi = {
  metadata: () => apiClient.get("/cda/metadata"),
  patientCcd: (id) =>
    apiClient.get(`/cda/Patient/${id}/ccd`, {
      responseType: "text",
      headers: { Accept: "application/xml" },
    }),
  patientSummary: (id) =>
    apiClient.get(`/cda/Patient/${id}/summary`, {
      responseType: "text",
      headers: { Accept: "application/xml" },
    }),
  consultationNote: (id) =>
    apiClient.get(`/cda/Consultation/${id}/note`, {
      responseType: "text",
      headers: { Accept: "application/xml" },
    }),
  validate: (xml) =>
    apiClient.post("/cda/validate", xml, {
      headers: { "Content-Type": "application/xml" },
    }),
};

// ── Certificats de décès ──────────────────────────────────────────────────────
export const certificatsDecesApi = {
  list: (params) => apiClient.get("/certificats-deces", { params }),
  create: (data) => apiClient.post("/certificats-deces", data),
  get: (id) => apiClient.get(`/certificats-deces/${id}`),
  update: (id, data) => apiClient.put(`/certificats-deces/${id}`, data),
  certifier: (id) => apiClient.post(`/certificats-deces/${id}/certifier`, {}),
  valider: (id) => apiClient.post(`/certificats-deces/${id}/valider`, {}),
  rejeter: (id, data) =>
    apiClient.post(`/certificats-deces/${id}/rejeter`, data),
  annuler: (id, data) =>
    apiClient.post(`/certificats-deces/${id}/annuler`, data),
  statistics: (params) => apiClient.get(toCertificatStatsPath(), { params }),
};

// ── Terminologies (SNOMED CT + ATC) ───────────────────────────────────────────
export const terminologyApi = {
  // SNOMED CT
  snomedSearch: (params) =>
    apiClient.get("/terminology/snomed/search", {
      params: toTerminologySearchParams(params),
    }),
  snomedLookup: (id) => apiClient.get(`/terminology/snomed/lookup/${id}`),
  snomedValidate: (id) => apiClient.get(`/terminology/snomed/validate/${id}`),
  snomedChildren: (id) => apiClient.get(`/terminology/snomed/children/${id}`),
  snomedDomainSearch: (domain, params) =>
    apiClient.get(`/terminology/snomed/${domain}`, {
      params: toTerminologySearchParams(params),
    }),
  snomedHealth: () => apiClient.get("/terminology/snomed/health"),
  // ATC
  atcTree: () => apiClient.get("/terminology/atc/tree"),
  atcSearch: (params) =>
    apiClient.get("/terminology/atc/search", {
      params: toTerminologySearchParams(params),
    }),
  atcLookup: (code) => apiClient.get(`/terminology/atc/lookup/${code}`),
  atcChildren: (code) => apiClient.get(`/terminology/atc/children/${code}`),
  atcValidate: (code) => apiClient.get(`/terminology/atc/validate/${code}`),
};

// ── ICD-11 (OMS) ──────────────────────────────────────────────────────────────
export const icd11Api = {
  search: (params) => apiClient.get("/icd11/search", { params }),
  lookup: (code) => apiClient.get(`/icd11/lookup/${code}`),
  validate: (code) => apiClient.get(`/icd11/validate/${code}`),
  crosswalk: (icd10) => apiClient.get(`/icd11/crosswalk/${icd10}`),
  health: () => apiClient.get("/icd11/health"),
};

// ── DICOM / Imagerie ──────────────────────────────────────────────────────────
export const dicomApi = {
  health: () => apiClient.get("/dicom/health"),
  listStudies: (params) => apiClient.get("/dicom/studies", { params }),
  getStudy: (id) => apiClient.get(`/dicom/studies/${id}`),
  createStudy: (data) => apiClient.post("/dicom/studies", data),
  updateStudy: (id, data) => apiClient.put(`/dicom/studies/${id}`, data),
  upload: (formData) =>
    apiClient.post("/dicom/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }),
  sync: (data) => apiClient.post("/dicom/sync", data),
  series: (uid) => apiClient.get(`/dicom/studies/${uid}/series`),
  instances: (studyUid, seriesUid) =>
    apiClient.get(`/dicom/studies/${studyUid}/series/${seriesUid}/instances`),
  thumbnail: (studyId) =>
    apiClient.get(toDicomThumbnailPath(studyId), {
      responseType: "blob",
    }),
};

// ── Licences ──────────────────────────────────────────────────────────────────
export const licensesApi = {
  grille: () => apiClient.get("/licenses/grille"),
  simuler: (data) => apiClient.post("/licenses/simuler", data),
  modules: () => apiClient.get("/licenses/modules"),
  creerDemo: (data) => apiClient.post("/licenses/demo", data),
  verifier: (sId) => apiClient.get(`/licenses/verifier/${sId}`),
  parStructure: (sId) => apiClient.get(`/licenses/structure/${sId}`),
  show: (id) => apiClient.get(`/licenses/${id}`),
  store: (data) => apiClient.post("/licenses", data),
  renouveler: (id) => apiClient.post(`/licenses/${id}/renouveler`, {}),
  suspendre: (id) => apiClient.patch(`/licenses/${id}/suspendre`),
  statistiques: () => apiClient.get("/licenses/statistiques"),
};

// ── DHIS2 & ENDOS (système national d'information sanitaire) ──────────────────
export const dhis2Api = {
  metadata: () => apiClient.get("/dhis2/metadata"),
  health: () => apiClient.get("/dhis2/health"),
  indicators: (params) => apiClient.get("/dhis2/indicators", { params }),
  mapping: () => apiClient.get("/dhis2/mapping"),
  organisationUnits: (params) =>
    apiClient.get("/dhis2/organisation-units", { params }),
  dataElements: () => apiClient.get("/dhis2/data-elements"),
  datasets: () => apiClient.get("/dhis2/datasets"),
  push: (data) => apiClient.post("/dhis2/push", data),
  syncStatus: () => apiClient.get("/dhis2/sync-status"),
  // ENDOS
  endosHealth: () => apiClient.get("/dhis2/endos/health"),
  endosOrgUnitMapping: () => apiClient.get("/dhis2/endos/org-unit-mapping"),
  endosSyncOrgUnits: () => apiClient.post("/dhis2/endos/sync-org-units", {}),
  endosPush: (data) => apiClient.post("/dhis2/endos/push", data || {}),
};
