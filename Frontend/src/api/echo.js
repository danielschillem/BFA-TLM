import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useAuthStore } from '@/stores/authStore'

// Pusher est requis par Laravel Echo pour le protocole WebSocket Reverb
window.Pusher = Pusher

let echoInstance = null

/**
 * Initialise et retourne l'instance Laravel Echo (singleton).
 * Connexion au serveur Reverb via le protocole Pusher.
 */
export function getEcho() {
  if (echoInstance) return echoInstance

  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!key) {
    console.warn('[Echo] VITE_REVERB_APP_KEY non définie — WebSocket désactivé')
    return null
  }

  const token = useAuthStore.getState().token

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  })

  return echoInstance
}

/**
 * Déconnecte et réinitialise l'instance Echo.
 * À appeler lors du logout.
 */
export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

/**
 * Met à jour le token d'authentification dans l'instance Echo.
 * À appeler après un refresh token.
 */
export function updateEchoToken(newToken) {
  if (echoInstance) {
    echoInstance.connector.options.auth.headers.Authorization = `Bearer ${newToken}`
  }
}

export default getEcho
