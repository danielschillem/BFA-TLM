import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { getEcho, disconnectEcho } from "@/api/echo";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook principal pour la connexion WebSocket temps réel.
 * Souscrit aux canaux privés de l'utilisateur connecté
 * et dispatche les événements vers le store de notifications + React Query.
 *
 * À utiliser une seule fois dans le composant racine (App).
 */
export function useWebSocket() {
  const { user, token, isAuthenticated } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      disconnectEcho();
      return;
    }

    const echo = getEcho();
    if (!echo) return;

    // ── Canal privé utilisateur (notifications personnelles) ─────────
    const userChannel = echo.private(`App.Models.User.${user.id}`);

    userChannel
      .listen(".appointment.confirmed", (data) => {
        addNotification({
          id: `rdv-${data.id}-${Date.now()}`,
          type: "appointment_confirmed",
          title: "Rendez-vous confirmé",
          message: `Votre rendez-vous du ${data.date} à ${data.heure} a été confirmé.`,
          data,
          read: false,
          created_at: new Date().toISOString(),
        });
        toast.success("Rendez-vous confirmé", {
          description: `Le ${data.date} à ${data.heure}`,
        });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      })
      .listen(".consultation.started", (data) => {
        addNotification({
          id: `consult-start-${data.id}-${Date.now()}`,
          type: "consultation_started",
          title: "Consultation démarrée",
          message: "Une consultation a démarré. Rejoignez la salle.",
          data,
          read: false,
          created_at: new Date().toISOString(),
        });
        toast.info("Consultation démarrée", {
          description: "Cliquez pour rejoindre la salle",
        });
        queryClient.invalidateQueries({ queryKey: ["consultations"] });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      })
      .listen(".consultation.ended", (data) => {
        addNotification({
          id: `consult-end-${data.id}-${Date.now()}`,
          type: "consultation_ended",
          title: "Consultation terminée",
          message: "La consultation est terminée.",
          data,
          read: false,
          created_at: new Date().toISOString(),
        });
        toast.info("Consultation terminée");
        queryClient.invalidateQueries({ queryKey: ["consultations"] });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      })
      .listen(".prescription.signed", (data) => {
        addNotification({
          id: `presc-${data.id}-${Date.now()}`,
          type: "prescription_signed",
          title: "Ordonnance signée",
          message: `Nouvelle ordonnance : ${data.denomination}`,
          data,
          read: false,
          created_at: new Date().toISOString(),
        });
        toast.success("Ordonnance signée", {
          description: data.denomination,
        });
        queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      })
      .listen(".message.new", (data) => {
        addNotification({
          id: `msg-${data.id}-${Date.now()}`,
          type: "new_message",
          title: "Nouveau message",
          message: data.contenu?.substring(0, 80) || "Nouveau message reçu",
          data,
          read: false,
          created_at: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      });

    channelsRef.current = [userChannel];

    return () => {
      channelsRef.current.forEach((ch) => {
        if (ch?.subscription) ch.subscription.unsubscribe();
      });
      channelsRef.current = [];
    };
  }, [isAuthenticated, user?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook pour écouter un canal de consultation spécifique (pendant la vidéo).
 * @param {number|null} consultationId
 */
export function useConsultationChannel(consultationId) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !consultationId) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`consultation.${consultationId}`);

    channel
      .listen(".consultation.started", () => {
        queryClient.invalidateQueries({
          queryKey: ["consultation", consultationId],
        });
      })
      .listen(".consultation.ended", () => {
        toast.info("La consultation est terminée");
        queryClient.invalidateQueries({
          queryKey: ["consultation", consultationId],
        });
      })
      .listen(".prescription.signed", (data) => {
        toast.success(`Ordonnance signée : ${data.denomination}`);
        queryClient.invalidateQueries({
          queryKey: ["prescriptions", consultationId],
        });
      });

    return () => {
      echo.leave(`consultation.${consultationId}`);
    };
  }, [isAuthenticated, consultationId]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook pour écouter un canal de chat (messagerie temps réel entre 2 users).
 * @param {number|null} otherUserId
 * @param {Object} handlers - callbacks pour les événements
 * @param {function} handlers.onMessage - appelé à la réception d'un message
 * @param {function} handlers.onTyping - appelé quand l'autre user tape
 * @param {function} handlers.onRead - appelé quand nos messages sont lus
 */
export function useChatChannel(otherUserId, handlers = {}) {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user || !otherUserId) return;

    const ids = [user.id, otherUserId].sort((a, b) => a - b);
    const echo = getEcho();
    if (!echo) return;

    const channelName = `chat.${ids[0]}.${ids[1]}`;
    const channel = echo.private(channelName);
    channelRef.current = channel;

    // Nouveau message
    channel.listen(".message.new", (data) => {
      if (typeof handlers.onMessage === "function") {
        handlers.onMessage(data);
      }
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversation", otherUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    });

    // Indicateur de frappe (whisper)
    channel.listenForWhisper("typing", (data) => {
      if (data.user_id !== user.id && typeof handlers.onTyping === "function") {
        handlers.onTyping(data);
      }
    });

    // Messages lus
    channel.listen(".messages.read", (data) => {
      if (typeof handlers.onRead === "function") {
        handlers.onRead(data);
      }
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversation", otherUserId],
      });
    });

    return () => {
      echo.leave(channelName);
      channelRef.current = null;
    };
  }, [isAuthenticated, user?.id, otherUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction pour envoyer un whisper de frappe
  const sendTyping = (isTyping = true) => {
    if (channelRef.current) {
      channelRef.current.whisper("typing", {
        user_id: user?.id,
        is_typing: isTyping,
      });
    }
  };

  return { sendTyping };
}
