import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { getEcho, disconnectEcho } from '@/api/echo'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Hook principal pour la connexion WebSocket temps réel.
 * Souscrit aux canaux privés de l'utilisateur connecté
 * et dispatche les événements vers le store de notifications + React Query.
 *
 * À utiliser une seule fois dans le composant racine (App).
 */
export function useWebSocket() {
  const { user, token, isAuthenticated } = useAuthStore()
  const addNotification = useUIStore((s) => s.addNotification)
  const queryClient = useQueryClient()
  const channelsRef = useRef([])

  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      disconnectEcho()
      return
    }

    const echo = getEcho()
    if (!echo) return

    // ── Canal privé utilisateur (notifications personnelles) ─────────
    const userChannel = echo.private(`App.Models.User.${user.id}`)

    userChannel
      .listen('.appointment.confirmed', (data) => {
        addNotification({
          id: `rdv-${data.id}-${Date.now()}`,
          type: 'appointment_confirmed',
          title: 'Rendez-vous confirmé',
          message: `Votre rendez-vous du ${data.date} à ${data.heure} a été confirmé.`,
          data,
          read: false,
          created_at: new Date().toISOString(),
        })
        toast.success('Rendez-vous confirmé', {
          description: `Le ${data.date} à ${data.heure}`,
        })
        queryClient.invalidateQueries({ queryKey: ['appointments'] })
      })
      .listen('.consultation.started', (data) => {
        addNotification({
          id: `consult-start-${data.id}-${Date.now()}`,
          type: 'consultation_started',
          title: 'Consultation démarrée',
          message: 'Une consultation a démarré. Rejoignez la salle.',
          data,
          read: false,
          created_at: new Date().toISOString(),
        })
        toast.info('Consultation démarrée', {
          description: 'Cliquez pour rejoindre la salle',
        })
        queryClient.invalidateQueries({ queryKey: ['consultations'] })
        queryClient.invalidateQueries({ queryKey: ['appointments'] })
      })
      .listen('.consultation.ended', (data) => {
        addNotification({
          id: `consult-end-${data.id}-${Date.now()}`,
          type: 'consultation_ended',
          title: 'Consultation terminée',
          message: 'La consultation est terminée.',
          data,
          read: false,
          created_at: new Date().toISOString(),
        })
        toast.info('Consultation terminée')
        queryClient.invalidateQueries({ queryKey: ['consultations'] })
        queryClient.invalidateQueries({ queryKey: ['appointments'] })
      })
      .listen('.prescription.signed', (data) => {
        addNotification({
          id: `presc-${data.id}-${Date.now()}`,
          type: 'prescription_signed',
          title: 'Ordonnance signée',
          message: `Nouvelle ordonnance : ${data.denomination}`,
          data,
          read: false,
          created_at: new Date().toISOString(),
        })
        toast.success('Ordonnance signée', {
          description: data.denomination,
        })
        queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      })
      .listen('.message.new', (data) => {
        addNotification({
          id: `msg-${data.id}-${Date.now()}`,
          type: 'new_message',
          title: 'Nouveau message',
          message: data.contenu?.substring(0, 80) || 'Nouveau message reçu',
          data,
          read: false,
          created_at: new Date().toISOString(),
        })
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      })

    channelsRef.current = [userChannel]

    return () => {
      channelsRef.current.forEach((ch) => {
        if (ch?.subscription) ch.subscription.unsubscribe()
      })
      channelsRef.current = []
    }
  }, [isAuthenticated, user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook pour écouter un canal de consultation spécifique (pendant la vidéo).
 * @param {number|null} consultationId
 */
export function useConsultationChannel(consultationId) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !consultationId) return

    const echo = getEcho()
    if (!echo) return

    const channel = echo.private(`consultation.${consultationId}`)

    channel
      .listen('.consultation.started', () => {
        queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })
      })
      .listen('.consultation.ended', () => {
        toast.info('La consultation est terminée')
        queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] })
      })
      .listen('.prescription.signed', (data) => {
        toast.success(`Ordonnance signée : ${data.denomination}`)
        queryClient.invalidateQueries({ queryKey: ['prescriptions', consultationId] })
      })

    return () => {
      echo.leave(`consultation.${consultationId}`)
    }
  }, [isAuthenticated, consultationId]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook pour écouter un canal de chat (messagerie temps réel entre 2 users).
 * @param {number|null} otherUserId
 * @param {function} onMessage - callback appelé à la réception d'un message
 */
export function useChatChannel(otherUserId, onMessage) {
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !user || !otherUserId) return

    const ids = [user.id, otherUserId].sort((a, b) => a - b)
    const echo = getEcho()
    if (!echo) return

    const channel = echo.private(`chat.${ids[0]}.${ids[1]}`)

    channel.listen('.message.new', (data) => {
      if (typeof onMessage === 'function') {
        onMessage(data)
      }
      queryClient.invalidateQueries({ queryKey: ['messages', otherUserId] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    })

    return () => {
      echo.leave(`chat.${ids[0]}.${ids[1]}`)
    }
  }, [isAuthenticated, user?.id, otherUserId]) // eslint-disable-line react-hooks/exhaustive-deps
}
