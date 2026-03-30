/**
 * Données fictives pour le développement frontend
 * Suivent le contrat API documenté dans /API_CONTRACT.md
 */

// ── Utilisateurs ─────────────────────────────────────────────────────────────

export const mockUsers = {
  patient: {
    id: 1,
    first_name: 'Marie',
    last_name: 'Martin',
    full_name: 'Marie Martin',
    email: 'marie.martin@example.com',
    phone: '+33698765432',
    gender: 'female',
    birth_date: '1985-08-22',
    avatar: null,
    status: 'active',
    roles: ['patient'],
    permissions: [],
    two_factor_enabled: false,
    email_verified_at: '2026-01-15T08:00:00Z',
    structure: null,
    doctor_profile: null,
    created_at: '2026-01-10T08:00:00Z',
  },

  doctor: {
    id: 2,
    first_name: 'Pierre',
    last_name: 'Durand',
    full_name: 'Dr. Pierre Durand',
    email: 'dr.durand@example.com',
    phone: '+33612345678',
    gender: 'male',
    birth_date: '1975-03-15',
    avatar: 'https://i.pravatar.cc/150?u=doctor2',
    status: 'active',
    roles: ['doctor'],
    permissions: ['appointments.create', 'consultations.start', 'prescriptions.create'],
    two_factor_enabled: true,
    email_verified_at: '2026-01-05T08:00:00Z',
    structure: {
      id: 1,
      name: 'Clinique Saint-Louis',
      type: 'clinic',
      city: 'Paris',
    },
    doctor_profile: {
      specialty: 'Cardiologie',
      sub_specialties: ['Échocardiographie', 'Rythmologie'],
      rpps_number: '10123456789',
      consultation_fee: 50.00,
      bio: 'Cardiologue avec 20 ans d\'expérience, spécialisé en échocardiographie.',
      teleconsultation_enabled: true,
      in_person_enabled: true,
      languages: ['fr', 'en'],
      experience_years: 20,
      verified: true,
      verified_at: '2026-02-01T10:00:00Z',
    },
    created_at: '2025-06-15T08:00:00Z',
  },

  specialist: {
    id: 3,
    first_name: 'Sophie',
    last_name: 'Bernard',
    full_name: 'Dr. Sophie Bernard',
    email: 'dr.bernard@example.com',
    phone: '+33687654321',
    gender: 'female',
    birth_date: '1980-11-28',
    avatar: 'https://i.pravatar.cc/150?u=specialist3',
    status: 'active',
    roles: ['specialist'],
    permissions: ['appointments.create', 'consultations.start', 'teleexpertise.respond'],
    two_factor_enabled: true,
    email_verified_at: '2026-01-02T08:00:00Z',
    structure: {
      id: 2,
      name: 'Hôpital Universitaire',
      type: 'hospital',
      city: 'Lyon',
    },
    doctor_profile: {
      specialty: 'Neurologie',
      rpps_number: '10987654321',
      consultation_fee: 70.00,
      bio: 'Neurologue spécialisée en maladies neurodégénératives.',
      teleconsultation_enabled: true,
      in_person_enabled: true,
      languages: ['fr', 'en', 'de'],
      experience_years: 15,
      verified: true,
      verified_at: '2026-01-15T10:00:00Z',
    },
    created_at: '2025-08-20T08:00:00Z',
  },

  admin: {
    id: 4,
    first_name: 'Admin',
    last_name: 'System',
    full_name: 'Admin System',
    email: 'admin@telemedecine.fr',
    phone: '+33600000000',
    gender: 'other',
    birth_date: null,
    avatar: null,
    status: 'active',
    roles: ['admin'],
    permissions: ['*'],
    two_factor_enabled: true,
    email_verified_at: '2025-01-01T00:00:00Z',
    structure: null,
    doctor_profile: null,
    created_at: '2025-01-01T00:00:00Z',
  },
}

// ── Rendez-vous ──────────────────────────────────────────────────────────────

