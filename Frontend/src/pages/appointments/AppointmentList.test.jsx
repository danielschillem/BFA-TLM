import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import AppointmentList from '@/pages/appointments/AppointmentList'

// Mock API
vi.mock('@/api', () => ({
  appointmentsApi: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isDoctor: () => true,
    isPatient: () => false,
  }),
}))

import { appointmentsApi } from '@/api'

const fakeAppointments = {
  data: {
    data: [
      {
        id: 1,
        reason: 'Consultation de suivi',
        doctor: { first_name: 'Ibrahim', last_name: 'SAWADOGO' },
        patient: { first_name: 'Aminata', last_name: 'KABORE', identifiant: 'BFA-210005115001022' },
        date: '2026-04-01',
        time: '10:00',
        status: 'confirmed',
        type: 'teleconsultation',
      },
      {
        id: 2,
        reason: 'Contrôle cardiaque',
        doctor: { first_name: 'Fatimata', last_name: 'COMPAORE' },
        patient: { first_name: 'Moussa', last_name: 'TRAORE', identifiant: 'BFA-210005115001023' },
        date: '2026-04-02',
        time: '14:30',
        status: 'pending',
        type: 'presentiel',
      },
    ],
    meta: { pagination: { total: 2, per_page: 10, current_page: 1, last_page: 1, from: 1, to: 2 } },
  },
}

describe('AppointmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appointmentsApi.list.mockResolvedValue(fakeAppointments)
  })

  it('affiche le titre et le bouton Nouveau', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText(/nouveau/i)).toBeInTheDocument()
    })
  })

  it('affiche les rendez-vous dans un tableau', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText('Consultation de suivi')).toBeInTheDocument()
      expect(screen.getByText('Contrôle cardiaque')).toBeInTheDocument()
    })
  })

  it('affiche les noms des patients', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText(/KABORE/)).toBeInTheDocument()
      expect(screen.getByText(/TRAORE/)).toBeInTheDocument()
    })
  })

  it('affiche les identifiants patients', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText('BFA-210005115001022')).toBeInTheDocument()
      expect(screen.getByText('BFA-210005115001023')).toBeInTheDocument()
    })
  })

  it('affiche les dates et heures', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('14:30')).toBeInTheDocument()
    })
  })

  it('filtre les résultats via la barre de recherche', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText('Consultation de suivi')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/rechercher/i)
    await user.type(searchInput, 'cardiaque')

    await waitFor(() => {
      expect(screen.queryByText('Consultation de suivi')).not.toBeInTheDocument()
      expect(screen.getByText('Contrôle cardiaque')).toBeInTheDocument()
    })
  })

  it('affiche un message quand la liste est vide', async () => {
    appointmentsApi.list.mockResolvedValueOnce({
      data: { data: [], meta: { pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1 } } },
    })

    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  it('affiche les boutons d\'action (Nouveau, Éditer, Supprimer)', async () => {
    renderWithProviders(<AppointmentList />)

    await waitFor(() => {
      expect(screen.getByText('Consultation de suivi')).toBeInTheDocument()
    })

    expect(screen.getByText('Nouveau')).toBeInTheDocument()
    expect(screen.getByText('Éditer')).toBeInTheDocument()
    expect(screen.getByText('Détails')).toBeInTheDocument()
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
    expect(screen.getByText('Exporter')).toBeInTheDocument()
    expect(screen.getByText('Imprimer')).toBeInTheDocument()
  })
})
