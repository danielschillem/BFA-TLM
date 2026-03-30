/**
 * Types API - Plateforme Télémédecine
 * Documentation JSDoc pour l'autocomplétion et la validation des types
 * 
 * @fileoverview Définitions de types correspondant au contrat API
 * @see ../../../API_CONTRACT.md
 */

// ══════════════════════════════════════════════════════════════════════════════
// RÉPONSES API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {T} data
 * @property {string} [message]
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success
 * @property {T[]} data
 * @property {PaginationMeta} meta
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {Object} pagination
 * @property {number} pagination.current_page
 * @property {number} pagination.last_page
 * @property {number} pagination.per_page
 * @property {number} pagination.total
 * @property {number} pagination.from
 * @property {number} pagination.to
 */

/**
 * @typedef {Object} ApiError
 * @property {boolean} success
 * @property {string} message
 * @property {Object.<string, string[]>} [errors]
 */

// ══════════════════════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'patient' | 'doctor' | 'specialist' | 'health_professional' | 'admin' | 'structure_manager'} UserRole
 */

/**
 * @typedef {'male' | 'female' | 'other'} Gender
 */

/**
 * @typedef {'active' | 'inactive' | 'suspended'} UserStatus
 */

/**
 * @typedef {Object} UserSummary
 * @property {number} id
 * @property {string} full_name
 * @property {string|null} avatar
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} full_name
 * @property {string} email
 * @property {string|null} phone
 * @property {Gender|null} gender
 * @property {string|null} birth_date - Format YYYY-MM-DD
 * @property {string|null} avatar - URL complète
 * @property {UserStatus} status
 * @property {UserRole[]} roles
 * @property {string[]} [permissions]
 * @property {boolean} two_factor_enabled
 * @property {string|null} email_verified_at - ISO 8601
 * @property {StructureSummary|null} [structure]
 * @property {DoctorProfile|null} [doctor_profile]
 * @property {string} created_at - ISO 8601
 */

/**
 * @typedef {Object} DoctorProfile
 * @property {string} specialty
 * @property {string[]|null} sub_specialties
 * @property {string} rpps_number
 * @property {number} consultation_fee
 * @property {string|null} bio
 * @property {boolean} teleconsultation_enabled
 * @property {boolean} in_person_enabled
 * @property {string[]} languages
 * @property {number|null} experience_years
 * @property {boolean} verified
 * @property {string|null} verified_at - ISO 8601
 */

/**
 * @typedef {Object} DoctorSummary
 * @property {number} id
 * @property {string} full_name
 * @property {string|null} avatar
 * @property {string} specialty
 * @property {number} consultation_fee
 */

/**
 * @typedef {Object} DoctorDirectory
 * @property {number} id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} full_name
 * @property {string|null} avatar
 * @property {string} specialty
 * @property {string[]|null} sub_specialties
 * @property {string|null} bio
 * @property {number} consultation_fee
 * @property {boolean} teleconsultation_enabled
 * @property {boolean} in_person_enabled
 * @property {string[]} languages
 * @property {number|null} experience_years
 * @property {boolean} verified
 * @property {string|null} next_available_slot - ISO 8601
 * @property {StructureInfo|null} structure
 * @property {DoctorSchedule[]} [schedules]
 * @property {number|null} rating
 * @property {number} review_count
 */

/**
 * @typedef {Object} DoctorSchedule
 * @property {'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday'} day
 * @property {string} start - Format HH:mm
 * @property {string} end - Format HH:mm
 */

// ══════════════════════════════════════════════════════════════════════════════
// STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'clinic' | 'hospital' | 'cabinet' | 'center'} StructureType
 */

/**
 * @typedef {Object} StructureSummary
 * @property {number} id
 * @property {string} name
 * @property {StructureType} type
 * @property {string|null} city
 */

/**
 * @typedef {Object} StructureInfo
 * @property {number} id
 * @property {string} name
 * @property {string|null} city
 * @property {string|null} address
 * @property {string|null} postal_code
 */

