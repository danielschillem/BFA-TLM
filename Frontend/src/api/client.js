import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { mockClient } from './mockAdapter'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// Client Axios réel
const axiosClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 30000,
})

// Intercepteur : ajout du token Sanctum
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Intercepteur : gestion globale des erreurs
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status
    const url     = error.config?.url || ''

    // Ne pas rediriger sur 401 pour les routes d'auth publiques
    const isPublicAuth = /\/auth\/(login|register|password)/.test(url)

    if (status === 401 && !isPublicAuth) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('Accès refusé. Permissions insuffisantes.')
    } else if (status === 422) {
      // Les erreurs de validation sont gérées localement dans les formulaires
    } else if (status === 429) {
      toast.error('Trop de requêtes. Veuillez patienter quelques instants.')
    } else if (status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer.')
    } else if (!error.response) {
      toast.error('Impossible de joindre le serveur. Vérifiez votre connexion.')
    }

    return Promise.reject(error)
  }
)

// Exporter le client approprié selon l'environnement
export const apiClient = USE_MOCKS ? mockClient : axiosClient

export default apiClient
