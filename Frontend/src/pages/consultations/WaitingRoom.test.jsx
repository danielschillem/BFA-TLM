import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'

// Mock APIs
vi.mock('@/api', () => ({
  appointmentsApi: {
    get: vi.fn(),
    recordConsent: vi.fn(),
  },
  consultationsApi: {
    start: vi.fn(),
  },
}))

// Mock react-router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '5' }),
    useNavigate: () => mockNavigate,
  }
})

// Mock authStore — doctor by default
let mockIsDoctor = true
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, first_name: 'Adama', last_name: 'SAWADOGO', roles: ['doctor'] },
    isDoctor: () => mockIsDoctor,
  }),
}))

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn()
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
})

import { appointmentsApi, consultationsApi } from '@/api'
import WaitingRoom from '@/pages/consultations/WaitingRoom'

const teleconsultationApt = {
  id: 5,
  type: 'teleconsultation',
  statut: 'confirme',
  reason: 'Céphalées',
  date: '2026-03-26',
  time: '10:00',
  patient: { id: 10, first_name: 'Moussa', last_name: 'OUEDRAOGO', full_name: 'Moussa OUEDRAOGO' },
  doctor: { id: 1, first_name: 'Adama', last_name: 'SAWADOGO', full_name: 'Dr. SAWADOGO', specialty: 'Médecine générale' },
}

const presentielApt = {
  ...teleconsultationApt,
  type: 'presentiel',
}

describe('WaitingRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsDoctor = true
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    })
  })

  // ── Téléconsultation ──────────────────────────────────────────────────────

  describe('Téléconsultation', () => {
    beforeEach(() => {
      appointmentsApi.get.mockResolvedValue({
        data: { data: teleconsultationApt },
      })
    })

    it('affiche le titre salle d\'attente virtuelle', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: "Salle d'attente virtuelle", level: 2 })).toBeInTheDocument()
      })
    })

    it('affiche les vérifications techniques', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Vérification technique')).toBeInTheDocument()
        expect(screen.getByText('Caméra')).toBeInTheDocument()
        expect(screen.getByText('Microphone')).toBeInTheDocument()
        expect(screen.getByText('Connexion réseau')).toBeInTheDocument()
      })
    })

    it('vérifie caméra et micro via getUserMedia', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true, audio: true })
      })
    })

    it('affiche le bouton démarrer téléconsultation pour le médecin', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Démarrer la téléconsultation')).toBeInTheDocument()
      })
    })

    it('affiche l\'indicateur de sécurité', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText(/Transmission sécurisée/i)).toBeInTheDocument()
      })
    })

    it('affiche le nom du patient pour le médecin', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Moussa OUEDRAOGO')).toBeInTheDocument()
      })
    })

    it('navigue vers la salle vidéo après démarrage', async () => {
      consultationsApi.start.mockResolvedValue({
        data: { data: { id: 42 } },
      })

      const user = userEvent.setup()
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Démarrer la téléconsultation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Démarrer la téléconsultation'))

      await waitFor(() => {
        expect(consultationsApi.start).toHaveBeenCalledWith({ appointment_id: '5' })
        expect(mockNavigate).toHaveBeenCalledWith('/consultations/42/room')
      })
    })

    it('affiche le motif de consultation', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Céphalées')).toBeInTheDocument()
      })
    })
  })

  // ── Consultation physique ─────────────────────────────────────────────────

  describe('Consultation physique', () => {
    beforeEach(() => {
      appointmentsApi.get.mockResolvedValue({
        data: { data: presentielApt },
      })
    })

    it('affiche le titre consultation physique', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Consultation physique' })).toBeInTheDocument()
      })
    })

    it('n\'affiche pas les vérifications techniques', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Consultation physique' })).toBeInTheDocument()
      })

      expect(screen.queryByText('Vérification technique')).not.toBeInTheDocument()
    })

    it('ne demande pas getUserMedia', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Consultation physique' })).toBeInTheDocument()
      })

      expect(mockGetUserMedia).not.toHaveBeenCalled()
    })

    it('affiche le bouton démarrer la consultation', async () => {
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Démarrer la consultation')).toBeInTheDocument()
      })
    })

    it('navigue vers la page consultation physique après démarrage', async () => {
      consultationsApi.start.mockResolvedValue({
        data: { data: { id: 42 } },
      })

      const user = userEvent.setup()
      renderWithProviders(<WaitingRoom />, { route: '/waiting-room/5' })

      await waitFor(() => {
        expect(screen.getByText('Démarrer la consultation')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Démarrer la consultation'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/consultations/42/physical')
      })
    })
  })
})