export const mockAppointments = [
  {
    id: 1,
    reference: 'RDV-A1B2C3D4',
    type: 'teleconsultation',
    status: 'confirmed',
    scheduled_at: '2026-03-25T14:00:00Z',
    duration_minutes: 30,
    reason: 'Consultation de suivi cardiologique',
    notes: 'Patient diabétique, surveiller glycémie',
    patient: { id: 1, full_name: 'Marie Martin', avatar: null },
    doctor: { id: 2, full_name: 'Dr. Pierre Durand', specialty: 'Cardiologie', avatar: 'https://i.pravatar.cc/150?u=doctor2', consultation_fee: 50.00 },
    requesting_ps: null,
    delegated_to: null,
    patient_consent_given: true,
    patient_consent_at: '2026-03-20T10:05:00Z',
    physical_consult_confirmed: true,
    last_physical_consult_date: '2025-11-15',
    consultation: null,
    can_start: true,
    can_cancel: true,
    can_confirm: false,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:05:00Z',
  },
  {
    id: 2,
    reference: 'RDV-E5F6G7H8',
    type: 'teleconsultation',
    status: 'pending',
    scheduled_at: '2026-03-26T09:30:00Z',
    duration_minutes: 30,
    reason: 'Première consultation neurologie',
    notes: null,
    patient: { id: 1, full_name: 'Marie Martin', avatar: null },
    doctor: { id: 3, full_name: 'Dr. Sophie Bernard', specialty: 'Neurologie', avatar: 'https://i.pravatar.cc/150?u=specialist3', consultation_fee: 70.00 },
    requesting_ps: null,
    delegated_to: null,
    patient_consent_given: false,
    patient_consent_at: null,
    physical_consult_confirmed: false,
    last_physical_consult_date: null,
    consultation: null,
    can_start: false,
    can_cancel: true,
    can_confirm: true,
    created_at: '2026-03-22T15:00:00Z',
    updated_at: '2026-03-22T15:00:00Z',
  },
  {
    id: 3,
    reference: 'RDV-I9J0K1L2',
    type: 'teleconsultation',
    status: 'completed',
    scheduled_at: '2026-03-20T11:00:00Z',
    duration_minutes: 25,
    reason: 'Renouvellement ordonnance',
    notes: null,
    patient: { id: 1, full_name: 'Marie Martin', avatar: null },
    doctor: { id: 2, full_name: 'Dr. Pierre Durand', specialty: 'Cardiologie', avatar: 'https://i.pravatar.cc/150?u=doctor2', consultation_fee: 50.00 },
    requesting_ps: null,
    delegated_to: null,
    patient_consent_given: true,
    patient_consent_at: '2026-03-18T09:00:00Z',
    physical_consult_confirmed: true,
    last_physical_consult_date: '2025-11-15',
    consultation: { id: 1, status: 'completed', started_at: '2026-03-20T11:00:00Z', ended_at: '2026-03-20T11:25:00Z' },
    can_start: false,
    can_cancel: false,
    can_confirm: false,
    created_at: '2026-03-18T08:00:00Z',
    updated_at: '2026-03-20T11:25:00Z',
  },
]

// ── Créneaux disponibles ─────────────────────────────────────────────────────

export const mockAvailableSlots = {
  doctor: { id: 2, full_name: 'Dr. Pierre Durand', specialty: 'Cardiologie' },
  slots: [
    {
      date: '2026-03-25',
      times: [
        { start: '09:00', end: '09:30', available: true },
        { start: '09:30', end: '10:00', available: false },
        { start: '10:00', end: '10:30', available: true },
        { start: '10:30', end: '11:00', available: true },
        { start: '14:00', end: '14:30', available: false },
        { start: '14:30', end: '15:00', available: true },
        { start: '15:00', end: '15:30', available: true },
      ],
    },
    {
      date: '2026-03-26',
      times: [
        { start: '09:00', end: '09:30', available: true },
        { start: '09:30', end: '10:00', available: true },
        { start: '14:00', end: '14:30', available: true },
      ],
    },
    {
      date: '2026-03-27',
      times: [
        { start: '10:00', end: '10:30', available: true },
        { start: '10:30', end: '11:00', available: true },
        { start: '11:00', end: '11:30', available: true },
      ],
    },
  ],
}

