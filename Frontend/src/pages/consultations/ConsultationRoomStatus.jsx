import {
  AlertTriangle,
  Clock,
  Maximize2,
  Minimize2,
  Shield,
  Video,
  WifiOff,
} from "lucide-react";
import logoImg from "@/assets/logo.jpeg";

export function ConsultationRoomTopBar({
  connectionState,
  durationLabel,
  participantCount,
  isFullscreen,
  onToggleFullscreen,
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex-shrink-0">
      {!navigator.mediaDevices && (
        <div className="absolute top-0 left-0 right-0 bg-amber-600/90 text-white text-xs text-center py-1 z-50">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Caméra/micro désactivés — connexion HTTPS requise pour la
          visioconférence
        </div>
      )}
      <div className="flex items-center gap-3">
        <img
          src={logoImg}
          alt="BFA TLM"
          className="h-7 w-7 rounded-md object-cover"
        />
        <span className="text-sm font-semibold text-white hidden md:inline">
          BFA TLM
        </span>
        <span className="text-gray-600 hidden md:inline">|</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-400 animate-pulse"
                : connectionState === "poor"
                  ? "bg-orange-400 animate-pulse"
                  : connectionState === "disconnected"
                    ? "bg-red-400"
                    : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-xs text-gray-300">
            {connectionState === "connected"
              ? "Connecté"
              : connectionState === "poor"
                ? "Connexion instable"
                : connectionState === "disconnected"
                  ? "Déconnecté"
                  : "Connexion en cours…"}
          </span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1 text-gray-300">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">{durationLabel}</span>
        </div>
        {participantCount > 0 && (
          <>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1 text-gray-300">
              <Video className="w-3.5 h-3.5" />
              <span className="text-xs">
                {participantCount} participant{participantCount > 1 ? "s" : ""}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="items-center gap-1 text-gray-400 text-xs hidden lg:flex">
          <Shield className="w-3 h-3" />
          <span>Chiffré</span>
        </div>
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ConsultationConnectionOverlays({
  connectionState,
  overlayDismissed,
  livekitFatalError,
  autoReconnecting,
  reconnectAttempt,
  onRetryReconnect,
  onRecoverFatal,
}) {
  return (
    <>
      {connectionState === "connecting" && !overlayDismissed && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6 z-10 transition-opacity duration-700">
          <img
            src={logoImg}
            alt="BFA TLM"
            className="h-16 w-16 rounded-2xl object-cover mb-2"
          />
          <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
            <Video className="w-8 h-8 text-primary-400 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-white font-semibold text-lg">Connexion en cours…</p>
            <p className="text-gray-400 text-sm">
              Préparation de votre salle de téléconsultation sécurisée
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Communication chiffrée de bout en bout</span>
          </div>
        </div>
      )}

      {connectionState === "disconnected" &&
        overlayDismissed &&
        !livekitFatalError && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-amber-600/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-white animate-pulse" />
              <div>
                <p className="text-white font-medium text-sm">Connexion perdue</p>
                <p className="text-amber-100 text-xs">
                  {autoReconnecting
                    ? `Reconnexion automatique en cours… (tentative ${reconnectAttempt})`
                    : "La consultation n'est pas terminée — reconnexion en cours…"}
                </p>
              </div>
            </div>
            <button
              onClick={onRetryReconnect}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition"
            >
              Réessayer
            </button>
          </div>
        )}

      {connectionState === "disconnected" && overlayDismissed && livekitFatalError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6 z-20">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-white font-semibold text-lg">Connexion vidéo perdue</p>
            <p className="text-gray-400 text-sm">
              Les tentatives de reconnexion automatique ont échoué.
            </p>
            <p className="text-gray-500 text-xs">
              La consultation n'est pas terminée — le médecin peut toujours la
              terminer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRecoverFatal}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium"
            >
              Réessayer la connexion
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-white/20 hover:bg-white/10 text-white rounded-lg text-sm font-medium"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )}
    </>
  );
}

