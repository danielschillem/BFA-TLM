import { LiveKitRoom } from "@livekit/components-react";
import { VideoOff } from "lucide-react";

export default function ConsultationVideoShell({
  containerRef,
  hasSidebarOpen,
  tokenReady,
  livekitToken,
  livekitWsUrl,
  livekitFatalError,
  livekitRoomOptions,
  onConnected,
  onDisconnected,
  onError,
  onRetryUnavailable,
  VideoUiComponent,
  videoUiProps,
}) {
  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        width: hasSidebarOpen ? "calc(100% - 400px)" : "100%",
        height: "100%",
        transition: "width 0.3s",
      }}
    >
      {tokenReady && livekitToken && livekitWsUrl && !livekitFatalError ? (
        <LiveKitRoom
          serverUrl={livekitWsUrl}
          token={livekitToken}
          connect={true}
          audio={!!navigator.mediaDevices}
          video={!!navigator.mediaDevices}
          options={livekitRoomOptions}
          onConnected={onConnected}
          onDisconnected={onDisconnected}
          onError={onError}
          style={{ height: "100%", width: "100%" }}
        >
          <VideoUiComponent {...videoUiProps} />
        </LiveKitRoom>
      ) : tokenReady && (livekitFatalError || !livekitToken) ? (
        <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
          <VideoOff className="w-12 h-12 text-red-400" />
          <p className="text-lg font-semibold">
            {livekitFatalError
              ? "Erreur de connexion vidéo"
              : "Visioconférence non disponible"}
          </p>
          <p className="text-sm text-gray-400 text-center max-w-md">
            {livekitFatalError ||
              "Le serveur vidéo n'est pas configuré. Contactez l'administrateur."}
          </p>
          {livekitFatalError && (
            <button
              onClick={onRetryUnavailable}
              className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm"
            >
              Réessayer la connexion
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

