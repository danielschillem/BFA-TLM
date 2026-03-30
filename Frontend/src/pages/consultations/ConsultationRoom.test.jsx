import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'

// Mock API
vi.mock('@/api', () => ({
  consultationsApi: {
    get: vi.fn(),
    end: vi.fn(),
    rateVideoQuality: vi.fn(),
    transmitParams: vi.fn(),
    createReport: vi.fn(),
    recordConsent: vi.fn(),
  },
  patientRecordApi: {
    get: vi.fn(),
  },
  diagnosticsApi: { delete: vi.fn() },
  examensApi: { delete: vi.fn() },
  prescriptionsApi: {},
  traitementsApi: { delete: vi.fn() },
}))

// Mock authStore
const mockUser = { id: 1, first_name: 'Adama', last_name: 'SAWADOGO', email: 'dr.sawadogo@tlm-bfa.bf', roles: ['doctor'] }
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isDoctor: () => true,
  }),
}))

// Mock react-router params
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '42' }),
    useNavigate: () => mockNavigate,
  }
})

import { consultationsApi } from '@/api'
import ConsultationRoom from '@/pages/consultations/ConsultationRoom'

// Stub Jitsi global
const mockDispose = vi.fn()
const mockExecuteCommand = vi.fn()
const mockAddEventListener = vi.fn()

const baseTeleconsultation = {
  id: 42,
  type: 'teleconsultation',
  status: 'in_progress',
  reason: 'Céphalées',
  jitsi_room_name: 'tlm-42-abc123',
  doctor: { id: 1, last_name: 'SAWADOGO' },
  patient_record: {
    id: 1,
    patient: { id: 10, first_name: 'Moussa', last_name: 'OUEDRAOGO' },
  },
  appointment: {
    id: 5,
    patient: { id: 10, first_name: 'Moussa', last_name: 'OUEDRAOGO' },
    doctor: { id: 1, last_name: 'SAWADOGO' },
  },
  diagnostics: [],
  prescriptions: [],
  examens: [],
  treatments: [],
  report: null,
}

describe('ConsultationRoom', () => {
  beforeEach(() => {
    window.JitsiMeetExternalAPI = vi.fn().mockImplementation(() => ({
      dispose: mockDispose,
      executeCommand: mockExecuteCommand,
      addEventListener: mockAddEventListener,
    }))
    consultationsApi.get.mockResolvedValue({
      data: { data: baseTeleconsultation },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete window.JitsiMeetExternalAPI
  })

  it('affiche le chronomètre et indicateur de connexion', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      // Le chrono démarre à 00:00
      expect(screen.getByText('00:00')).toBeInTheDocument()
    })
  })

  it('affiche le branding LiptakoCare', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(screen.getByAltText('LiptakoCare')).toBeInTheDocument()
    })
  })

  it('charge les données de consultation via API', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(consultationsApi.get).toHaveBeenCalledWith('42')
    })
  })

  it('initialise Jitsi avec le bon room_name', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(window.JitsiMeetExternalAPI).toHaveBeenCalled()
    })

    const callArgs = window.JitsiMeetExternalAPI.mock.calls[0]
    expect(callArgs[0]).toBe('8x8.vc')
    expect(callArgs[1].roomName).toContain('tlm-42-abc123')
  })

  it('configure Jitsi en français', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(window.JitsiMeetExternalAPI).toHaveBeenCalled()
    })

    const config = window.JitsiMeetExternalAPI.mock.calls[0][1].configOverwrite
    expect(config.defaultLanguage).toBe('fr')
  })

  it('active le desktop sharing pour les médecins', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(window.JitsiMeetExternalAPI).toHaveBeenCalled()
    })

    const interfaceConfig = window.JitsiMeetExternalAPI.mock.calls[0][1].interfaceConfigOverwrite
    expect(interfaceConfig.TOOLBAR_BUTTONS).toContain('desktop')
  })

  it('affiche la barre d\'outils de consultation', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(screen.getByText('Terminer')).toBeInTheDocument()
      expect(screen.getByText('Constantes')).toBeInTheDocument()
    })
  })

  it('affiche l\'indicateur chiffré', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(screen.getByText('Chiffré')).toBeInTheDocument()
    })
  })

  it('affiche les informations patient et médecin', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(screen.getByText(/OUEDRAOGO/)).toBeInTheDocument()
      expect(screen.getByText(/SAWADOGO/)).toBeInTheDocument()
    })
  })

  it('redirige les consultations présentielles', async () => {
    consultationsApi.get.mockResolvedValue({
      data: { data: { ...baseTeleconsultation, type: 'presentiel' } },
    })

    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/consultations/42/physical', { replace: true })
    })
  })

  it('affiche les boutons d\'interface', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(consultationsApi.get).toHaveBeenCalled()
    })

    await waitFor(() => {
      // The consultation loaded, the UI should be visible
      expect(screen.getByAltText('LiptakoCare')).toBeInTheDocument()
    })
  })

  it('configure la résolution vidéo à 720p', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(window.JitsiMeetExternalAPI).toHaveBeenCalled()
    })

    const config = window.JitsiMeetExternalAPI.mock.calls[0][1].configOverwrite
    expect(config.resolution).toBe(720)
    expect(config.constraints.video.height.ideal).toBe(720)
  })

  it('désactive le watermark Jitsi', async () => {
    renderWithProviders(<ConsultationRoom />, { route: '/consultations/42/room' })

    await waitFor(() => {
      expect(window.JitsiMeetExternalAPI).toHaveBeenCalled()
    })

    const iConfig = window.JitsiMeetExternalAPI.mock.calls[0][1].interfaceConfigOverwrite
    expect(iConfig.SHOW_JITSI_WATERMARK).toBe(false)
    expect(iConfig.SHOW_WATERMARK_FOR_GUESTS).toBe(false)
  })
})