// ══════════════════════════════════════════════════════════════════════════════
// RENDEZ-VOUS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'teleconsultation' | 'in_person' | 'teleexpertise'} AppointmentType
 */

/**
 * @typedef {'pending' | 'confirmed' | 'completed' | 'cancelled'} AppointmentStatus
 */

/**
 * @typedef {Object} AppointmentSummary
 * @property {number} id
 * @property {string} reference
 * @property {AppointmentType} type
 * @property {AppointmentStatus} status
 * @property {string} scheduled_at - ISO 8601
 */

/**
 * @typedef {Object} Appointment
 * @property {number} id
 * @property {string} reference
 * @property {AppointmentType} type
 * @property {AppointmentStatus} status
 * @property {string} scheduled_at - ISO 8601
 * @property {number} duration_minutes
 * @property {string} reason
 * @property {string|null} notes
 * @property {UserSummary} patient
 * @property {DoctorSummary} doctor
 * @property {UserSummary|null} [requesting_ps]
 * @property {UserSummary|null} [delegated_to]
 * @property {boolean} patient_consent_given
 * @property {string|null} patient_consent_at - ISO 8601
 * @property {boolean} physical_consult_confirmed
 * @property {string|null} last_physical_consult_date - YYYY-MM-DD
 * @property {ConsultationSummary|null} [consultation]
 * @property {boolean} can_start
 * @property {boolean} can_cancel
 * @property {boolean} can_confirm
 * @property {string} created_at - ISO 8601
 * @property {string} updated_at - ISO 8601
 */

/**
 * @typedef {Object} AvailableSlot
 * @property {string} start - Format HH:mm
 * @property {string} end - Format HH:mm
 * @property {boolean} available
 */

/**
 * @typedef {Object} DaySlots
 * @property {string} date - YYYY-MM-DD
 * @property {AvailableSlot[]} times
 */

/**
 * @typedef {Object} AvailableSlotsResponse
 * @property {UserSummary} doctor
 * @property {DaySlots[]} slots
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'scheduled' | 'in_progress' | 'completed' | 'interrupted'} ConsultationStatus
 */

/**
 * @typedef {Object} ConsultationSummary
 * @property {number} id
 * @property {ConsultationStatus} status
 * @property {string|null} started_at - ISO 8601
 * @property {string|null} ended_at - ISO 8601
 */

/**
 * @typedef {Object} VideoRoom
 * @property {string} provider
 * @property {string} room_name
 * @property {string} token
 */

/**
 * @typedef {Object} Consultation
 * @property {number} id
 * @property {number} appointment_id
 * @property {ConsultationStatus} status
 * @property {string|null} started_at - ISO 8601
 * @property {string|null} ended_at - ISO 8601
 * @property {number|null} duration_minutes
 * @property {string|null} summary
 * @property {VideoRoom} [video_room] - Présent seulement si status === 'in_progress'
 * @property {UserSummary} patient
 * @property {UserSummary} doctor
 * @property {AppointmentSummary} [appointment]
 * @property {ConsultationReport|null} [report]
 * @property {string} created_at - ISO 8601
 * @property {string} updated_at - ISO 8601
 */

/**
 * @typedef {'none' | 'specialist' | 'emergency' | 'hospitalization'} Orientation
 */

/**
 * @typedef {Object} ConsultationReport
 * @property {number} id
 * @property {number} consultation_id
 * @property {string} motif
 * @property {string} anamnese
 * @property {string|null} examen_clinique
 * @property {string} diagnostic
 * @property {string} conduite_a_tenir
 * @property {string|null} prescriptions_summary
 * @property {Orientation|null} orientation
 * @property {boolean} next_appointment_recommended
 * @property {number|null} next_appointment_delay_days
 * @property {boolean} signed
 * @property {string|null} signed_at - ISO 8601
 * @property {boolean} shared_with_patient
 * @property {string|null} shared_at - ISO 8601
 * @property {string} created_at - ISO 8601
 * @property {string} updated_at - ISO 8601
 */

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {'medical_report' | 'prescription' | 'lab_result' | 'imaging' | 'other'} DocumentType
 */

