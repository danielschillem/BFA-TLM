import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import Login from '@/pages/auth/Login'

// Mock auth API
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

// Mock auth store
const mockSetAuth = vi.fn()
const mockSetTwoFactorPending = vi.fn()
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    setAuth: mockSetAuth,
    setTwoFactorPending: mockSetTwoFactorPending,
  }),
}))

import { authApi } from '@/api'

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le formulaire de connexion', () => {
    renderWithProviders(<Login />)

    expect(screen.getByText('Bon retour !')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('vous@exemple.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('affiche les liens inscription et mot de passe oublié', () => {
    renderWithProviders(<Login />)

    expect(screen.getByText(/créer un compte/i)).toBeInTheDocument()
    expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument()
  })

  it('affiche des erreurs de validation si le formulaire est soumis vide', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(screen.getByText(/email invalide/i)).toBeInTheDocument()
    })
  })

  it('appelle authApi.login avec les identifiants corrects', async () => {
    authApi.login.mockResolvedValueOnce({
      data: {
        data: {
          user: { id: 1, nom: 'Test', roles: ['doctor'] },
          token: 'fake-token-123',
        },
      },
    })

    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'dr.sawadogo@tlm-bfa.bf')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'dr.sawadogo@tlm-bfa.bf',
        password: 'password',
      })
    })
  })

  it('stocke le token et le user après connexion réussie', async () => {
    authApi.login.mockResolvedValueOnce({
      data: {
        data: {
          user: { id: 1, nom: 'SAWADOGO', roles: ['doctor'] },
          token: 'token-abc',
        },
      },
    })

    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pwd')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith({
        id: 1,
        nom: 'SAWADOGO',
        roles: ['doctor'],
      })
    })
  })

  it('redirige vers le formulaire 2FA si nécessaire', async () => {
    authApi.login.mockResolvedValueOnce({
      data: {
        requires_two_factor: true,
        message: 'Code envoyé',
        data: {
          user: { id: 42, roles: ['doctor'] },
          requires_two_factor: true,
          token: '2fa-pending-token',
        },
      },
    })

    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pwd')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(mockSetTwoFactorPending).toHaveBeenCalledWith(
        42,
        '2fa-pending-token',
      )
    })
  })

  it('affiche un message d\'erreur si la connexion échoue', async () => {
    const { toast } = await import('sonner')
    authApi.login.mockRejectedValueOnce({
      response: { data: { message: 'Identifiants invalides' } },
    })

    const user = userEvent.setup()
    renderWithProviders(<Login />)

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Identifiants invalides')
    })
  })

  it('bascule la visibilité du mot de passe', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)

    const pwdInput = screen.getByPlaceholderText('••••••••')
    expect(pwdInput).toHaveAttribute('type', 'password')

    // Click the eye toggle button
    const toggleBtn = pwdInput.parentElement.querySelector('button')
    await user.click(toggleBtn)

    expect(pwdInput).toHaveAttribute('type', 'text')
  })
})
