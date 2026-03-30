import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import BookAppointment from '@/pages/directory/BookAppointment'

// Mock APIs
vi.mock('@/api', () => ({
  directoryApi: {
    search: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getDoctor: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
  appointmentsApi: {
    create: vi.fn(),
  },
  patientsApi: {
    list: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  referentielsApi: {
    actes: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, libelle: 'Consultation générale', cout: 2000, duree_minutes: 30 },
          { id: 2, libelle: 'ECG', cout: 5000, duree_minutes: 20 },
        ],
      },
    }),
  },
}))

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isDoctor: () => true,
    isPatient: () => false,
  }),
}))

import { referentielsApi } from '@/api'

describe('BookAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    referentielsApi.actes.mockResolvedValue({
      data: {
        data: [
          { id: 1, libelle: 'Consultation générale', cout: 2000, duree_minutes: 30 },
          { id: 2, libelle: 'ECG', cout: 5000, duree_minutes: 20 },
        ],
      },
    })
  })

  it('affiche les 3 étapes du wizard', async () => {
    renderWithProviders(<BookAppointment />)

    expect(screen.getByText(/informations générales/i)).toBeInTheDocument()
    expect(screen.getByText(/récapitulatif/i)).toBeInTheDocument()
    expect(screen.getByText(/facturation/i)).toBeInTheDocument()
  })

  it('démarre sur l\'étape 1', async () => {
    renderWithProviders(<BookAppointment />)

    // Step 1 shows the motif input and date/time fields
    await waitFor(() => {
      expect(screen.getByText(/actes médicaux/i)).toBeInTheDocument()
    })
  })

  it('affiche la liste des actes médicaux', async () => {
    renderWithProviders(<BookAppointment />)

    await waitFor(() => {
      expect(screen.getByText(/consultation générale/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/ecg/i)).toBeInTheDocument()
  })

  it('affiche les prix des actes', async () => {
    renderWithProviders(<BookAppointment />)

    await waitFor(() => {
      expect(screen.getByText(/consultation générale/i)).toBeInTheDocument()
    })

    // Check that costs are displayed somewhere
    const body = document.body.textContent
    expect(body).toMatch(/2[\s\u202f.,]?000/)
    expect(body).toMatch(/5[\s\u202f.,]?000/)
  })

  it('affiche le type de consultation', async () => {
    renderWithProviders(<BookAppointment />)

    await waitFor(() => {
      const body = document.body.textContent.toLowerCase()
      expect(body).toContain('en ligne')
      expect(body).toContain('physique')
    })
  })

  it('affiche les champs de date et heure', async () => {
    renderWithProviders(<BookAppointment />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument()
      expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
    })
  })
})