// ── Annuaire médecins ────────────────────────────────────────────────────────

export const mockDoctors = [
  {
    id: 2,
    first_name: 'Pierre',
    last_name: 'Durand',
    full_name: 'Dr. Pierre Durand',
    avatar: 'https://i.pravatar.cc/150?u=doctor2',
    specialty: 'Cardiologie',
    sub_specialties: ['Échocardiographie', 'Rythmologie'],
    bio: 'Cardiologue avec 20 ans d\'expérience.',
    consultation_fee: 50.00,
    teleconsultation_enabled: true,
    in_person_enabled: true,
    languages: ['fr', 'en'],
    experience_years: 20,
    verified: true,
    next_available_slot: '2026-03-25T09:00:00Z',
    structure: { id: 1, name: 'Clinique Saint-Louis', city: 'Paris', address: '123 rue de la Santé', postal_code: '75013' },
    schedules: [
      { day: 'monday', start: '09:00', end: '12:00' },
      { day: 'monday', start: '14:00', end: '18:00' },
      { day: 'wednesday', start: '09:00', end: '17:00' },
      { day: 'friday', start: '09:00', end: '12:00' },
    ],
    rating: 4.8,
    review_count: 127,
  },
  {
    id: 3,
    first_name: 'Sophie',
    last_name: 'Bernard',
    full_name: 'Dr. Sophie Bernard',
    avatar: 'https://i.pravatar.cc/150?u=specialist3',
    specialty: 'Neurologie',
    sub_specialties: ['Maladies neurodégénératives'],
    bio: 'Neurologue spécialisée avec 15 ans d\'expérience.',
    consultation_fee: 70.00,
    teleconsultation_enabled: true,
    in_person_enabled: true,
    languages: ['fr', 'en', 'de'],
    experience_years: 15,
    verified: true,
    next_available_slot: '2026-03-26T09:00:00Z',
    structure: { id: 2, name: 'Hôpital Universitaire', city: 'Lyon', address: '456 avenue de la Médecine', postal_code: '69003' },
    schedules: [
      { day: 'tuesday', start: '09:00', end: '17:00' },
      { day: 'thursday', start: '09:00', end: '17:00' },
    ],
    rating: 4.9,
    review_count: 89,
  },
  {
    id: 5,
    first_name: 'Marc',
    last_name: 'Lefebvre',
    full_name: 'Dr. Marc Lefebvre',
    avatar: 'https://i.pravatar.cc/150?u=doctor5',
    specialty: 'Médecine générale',
    sub_specialties: [],
    bio: 'Médecin généraliste, approche holistique.',
    consultation_fee: 25.00,
    teleconsultation_enabled: true,
    in_person_enabled: true,
    languages: ['fr'],
    experience_years: 10,
    verified: true,
    next_available_slot: '2026-03-24T16:00:00Z',
    structure: null,
    schedules: [
      { day: 'monday', start: '08:00', end: '19:00' },
      { day: 'tuesday', start: '08:00', end: '19:00' },
      { day: 'wednesday', start: '08:00', end: '12:00' },
      { day: 'thursday', start: '08:00', end: '19:00' },
      { day: 'friday', start: '08:00', end: '17:00' },
    ],
    rating: 4.6,
    review_count: 234,
  },
]

// ── Spécialités ──────────────────────────────────────────────────────────────