/**
 * @typedef {Object} Document
 * @property {number} id
 * @property {string} name
 * @property {DocumentType} type
 * @property {string} mime_type
 * @property {number} size_bytes
 * @property {number|null} consultation_id
 * @property {number|null} patient_id
 * @property {UserSummary} uploaded_by
 * @property {string} [download_url]
 * @property {string} created_at - ISO 8601
 */

// ══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} PrescriptionItem
 * @property {string} medication_name
 * @property {string} dosage
 * @property {string} frequency
 * @property {number} duration_days
 * @property {string|null} instructions
 */

/**
 * @typedef {Object} Prescription
 * @property {number} id
 * @property {string} reference
 * @property {number} consultation_id
 * @property {PrescriptionItem[]} items
 * @property {string|null} notes
 * @property {boolean} signed
 * @property {string|null} signed_at - ISO 8601
 * @property {boolean} shared
 * @property {string|null} shared_at - ISO 8601
 * @property {UserSummary} patient
 * @property {UserSummary} doctor
 * @property {string} created_at - ISO 8601
 */

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGERIE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} MessageAttachment
 * @property {number} id
 * @property {string} name
 * @property {string} mime_type
 * @property {number} size
 * @property {string} url
 */

/**
 * @typedef {Object} Message
 * @property {number} id
 * @property {string} content
 * @property {number} sender_id
 * @property {boolean} is_mine
 * @property {string|null} read_at - ISO 8601
 * @property {MessageAttachment[]} attachments
 * @property {string} created_at - ISO 8601
 */

/**
 * @typedef {Object} ConversationPreview
 * @property {UserSummary & {role: UserRole}} conversation_with
 * @property {Message} last_message
 * @property {number} unread_count
 */

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} DoctorDashboard
 * @property {Object} today
 * @property {number} today.appointments_count
 * @property {number} today.completed_count
 * @property {AppointmentSummary[]} today.upcoming
 * @property {Object} week
 * @property {number} week.appointments_count
 * @property {number} week.revenue
 * @property {number} pending_reports
 * @property {number} unread_messages
 * @property {number} pending_teleexpertise
 */

/**
 * @typedef {Object} AdminDashboard
 * @property {Object} users
 * @property {number} users.total
 * @property {number} users.patients
 * @property {number} users.doctors
 * @property {number} users.specialists
 * @property {number} users.health_professionals
 * @property {Object} consultations
 * @property {number} consultations.today
 * @property {number} consultations.this_week
 * @property {number} consultations.this_month
 * @property {number} pending_verifications
 * @property {Object} revenue
 * @property {number} revenue.today
 * @property {number} revenue.this_week
 * @property {number} revenue.this_month
 */

// ══════════════════════════════════════════════════════════════════════════════
// SPÉCIALITÉS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Specialty
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 */

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} LoginRequest
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResponse
 * @property {User} user
 * @property {string} token
 * @property {boolean} requires_two_factor
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} password
 * @property {string} password_confirmation
 * @property {string} [phone]
 * @property {Gender} [gender]
 * @property {string} [birth_date]
 * @property {UserRole} role
 */

/**
 * @typedef {Object} CreateAppointmentRequest
 * @property {number} doctor_id
 * @property {string} scheduled_at - ISO 8601
 * @property {AppointmentType} type
 * @property {string} reason
 * @property {string} [notes]
 * @property {number} [patient_id] - Pour health_professional seulement
 */

/**
 * @typedef {Object} CreateReportRequest
 * @property {string} motif
 * @property {string} anamnese
 * @property {string} [examen_clinique]
 * @property {string} diagnostic
 * @property {string} conduite_a_tenir
 * @property {string} [prescriptions_summary]
 * @property {Orientation} [orientation]
 * @property {boolean} [next_appointment_recommended]
 * @property {number} [next_appointment_delay_days]
 */

/**
 * @typedef {Object} CreatePrescriptionRequest
 * @property {PrescriptionItem[]} items
 * @property {string} [notes]
 */

export {}