export const mockSpecialties = [
  { id: 1, name: 'Cardiologie', slug: 'cardiologie' },
  { id: 2, name: 'Dermatologie', slug: 'dermatologie' },
  { id: 3, name: 'Médecine générale', slug: 'medecine-generale' },
  { id: 4, name: 'Neurologie', slug: 'neurologie' },
  { id: 5, name: 'Psychiatrie', slug: 'psychiatrie' },
  { id: 6, name: 'Gynécologie', slug: 'gynecologie' },
  { id: 7, name: 'Pédiatrie', slug: 'pediatrie' },
  { id: 8, name: 'Ophtalmologie', slug: 'ophtalmologie' },
  { id: 9, name: 'ORL', slug: 'orl' },
  { id: 10, name: 'Rhumatologie', slug: 'rhumatologie' },
]

// ── Consultations ────────────────────────────────────────────────────────────

export const mockConsultations = [
  {
    id: 1,
    appointment_id: 3,
    status: 'completed',
    started_at: '2026-03-20T11:00:00Z',
    ended_at: '2026-03-20T11:25:00Z',
    duration_minutes: 25,
    summary: 'Consultation de renouvellement. Patient stable, poursuite du traitement.',
    patient: { id: 1, full_name: 'Marie Martin', avatar: null },
    doctor: { id: 2, full_name: 'Dr. Pierre Durand', avatar: 'https://i.pravatar.cc/150?u=doctor2' },
    report: {
      id: 1,
      motif: 'Renouvellement ordonnance traitement cardiaque',
      diagnostic: 'Insuffisance cardiaque stable',
      conduite_a_tenir: 'Poursuite du traitement actuel',
      signed: true,
      signed_at: '2026-03-20T11:30:00Z',
      shared_with_patient: true,
    },
  },
]

// ── Messages ─────────────────────────────────────────────────────────────────

export const mockInbox = [
  {
    conversation_with: { id: 2, full_name: 'Dr. Pierre Durand', avatar: 'https://i.pravatar.cc/150?u=doctor2', role: 'doctor' },
    last_message: {
      id: 42,
      content: 'N\'hésitez pas à me recontacter si besoin.',
      is_mine: false,
      read_at: '2026-03-24T16:35:00Z',
      created_at: '2026-03-24T16:30:00Z',
    },
    unread_count: 0,
  },
  {
    conversation_with: { id: 3, full_name: 'Dr. Sophie Bernard', avatar: 'https://i.pravatar.cc/150?u=specialist3', role: 'specialist' },
    last_message: {
      id: 38,
      content: 'Votre rendez-vous est confirmé pour demain.',
      is_mine: false,
      read_at: null,
      created_at: '2026-03-23T14:00:00Z',
    },
    unread_count: 1,
  },
]

export const mockConversation = [
  {
    id: 42,
    content: 'N\'hésitez pas à me recontacter si besoin.',
    sender_id: 2,
    is_mine: false,
    read_at: '2026-03-24T16:35:00Z',
    attachments: [],
    created_at: '2026-03-24T16:30:00Z',
  },
  {
    id: 41,
    content: 'Merci beaucoup docteur pour vos conseils !',
    sender_id: 1,
    is_mine: true,
    read_at: '2026-03-24T16:25:00Z',
    attachments: [],
    created_at: '2026-03-24T16:20:00Z',
  },
  {
    id: 40,
    content: 'Je vous ai envoyé l\'ordonnance de renouvellement. Vous pouvez la télécharger depuis votre espace.',
    sender_id: 2,
    is_mine: false,
    read_at: '2026-03-24T16:15:00Z',
    attachments: [],
    created_at: '2026-03-24T16:10:00Z',
  },
]

// ── Documents ────────────────────────────────────────────────────────────────

export const mockDocuments = [
  {
    id: 1,
    name: 'Compte-rendu consultation 20/03/2026',
    type: 'medical_report',
    mime_type: 'application/pdf',
    size_bytes: 245678,
    consultation_id: 1,
    uploaded_by: { id: 2, full_name: 'Dr. Pierre Durand' },
    created_at: '2026-03-20T11:35:00Z',
  },
  {
    id: 2,
    name: 'Ordonnance Bisoprolol',
    type: 'prescription',
    mime_type: 'application/pdf',
    size_bytes: 125000,
    consultation_id: 1,
    uploaded_by: { id: 2, full_name: 'Dr. Pierre Durand' },
    created_at: '2026-03-20T11:40:00Z',
  },
  {
    id: 3,
    name: 'ECG 15/11/2025',
    type: 'lab_result',
    mime_type: 'application/pdf',
    size_bytes: 567890,
    consultation_id: null,
    uploaded_by: { id: 1, full_name: 'Marie Martin' },
    created_at: '2025-11-15T10:00:00Z',
  },
]

// ── Prescriptions ────────────────────────────────────────────────────────────

export const mockPrescriptions = [
  {
    id: 1,
    reference: 'ORD-X1Y2Z3',
    consultation_id: 1,
    items: [
      { medication_name: 'Bisoprolol 5mg', dosage: '1 comprimé', frequency: '1 fois par jour', duration_days: 30, instructions: 'Le matin au petit-déjeuner' },
      { medication_name: 'Kardégic 75mg', dosage: '1 sachet', frequency: '1 fois par jour', duration_days: 30, instructions: 'Le midi, pendant le repas' },
    ],
    notes: 'Surveillance de la tension artérielle. Revoir dans 1 mois.',
    signed: true,
    signed_at: '2026-03-20T11:45:00Z',
    shared: true,
    shared_at: '2026-03-20T11:46:00Z',
    patient: { id: 1, full_name: 'Marie Martin' },
    doctor: { id: 2, full_name: 'Dr. Pierre Durand' },
    created_at: '2026-03-20T11:40:00Z',
  },
]

// ── Dashboard médecin ────────────────────────────────────────────────────────

export const mockDoctorDashboard = {
  today: {
    appointments_count: 8,
    completed_count: 3,
    upcoming: [
      { id: 1, reference: 'RDV-A1B2C3D4', type: 'teleconsultation', status: 'confirmed', scheduled_at: '2026-03-24T14:00:00Z', patient: { id: 1, full_name: 'Marie Martin' } },
      { id: 4, reference: 'RDV-M3N4O5P6', type: 'teleconsultation', status: 'confirmed', scheduled_at: '2026-03-24T15:00:00Z', patient: { id: 6, full_name: 'Jean Petit' } },
      { id: 5, reference: 'RDV-Q7R8S9T0', type: 'teleconsultation', status: 'confirmed', scheduled_at: '2026-03-24T16:00:00Z', patient: { id: 7, full_name: 'Claire Dubois' } },
    ],
  },
  week: {
    appointments_count: 32,
    revenue: 1600.00,
  },
  pending_reports: 2,
  unread_messages: 5,
  pending_teleexpertise: 1,
}

// ── Dashboard admin ──────────────────────────────────────────────────────────

export const mockAdminDashboard = {
  users: {
    total: 1250,
    patients: 980,
    doctors: 150,
    specialists: 80,
    health_professionals: 40,
  },
  consultations: {
    today: 45,
    this_week: 312,
    this_month: 1245,
  },
  pending_verifications: 12,
  revenue: {
    today: 2250.00,
    this_week: 15600.00,
    this_month: 62400.00,
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const createMockResponse = (data, message = 'Succès') => ({
  success: true,
  data,
  message,
})

export const createMockPaginatedResponse = (data, page = 1, perPage = 15, total = null) => ({
  success: true,
  data,
  meta: {
    pagination: {
      current_page: page,
      last_page: Math.ceil((total || data.length) / perPage),
      per_page: perPage,
      total: total || data.length,
      from: (page - 1) * perPage + 1,
      to: Math.min(page * perPage, total || data.length),
    },
  },
})

export const createMockError = (message, errors = {}, status = 422) => ({
  success: false,
  message,
  errors,
  status,
})
