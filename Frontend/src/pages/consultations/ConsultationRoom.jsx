import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  FileText,
  Maximize2,
  Minimize2,
  WifiOff,
  Clock,
  Video,
  Activity,
  ClipboardList,
  X,
  AlertTriangle,
  Pill,
  Stethoscope,
  Star,
  MessageSquare,
  Shield,
  Share2,
  Plus,
  FlaskConical,
  Trash2,
  Check,
  Save,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  PhoneOff,
  Hand,
  Volume2,
  VolumeX,
  Settings,
  MoreVertical,
  PictureInPicture2,
  Users,
  Wifi,
  WifiLow,
  Signal,
  SignalLow,
  SignalZero,
  MonitorOff,
  Airplay,
  Copy,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  VideoPresets,
  ConnectionQuality,
} from "livekit-client";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useConnectionState,
  useRoomContext,
  useConnectionQualityIndicator,
  useIsSpeaking,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  consultationsApi,
  patientRecordApi,
  diagnosticsApi,
  examensApi,
  prescriptionsApi,
  traitementsApi,
} from "@/api";
import { useAuthStore } from "@/stores/authStore";
import { useConsultationChannel } from "@/hooks/useWebSocket";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input, { Textarea, Select } from "@/components/ui/Input";
import logoImg from "@/assets/logo.jpeg";

// ── Indicateur de qualité réseau ─────────────────────────────────────────────
function NetworkQualityBadge({ participant }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  const config = {
    [ConnectionQuality.Excellent]: {
      icon: Signal,
      color: "text-green-400",
      bg: "bg-green-500/20",
      label: "Excellent",
    },
    [ConnectionQuality.Good]: {
      icon: Signal,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      label: "Bon",
    },
    [ConnectionQuality.Poor]: {
      icon: SignalLow,
      color: "text-orange-400",
      bg: "bg-orange-500/20",
      label: "Faible",
    },
    [ConnectionQuality.Lost]: {
      icon: SignalZero,
      color: "text-red-400",
      bg: "bg-red-500/20",
      label: "Perdu",
    },
  };
  const c = config[quality] || config[ConnectionQuality.Good];
  const Icon = c.icon;
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bg}`}
      title={`Qualité réseau : ${c.label}`}
    >
      <Icon className={`w-3 h-3 ${c.color}`} />
      <span className={`text-[10px] font-medium ${c.color} hidden sm:inline`}>
        {c.label}
      </span>
    </div>
  );
}

// ── Indicateur de parole actif ───────────────────────────────────────────────
function SpeakingIndicator({ participant }) {
  const isSpeaking = useIsSpeaking(participant);
  if (!isSpeaking) return null;
  return (
    <div className="absolute inset-0 rounded-xl ring-[3px] ring-green-400 ring-opacity-80 pointer-events-none z-20 animate-pulse" />
  );
}

// ── Bouton de contrôle individualisé ─────────────────────────────────────────
function ControlButton({
  onClick,
  active,
  danger,
  accent,
  icon: Icon,
  label,
  badge,
  disabled,
  className = "",
}) {
  const base = danger
    ? "bg-red-500 hover:bg-red-600 text-white"
    : accent
      ? "bg-cyan-500 hover:bg-cyan-600 text-white ring-2 ring-cyan-300/40"
      : active === false
        ? "bg-red-500/90 hover:bg-red-600 text-white ring-2 ring-red-400/40"
        : "bg-white/10 hover:bg-white/20 text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 group ${className}`}
      title={label}
    >
      <div
        className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 ${base} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <Icon className="w-5 h-5" />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  );
}

// ── Composant interne LiveKit : affiche la vidéo + gère les événements ──────
function LiveKitVideoUI({
  setConnectionState,
  setParticipantCount,
  setOverlayDismissed,
}) {
  const room = useRoomContext();
  const lkConnectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.ScreenShareAudio, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Local state
  const [handRaised, setHandRaised] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const moreMenuRef = useRef(null);

  // ── Auto-hide controls after 4s of inactivity ──
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      4000,
    );
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimerRef.current);
  }, [resetControlsTimer]);

  // ── Close "more" menu on outside click ──
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoreMenu]);

  // ── Sync connection state ──
  useEffect(() => {
    if (lkConnectionState === ConnectionState.Connected) {
      setConnectionState("connected");
      setOverlayDismissed(true);
    } else if (lkConnectionState === ConnectionState.Reconnecting) {
      setConnectionState("poor");
    } else if (lkConnectionState === ConnectionState.Disconnected) {
      setConnectionState("disconnected");
    }
  }, [lkConnectionState, setConnectionState, setOverlayDismissed]);

  // ── Sync participant count ──
  useEffect(() => {
    setParticipantCount(remoteParticipants.length + (localParticipant ? 1 : 0));
  }, [remoteParticipants.length, localParticipant, setParticipantCount]);

  // ── Notify on participant join/leave ──
  useEffect(() => {
    if (!room) return;
    const onJoin = (p) =>
      toast.info(`${p.name || "Un participant"} a rejoint la salle`);
    const onLeave = (p) =>
      toast.info(`${p.name || "Un participant"} a quitté la salle`);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room]);

  // ── Track active-speaker highlight via data messages ──
  useEffect(() => {
    if (!room || !localParticipant) return;
    const onData = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "hand_raised") {
          toast.info(`${participant?.name || "Un participant"} lève la main`, {
            duration: 5000,
            icon: <Hand className="w-4 h-4 text-yellow-500" />,
          });
        }
      } catch {
        /* ignore non-JSON data */
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => room.off(RoomEvent.DataReceived, onData);
  }, [room, localParticipant]);

  // ── Toggle handlers ──
  const toggleMic = useCallback(async () => {
    try {
      await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
      if (isMicrophoneEnabled)
        toast("Micro coupé", {
          icon: <VolumeX className="w-4 h-4 text-red-400" />,
        });
    } catch {
      toast.error("Impossible d'accéder au microphone");
    }
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant?.setCameraEnabled(!isCameraEnabled);
    } catch {
      toast.error("Impossible d'accéder à la caméra");
    }
  }, [localParticipant, isCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    try {
      await localParticipant?.setScreenShareEnabled(!isScreenShareEnabled, {
        audio: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include",
      });
    } catch (e) {
      if (e?.name !== "NotAllowedError") {
        toast.error("Impossible de partager l'écran");
      }
    }
  }, [localParticipant, isScreenShareEnabled]);

  const toggleHandRaise = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    if (next && room) {
      const data = new TextEncoder().encode(
        JSON.stringify({ type: "hand_raised" }),
      );
      room.localParticipant.publishData(data, { reliable: true });
      toast("Main levée", {
        duration: 2000,
        icon: <Hand className="w-4 h-4 text-yellow-500" />,
      });
    } else {
      toast("Main baissée", {
        duration: 2000,
        icon: <Hand className="w-4 h-4 text-gray-400" />,
      });
    }
  }, [handRaised, room]);

  // ── Picture-in-Picture ──
  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else if (remoteVideoRef.current) {
        // Find the actual <video> element inside the VideoTrack
        const videoEl =
          remoteVideoRef.current.tagName === "VIDEO"
            ? remoteVideoRef.current
            : remoteVideoRef.current.querySelector("video");
        if (videoEl) {
          await videoEl.requestPictureInPicture();
          setPipActive(true);
          videoEl.addEventListener(
            "leavepictureinpicture",
            () => setPipActive(false),
            { once: true },
          );
        } else {
          toast.error("Aucune vidéo disponible pour le PiP");
        }
      }
    } catch {
      toast.error("Picture-in-Picture non supporté");
    }
  }, []);

  // ── Copy room link ──
  const copyRoomLink = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Lien de la salle copié"))
      .catch(() => toast.error("Impossible de copier le lien"));
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;

      switch (e.key.toLowerCase()) {
        case "m":
          e.preventDefault();
          toggleMic();
          break;
        case "v":
          e.preventDefault();
          toggleCamera();
          break;
        case "s":
          if (e.ctrlKey || e.metaKey) return; // Don't override Ctrl+S
          e.preventDefault();
          toggleScreenShare();
          break;
        case "h":
          e.preventDefault();
          toggleHandRaise();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMic, toggleCamera, toggleScreenShare, toggleHandRaise]);

  // ── Track separation ──
  const screenShareTracks = tracks.filter(
    (t) => t.source === Track.Source.ScreenShare && t.publication?.track,
  );
  const remoteScreenShare = screenShareTracks.find(
    (t) => t.participant?.sid !== localParticipant?.sid,
  );
  const localScreenShare = screenShareTracks.find(
    (t) => t.participant?.sid === localParticipant?.sid,
  );
  const activeScreenShare = remoteScreenShare || localScreenShare;
  const isRemoteScreenShare = !!remoteScreenShare;

  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);
  const remoteCameraTrack = cameraTracks.find(
    (t) => t.participant?.sid !== localParticipant?.sid,
  );
  const localCameraTrack = cameraTracks.find(
    (t) => t.participant?.sid === localParticipant?.sid,
  );

  // ── Video tile wrapper with speaking indicator ──
  const VideoTile = ({ trackRef, mirror, className, children }) => (
    <div className={`relative ${className || ""}`}>
      {trackRef?.publication?.track ? (
        <VideoTrack
          trackRef={trackRef}
          className="h-full w-full object-cover"
          style={mirror ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center ring-4 ring-white/10">
              <span className="text-2xl sm:text-3xl text-white font-bold">
                {trackRef?.participant?.name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-1">
              {trackRef?.participant?.name || "Participant"}
            </span>
          </div>
        </div>
      )}
      {trackRef?.participant && (
        <SpeakingIndicator participant={trackRef.participant} />
      )}
      {children}
    </div>
  );

  // ── Name badge ──
  const NameBadge = ({ name, muted, className = "" }) => (
    <div
      className={`absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 ${className}`}
    >
      {muted && <MicOff className="w-3 h-3 text-red-400" />}
      <span className="text-[11px] text-white font-medium truncate max-w-[120px]">
        {name}
      </span>
    </div>
  );

  return (
    <div
      className="relative h-full w-full bg-gray-900 flex flex-col"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* ── Main video area ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {activeScreenShare ? (
          /* ═══ SCREEN SHARE LAYOUT ═══ */
          <>
            <div className="h-full w-full" ref={remoteVideoRef}>
              <VideoTrack
                trackRef={activeScreenShare}
                className="h-full w-full object-contain"
              />
            </div>
            {/* Screen share banner */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-cyan-600/90 backdrop-blur-md rounded-full px-4 py-1.5 shadow-lg">
              <Monitor className="w-4 h-4 text-white" />
              <span className="text-xs text-white font-medium">
                {isRemoteScreenShare
                  ? `${remoteScreenShare.participant?.name || "Participant"} présente`
                  : "Vous présentez"}
              </span>
              {!isRemoteScreenShare && (
                <button
                  onClick={toggleScreenShare}
                  className="ml-2 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold rounded-full transition"
                >
                  Arrêter
                </button>
              )}
            </div>

            {/* Side strip with camera thumbnails */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              {/* Remote camera */}
              {remoteCameraTrack && (
                <VideoTile
                  trackRef={remoteCameraTrack}
                  className="w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <NameBadge
                    name={remoteCameraTrack.participant?.name || "Participant"}
                    muted={!remoteCameraTrack.participant?.isMicrophoneEnabled}
                  />
                  {remoteCameraTrack.participant && (
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <NetworkQualityBadge
                        participant={remoteCameraTrack.participant}
                      />
                    </div>
                  )}
                </VideoTile>
              )}
              {/* Local camera */}
              <VideoTile
                trackRef={localCameraTrack}
                mirror
                className="w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
              >
                <NameBadge name="Vous" muted={!isMicrophoneEnabled} />
              </VideoTile>
            </div>
          </>
        ) : (
          /* ═══ NORMAL CAMERA LAYOUT ═══ */
          <>
            {/* Remote participant (main) */}
            <div className="h-full w-full relative" ref={remoteVideoRef}>
              {remoteCameraTrack?.publication?.track ? (
                <>
                  <VideoTrack
                    trackRef={remoteCameraTrack}
                    className="h-full w-full object-contain"
                  />
                  {remoteCameraTrack.participant && (
                    <SpeakingIndicator
                      participant={remoteCameraTrack.participant}
                    />
                  )}
                </>
              ) : remoteCameraTrack ? (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center ring-4 ring-white/10 shadow-2xl">
                      <span className="text-4xl text-white font-bold">
                        {remoteCameraTrack.participant?.name?.[0]?.toUpperCase() ||
                          "?"}
                      </span>
                    </div>
                    <span className="text-base text-gray-300 font-medium">
                      {remoteCameraTrack.participant?.name || "Participant"}
                    </span>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <VideoOff className="w-3.5 h-3.5" />
                      <span>Caméra désactivée</span>
                    </div>
                    {remoteCameraTrack.participant && (
                      <NetworkQualityBadge
                        participant={remoteCameraTrack.participant}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 gap-5">
                  <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center animate-pulse">
                    <Users className="w-10 h-10 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-300">
                      En attente de l'autre participant…
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Partagez le lien pour inviter quelqu'un
                    </p>
                  </div>
                  <button
                    onClick={copyRoomLink}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-gray-300 transition"
                  >
                    <Copy className="w-4 h-4" />
                    Copier le lien
                  </button>
                </div>
              )}

              {/* Name badge on main video */}
              {remoteCameraTrack?.publication?.track && (
                <NameBadge
                  name={remoteCameraTrack.participant?.name || "Participant"}
                  muted={!remoteCameraTrack.participant?.isMicrophoneEnabled}
                  className="bottom-4 left-4"
                />
              )}
              {/* Network quality on main video */}
              {remoteCameraTrack?.participant &&
                remoteCameraTrack.publication?.track && (
                  <div className="absolute top-4 right-4 z-10">
                    <NetworkQualityBadge
                      participant={remoteCameraTrack.participant}
                    />
                  </div>
                )}
            </div>

            {/* Local camera PiP (draggable feel) */}
            <div className="absolute bottom-20 right-4 z-10">
              <VideoTile
                trackRef={localCameraTrack}
                mirror
                className="w-40 h-28 sm:w-48 sm:h-36 rounded-xl overflow-hidden border border-white/15 shadow-2xl ring-1 ring-black/30 group"
              >
                <NameBadge name="Vous" muted={!isMicrophoneEnabled} />
                {localParticipant && (
                  <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <NetworkQualityBadge participant={localParticipant} />
                  </div>
                )}
              </VideoTile>
            </div>
          </>
        )}
      </div>

      {/* ── Remote audio tracks (hidden) ── */}
      {tracks
        .filter(
          (t) =>
            (t.source === Track.Source.Microphone ||
              t.source === Track.Source.ScreenShareAudio) &&
            t.participant?.sid !== localParticipant?.sid,
        )
        .map((t) =>
          t.publication?.track ? (
            <AudioTrack key={t.publication.trackSid} trackRef={t} />
          ) : null,
        )}

      {/* Hand raised indicator floating */}
      {handRaised && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
          <Hand className="w-4 h-4" />
          Vous avez levé la main
        </div>
      )}

      {/* ═══ CONTROL BAR ═══ */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
          controlsVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-4">
          <div className="flex items-end justify-center gap-1.5 sm:gap-3">
            {/* Mic */}
            <ControlButton
              onClick={toggleMic}
              active={isMicrophoneEnabled}
              icon={isMicrophoneEnabled ? Mic : MicOff}
              label={`Micro (M)${isMicrophoneEnabled ? "" : " — coupé"}`}
            />

            {/* Camera */}
            <ControlButton
              onClick={toggleCamera}
              active={isCameraEnabled}
              icon={isCameraEnabled ? Video : VideoOff}
              label={`Caméra (V)${isCameraEnabled ? "" : " — coupée"}`}
            />

            {/* Screen Share */}
            <ControlButton
              onClick={toggleScreenShare}
              accent={isScreenShareEnabled}
              icon={isScreenShareEnabled ? MonitorOff : Monitor}
              label={`${isScreenShareEnabled ? "Arrêter le partage" : "Partager l'écran"} (S)`}
            />

            {/* Divider */}
            <div className="w-px h-8 bg-white/20 mx-1 hidden sm:block" />

            {/* Hand raise */}
            <ControlButton
              onClick={toggleHandRaise}
              accent={handRaised}
              icon={Hand}
              label={`${handRaised ? "Baisser" : "Lever"} la main (H)`}
            />

            {/* PiP */}
            <ControlButton
              onClick={togglePiP}
              accent={pipActive}
              icon={PictureInPicture2}
              label="Picture-in-Picture"
              disabled={!document.pictureInPictureEnabled}
            />

            {/* More menu */}
            <div className="relative" ref={moreMenuRef}>
              <ControlButton
                onClick={() => setShowMoreMenu((v) => !v)}
                icon={MoreVertical}
                label="Plus d'options"
              />
              {showMoreMenu && (
                <div className="absolute bottom-full mb-3 right-0 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-bottom-2 z-50">
                  <button
                    onClick={() => {
                      copyRoomLink();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-200">
                      Copier le lien
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      togglePiP();
                      setShowMoreMenu(false);
                    }}
                    disabled={!document.pictureInPictureEnabled}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left disabled:opacity-40"
                  >
                    <PictureInPicture2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-200">
                      {pipActive ? "Quitter le PiP" : "Picture-in-Picture"}
                    </span>
                  </button>
                  <div className="border-t border-gray-700 my-1" />
                  <div className="px-4 py-2">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
                      Raccourcis clavier
                    </p>
                    <div className="space-y-1">
                      {[
                        ["M", "Micro"],
                        ["V", "Caméra"],
                        ["S", "Partage d'écran"],
                        ["H", "Lever la main"],
                      ].map(([key, action]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[11px] text-gray-400">
                            {action}
                          </span>
                          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">
                            {key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsultationRoom() {
  const { id } = useParams(); // consultation id
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDoctor } = useAuthStore();
  const videoContainerRef = useRef(null);

  // WebSocket: écouter les events temps réel de la consultation
  useConsultationChannel(id ? Number(id) : null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("connecting");
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const connectionStateRef = useRef("connecting");

  // LiveKit state
  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitWsUrl, setLivekitWsUrl] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [livekitFatalError, setLivekitFatalError] = useState(null);
  const livekitErrorCountRef = useRef(0);

  // Keep ref in sync for closures
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [showPatientRecord, setShowPatientRecord] = useState(false);
  const [showConsultForm, setShowConsultForm] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [participantCount, setParticipantCount] = useState(0);

  const [vitals, setVitals] = useState({
    weight: "",
    height: "",
    temperature: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    heart_rate: "",
    respiratory_rate: "",
    spo2: "",
    glycemia: "",
  });

  const vitalsMutation = useMutation({
    mutationFn: (data) => consultationsApi.transmitParams(id, data),
    onSuccess: () => {
      toast.success("Paramètres vitaux enregistrés");
      setShowVitals(false);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  // ── Consultation form state ─────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [reportForm, setReportForm] = useState({
    chief_complaint: "",
    history: "",
    examination: "",
    diagnosis: "",
    treatment_plan: "",
    notes: "",
    follow_up_instructions: "",
  });
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showPrescModal, setShowPrescModal] = useState(false);
  const [showTraitModal, setShowTraitModal] = useState(false);

  const invalidateConsultation = () =>
    queryClient.invalidateQueries({ queryKey: ["consultations", id] });

  const saveReportMutation = useMutation({
    mutationFn: () =>
      consultationsApi.createReport(id, {
        title: `Compte-rendu consultation #${id}`,
        content: [
          reportForm.chief_complaint && `Motif: ${reportForm.chief_complaint}`,
          reportForm.history && `Anamnèse: ${reportForm.history}`,
          reportForm.examination && `Examen: ${reportForm.examination}`,
          reportForm.diagnosis && `Diagnostic: ${reportForm.diagnosis}`,
          reportForm.treatment_plan &&
            `Conduite à tenir: ${reportForm.treatment_plan}`,
          reportForm.notes && `Notes: ${reportForm.notes}`,
          reportForm.follow_up_instructions &&
            `Suivi: ${reportForm.follow_up_instructions}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        follow_up_instructions: reportForm.follow_up_instructions || null,
        structured_data: {
          chief_complaint: reportForm.chief_complaint || null,
          history: reportForm.history || null,
          examination: reportForm.examination || null,
          diagnosis: reportForm.diagnosis || null,
          treatment_plan: reportForm.treatment_plan || null,
          notes: reportForm.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Rapport sauvegardé");
      invalidateConsultation();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const deleteDiagnostic = useMutation({
    mutationFn: (dId) => diagnosticsApi.delete(dId),
    onSuccess: () => {
      toast.success("Diagnostic supprimé");
      invalidateConsultation();
    },
  });
  const deleteExamen = useMutation({
    mutationFn: (eId) => examensApi.delete(eId),
    onSuccess: () => {
      toast.success("Examen supprimé");
      invalidateConsultation();
    },
  });
  const deleteTraitement = useMutation({
    mutationFn: (tId) => traitementsApi.delete(tId),
    onSuccess: () => {
      toast.success("Traitement supprimé");
      invalidateConsultation();
    },
  });

  const handleVitalsSubmit = (e) => {
    e.preventDefault();
    // Map frontend keys to backend column names
    const keyMap = {
      weight: "poids",
      height: "taille",
      temperature: "temperature",
      blood_pressure_systolic: "tension_systolique",
      blood_pressure_diastolic: "tension_diastolique",
      heart_rate: "frequence_cardiaque",
      respiratory_rate: "frequence_respiratoire",
      spo2: "saturation_o2",
      glycemia: "glycemie",
    };
    const payload = {};
    Object.entries(vitals).forEach(([k, v]) => {
      if (v !== "" && keyMap[k]) payload[keyMap[k]] = Number(v);
    });
    if (Object.keys(payload).length === 0) {
      toast.error("Saisissez au moins un paramètre");
      return;
    }
    vitalsMutation.mutate(payload);
  };

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["consultations", id],
    queryFn: () => consultationsApi.get(id).then((r) => r.data.data),
  });

  const patientId =
    consultation?.patient_record?.patient?.id ||
    consultation?.appointment?.patient?.id;
  const { data: patientRecord } = useQuery({
    queryKey: ["patient-record-sidebar", patientId],
    queryFn: () => patientRecordApi.get(patientId).then((r) => r.data.data),
    enabled: !!patientId && showPatientRecord,
  });

  const endMutation = useMutation({
    mutationFn: () => consultationsApi.end(id),
    onSuccess: () => {
      setShowEndConfirm(false);
      setShowConsultForm(false);
      setShowRating(true);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  // Pre-fill report from existing data
  useEffect(() => {
    if (!consultation) return;
    const report = consultation.report;
    if (report) {
      const s = report.structured_data ?? {};
      setReportForm({
        chief_complaint: s.chief_complaint ?? "",
        history: s.history ?? "",
        examination: s.examination ?? "",
        diagnosis: s.diagnosis ?? "",
        treatment_plan: s.treatment_plan ?? "",
        notes: s.notes ?? "",
        follow_up_instructions: report.follow_up_instructions ?? "",
      });
    } else {
      setReportForm((f) => ({
        ...f,
        chief_complaint: consultation.reason ?? "",
      }));
    }
  }, [consultation?.id, consultation?.report]);

  const ratingMutation = useMutation({
    mutationFn: (data) => consultationsApi.rateVideoQuality(id, data),
    onSuccess: () => toast.success("Merci pour votre retour !"),
    onError: () => {}, // non-bloquant
    onSettled: () => {
      navigate(isDoctor() ? `/consultations/${id}/report` : "/appointments");
    },
  });

  const handleRatingSubmit = () => {
    if (rating > 0) {
      ratingMutation.mutate({ rating, comment: ratingComment || undefined });
    } else {
      navigate(isDoctor() ? `/consultations/${id}/report` : "/appointments");
    }
  };

  // ── Chrono ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Récupérer le token LiveKit depuis le backend ───────────────────────────
  const fetchFreshToken = useCallback(async (consultationId) => {
    try {
      const res = await consultationsApi.getLivekitToken(consultationId);
      const token = res.data?.livekit_token || null;
      const wsUrl = res.data?.livekit_ws_url || null;
      return { token, wsUrl };
    } catch {
      return { token: null, wsUrl: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initToken() {
      // 1. Try token from navigation state first (quick start for doctor)
      const stateToken = location.state?.livekitToken;
      const stateWsUrl = location.state?.livekitWsUrl;
      if (stateToken && stateWsUrl) {
        setLivekitToken(stateToken);
        setLivekitWsUrl(stateWsUrl);
        setTokenReady(true);
        return;
      }

      // 2. Otherwise fetch fresh token from backend
      if (!consultation?.id) return;
      const { token, wsUrl } = await fetchFreshToken(consultation.id);
      if (cancelled) return;
      setLivekitToken(token);
      setLivekitWsUrl(wsUrl);
      setTokenReady(true);
      if (!token) {
        setOverlayDismissed(true);
        setConnectionState("disconnected");
      }
    }

    initToken();
    return () => {
      cancelled = true;
    };
  }, [consultation?.id, location.state, fetchFreshToken]);

  // Stable LiveKit room options (memoized to prevent re-renders from causing reconnection loops)
  const livekitRoomOptions = useMemo(
    () => ({
      reconnectPolicy: {
        maxRetries: 3,
        nextRetryDelayInMs: (context) =>
          context.retryCount < 3 ? context.retryCount * 1000 + 1000 : null,
      },
    }),
    [],
  );

  const fmt = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // ── Loading / Not found ────────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingPage />
      </div>
    );

  if (!consultation)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Consultation introuvable
      </div>
    );

  // Redirect physical consultations to dedicated page
  if (consultation.type === "presentiel") {
    navigate(`/consultations/${id}/physical`, { replace: true });
    return null;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`${isFullscreen ? "fixed inset-0 z-50" : "min-h-screen"} bg-gray-900 flex flex-col`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Branding */}
          <img
            src={logoImg}
            alt="LiptakoCare"
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="text-sm font-semibold text-white hidden md:inline">
            LiptakoCare
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
            <span className="text-xs font-mono">{fmt(duration)}</span>
          </div>
          {participantCount > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-1 text-gray-300">
                <Video className="w-3.5 h-3.5" />
                <span className="text-xs">
                  {participantCount} participant
                  {participantCount > 1 ? "s" : ""}
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
            onClick={() => setIsFullscreen((f) => !f)}
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

      {/* LiveKit video container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={videoContainerRef}
          className="absolute inset-0"
          style={{
            width:
              showPatientRecord || showConsultForm
                ? "calc(100% - 400px)"
                : "100%",
            height: "100%",
            transition: "width 0.3s",
          }}
        >
          {tokenReady && livekitToken && livekitWsUrl && !livekitFatalError ? (
            <LiveKitRoom
              serverUrl={livekitWsUrl}
              token={livekitToken}
              connect={true}
              audio={true}
              video={true}
              options={livekitRoomOptions}
              onConnected={() => {
                livekitErrorCountRef.current = 0;
                setConnectionState("connected");
                setOverlayDismissed(true);
              }}
              onDisconnected={() => setConnectionState("disconnected")}
              onError={(err) => {
                console.error("[LiveKit] Connection error:", err);
                livekitErrorCountRef.current += 1;
                if (livekitErrorCountRef.current === 1 && consultation?.id) {
                  // First failure: try refreshing token from backend (may fix stale/invalid token)
                  console.info("[LiveKit] Refreshing token from backend...");
                  fetchFreshToken(consultation.id).then(({ token, wsUrl }) => {
                    if (token && wsUrl) {
                      setLivekitToken(token);
                      setLivekitWsUrl(wsUrl);
                    }
                  });
                } else if (livekitErrorCountRef.current >= 3) {
                  // Stop trying — unmount LiveKitRoom entirely
                  setLivekitFatalError(
                    err?.message || "Impossible de se connecter à LiveKit",
                  );
                  setConnectionState("disconnected");
                  setOverlayDismissed(true);
                  toast.error("Connexion vidéo échouée — arrêt des tentatives");
                }
              }}
              style={{ height: "100%", width: "100%" }}
            >
              <LiveKitVideoUI
                setConnectionState={setConnectionState}
                setParticipantCount={setParticipantCount}
                setOverlayDismissed={setOverlayDismissed}
              />
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
                  onClick={async () => {
                    livekitErrorCountRef.current = 0;
                    setLivekitFatalError(null);
                    if (consultation?.id) {
                      const { token, wsUrl } = await fetchFreshToken(
                        consultation.id,
                      );
                      if (token && wsUrl) {
                        setLivekitToken(token);
                        setLivekitWsUrl(wsUrl);
                      }
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm"
                >
                  Réessayer la connexion
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Patient record sidebar */}
        {showPatientRecord && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" /> Dossier
                patient
              </h3>
              <button
                onClick={() => setShowPatientRecord(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!patientRecord ? (
              <div className="p-4 text-gray-400 text-sm text-center">
                Chargement…
              </div>
            ) : (
              <div className="p-3 space-y-4 text-sm">
                {/* Allergies */}
                <SidebarSection
                  title="Allergies"
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  items={patientRecord.allergies}
                  empty="Aucune allergie connue"
                  render={(a) => (
                    <div
                      key={a.id}
                      className="p-2 bg-red-900/20 rounded border border-red-900/30"
                    >
                      <span className="text-red-300 font-medium">
                        {a.allergen || a.allergenes}
                      </span>
                      {a.severity && (
                        <span className="ml-2 text-xs text-red-400">
                          {a.severity || a.severite}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Antécédents */}
                <SidebarSection
                  title="Antécédents"
                  icon={<Stethoscope className="w-3.5 h-3.5 text-yellow-400" />}
                  items={patientRecord.antecedents}
                  empty="Aucun antécédent"
                  render={(a) => (
                    <div key={a.id} className="p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-200">
                        {a.title || a.libelle}
                      </span>
                      {a.type && (
                        <span className="ml-2 text-xs text-gray-400">
                          {a.type}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Traitements en cours */}
                <SidebarSection
                  title="Traitements en cours"
                  icon={<Pill className="w-3.5 h-3.5 text-green-400" />}
                  items={patientRecord.prescriptions?.filter(
                    (p) => p.status === "en_cours" || p.statut === "en_cours",
                  )}
                  empty="Aucun traitement en cours"
                  render={(p) => (
                    <div
                      key={p.id}
                      className="p-2 bg-green-900/20 rounded border border-green-900/30"
                    >
                      <span className="text-green-300">
                        {p.name || p.denomination}
                      </span>
                      {p.dosage && (
                        <span className="ml-2 text-xs text-green-400">
                          {p.dosage}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Constantes récentes */}
                {patientRecord.constantes?.length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />{" "}
                      Dernières constantes
                    </h4>
                    {(() => {
                      const last = patientRecord.constantes[0];
                      return (
                        <div className="grid grid-cols-2 gap-1.5">
                          {last.poids && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">Poids</p>
                              <p className="text-white font-mono">
                                {last.poids} kg
                              </p>
                            </div>
                          )}
                          {last.taille && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">Taille</p>
                              <p className="text-white font-mono">
                                {last.taille} cm
                              </p>
                            </div>
                          )}
                          {last.tension_systolique && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">TA</p>
                              <p className="text-white font-mono">
                                {last.tension_systolique}/
                                {last.tension_diastolique}
                              </p>
                            </div>
                          )}
                          {last.frequence_cardiaque && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">FC</p>
                              <p className="text-white font-mono">
                                {last.frequence_cardiaque} bpm
                              </p>
                            </div>
                          )}
                          {last.temperature && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">T°</p>
                              <p className="text-white font-mono">
                                {last.temperature}°C
                              </p>
                            </div>
                          )}
                          {last.saturation_o2 && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">SpO2</p>
                              <p className="text-white font-mono">
                                {last.saturation_o2}%
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Lien vers dossier complet */}
                {patientId && (
                  <button
                    onClick={() =>
                      window.open(`/patients/${patientId}/record`, "_blank")
                    }
                    className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Voir le dossier complet{" "}
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Consultation form sidebar ── */}
        {showConsultForm && !showPatientRecord && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Formulaire de
                consultation
              </h3>
              <button
                onClick={() => setShowConsultForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {/* Report fields */}
              {[
                {
                  key: "chief_complaint",
                  label: "Motif de consultation",
                  rows: 2,
                },
                { key: "history", label: "Anamnèse / Historique", rows: 2 },
                { key: "examination", label: "Examen clinique", rows: 2 },
                { key: "diagnosis", label: "Diagnostic", rows: 2 },
                { key: "treatment_plan", label: "Plan thérapeutique", rows: 2 },
                {
                  key: "follow_up_instructions",
                  label: "Consignes de suivi",
                  rows: 1,
                },
                { key: "notes", label: "Notes", rows: 1 },
              ].map(({ key, label, rows }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {label}
                  </label>
                  <textarea
                    rows={rows}
                    value={reportForm[key]}
                    onChange={(e) =>
                      setReportForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
                    placeholder={`${label}…`}
                  />
                </div>
              ))}

              {/* Save report button */}
              <button
                onClick={() => saveReportMutation.mutate()}
                disabled={saveReportMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveReportMutation.isPending
                  ? "Sauvegarde…"
                  : "Sauvegarder le rapport"}
              </button>

              {/* Entités médicales — boutons d'ajout */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Entités médicales
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowDiagModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />{" "}
                    Diagnostic
                  </button>
                  <button
                    onClick={() => setShowExamModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-purple-400" />{" "}
                    Examen
                  </button>
                  <button
                    onClick={() => setShowPrescModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <Pill className="w-3.5 h-3.5 text-indigo-400" />{" "}
                    Prescription
                  </button>
                  <button
                    onClick={() => setShowTraitModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-teal-400" />{" "}
                    Traitement
                  </button>
                </div>
              </div>

              {/* Entités ajoutées */}
              {(consultation?.diagnostics?.length > 0 ||
                consultation?.examens?.length > 0 ||
                consultation?.prescriptions?.length > 0 ||
                consultation?.treatments?.length > 0) && (
                <div className="border-t border-gray-700 pt-3 space-y-3">
                  {/* Diagnostics */}
                  {consultation.diagnostics?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-cyan-400" />{" "}
                        Diagnostics ({consultation.diagnostics.length})
                      </p>
                      {consultation.diagnostics.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-200 truncate block">
                              {d.title || d.libelle}
                            </span>
                            {d.icd_code && (
                              <span className="text-[10px] text-cyan-400 font-mono">
                                {d.icd_code}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteDiagnostic.mutate(d.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Examens */}
                  {consultation.examens?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <FlaskConical className="w-3 h-3 text-purple-400" />{" "}
                        Examens ({consultation.examens.length})
                      </p>
                      {consultation.examens.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-200 truncate block">
                              {e.title || e.libelle}
                            </span>
                            {e.urgent && (
                              <span className="text-[10px] text-red-400">
                                Urgent
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteExamen.mutate(e.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prescriptions */}
                  {consultation.prescriptions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <Pill className="w-3 h-3 text-indigo-400" />{" "}
                        Prescriptions ({consultation.prescriptions.length})
                      </p>
                      {consultation.prescriptions.map((p) => (
                        <div
                          key={p.id}
                          className="p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <span className="text-xs text-gray-200">
                            {p.name || p.denomination}
                          </span>
                          {p.dosage && (
                            <span className="text-[10px] text-gray-400 ml-1">
                              {p.dosage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Traitements */}
                  {consultation.treatments?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <ClipboardList className="w-3 h-3 text-teal-400" />{" "}
                        Traitements ({consultation.treatments.length})
                      </p>
                      {consultation.treatments.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <span className="text-xs text-gray-200">
                            {t.type} {t.medications ? `— ${t.medications}` : ""}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteTraitement.mutate(t.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lien vers rapport complet */}
              <button
                onClick={() =>
                  window.open(`/consultations/${id}/report`, "_blank")
                }
                className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline pt-2"
              >
                Ouvrir le rapport complet{" "}
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {connectionState === "connecting" && !overlayDismissed && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6 z-10 transition-opacity duration-700">
            <img
              src={logoImg}
              alt="LiptakoCare"
              className="h-16 w-16 rounded-2xl object-cover mb-2"
            />
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Video className="w-8 h-8 text-primary-400 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-semibold text-lg">
                Connexion en cours…
              </p>
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

        {connectionState === "disconnected" && overlayDismissed && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-semibold text-lg">
                Connexion perdue
              </p>
              <p className="text-gray-400 text-sm">
                Vérifiez votre connexion internet et réessayez
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10"
            >
              Reconnecter
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
        <div className="text-xs text-gray-400 hidden sm:block">
          {consultation.patient_record?.patient?.first_name ??
            consultation.appointment?.patient?.first_name}{" "}
          {consultation.patient_record?.patient?.last_name ??
            consultation.appointment?.patient?.last_name}
          {" · Dr. "}
          {consultation.doctor?.last_name ??
            consultation.appointment?.doctor?.last_name}
        </div>

        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          {!showEndConfirm ? (
            <Button
              onClick={() => setShowEndConfirm(true)}
              variant="danger"
              size="sm"
              icon={Phone}
            >
              Terminer
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-700 rounded-xl p-2">
              <span className="text-white text-sm">
                Terminer la consultation ?
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => endMutation.mutate()}
                loading={endMutation.isPending}
              >
                Oui
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEndConfirm(false)}
                className="text-white border-gray-500"
              >
                Non
              </Button>
            </div>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => setShowVitals(true)}
              variant="secondary"
              size="sm"
              icon={Activity}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            >
              Constantes
            </Button>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => {
                setShowConsultForm((v) => !v);
                if (!showConsultForm) setShowPatientRecord(false);
              }}
              variant="secondary"
              size="sm"
              icon={FileText}
              className={`${showConsultForm ? "bg-cyan-700 border-cyan-600" : "bg-gray-700 border-gray-600"} text-white hover:bg-gray-600`}
            >
              Consultation
            </Button>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => {
                setShowPatientRecord((v) => !v);
                if (!showPatientRecord) setShowConsultForm(false);
              }}
              variant="secondary"
              size="sm"
              icon={ClipboardList}
              className={`${showPatientRecord ? "bg-cyan-700 border-cyan-600" : "bg-gray-700 border-gray-600"} text-white hover:bg-gray-600`}
            >
              Dossier
            </Button>
          )}
        </div>
      </div>

      {/* Vital signs modal */}
      <Modal
        open={showVitals}
        onClose={() => setShowVitals(false)}
        title="Paramètres vitaux"
      >
        <form onSubmit={handleVitalsSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Poids (kg)"
              type="number"
              step="0.1"
              value={vitals.weight}
              onChange={(e) =>
                setVitals((v) => ({ ...v, weight: e.target.value }))
              }
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={vitals.height}
              onChange={(e) =>
                setVitals((v) => ({ ...v, height: e.target.value }))
              }
            />
            <Input
              label="Température (°C)"
              type="number"
              step="0.1"
              value={vitals.temperature}
              onChange={(e) =>
                setVitals((v) => ({ ...v, temperature: e.target.value }))
              }
            />
            <Input
              label="Fréq. cardiaque"
              type="number"
              value={vitals.heart_rate}
              onChange={(e) =>
                setVitals((v) => ({ ...v, heart_rate: e.target.value }))
              }
            />
            <Input
              label="TA systolique"
              type="number"
              value={vitals.blood_pressure_systolic}
              onChange={(e) =>
                setVitals((v) => ({
                  ...v,
                  blood_pressure_systolic: e.target.value,
                }))
              }
            />
            <Input
              label="TA diastolique"
              type="number"
              value={vitals.blood_pressure_diastolic}
              onChange={(e) =>
                setVitals((v) => ({
                  ...v,
                  blood_pressure_diastolic: e.target.value,
                }))
              }
            />
            <Input
              label="Fréq. respiratoire"
              type="number"
              value={vitals.respiratory_rate}
              onChange={(e) =>
                setVitals((v) => ({ ...v, respiratory_rate: e.target.value }))
              }
            />
            <Input
              label="SpO2 (%)"
              type="number"
              value={vitals.spo2}
              onChange={(e) =>
                setVitals((v) => ({ ...v, spo2: e.target.value }))
              }
            />
          </div>
          <Input
            label="Glycémie (g/L)"
            type="number"
            step="0.01"
            value={vitals.glycemia}
            onChange={(e) =>
              setVitals((v) => ({ ...v, glycemia: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowVitals(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={vitalsMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Video quality rating modal – shown after ending consultation */}
      <Modal
        open={showRating}
        onClose={handleRatingSubmit}
        title="Évaluation de la qualité vidéo"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Comment évaluez-vous la qualité de cette téléconsultation ?
          </p>
          {/* Star rating */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            {rating === 0 && "Sélectionnez une note"}
            {rating === 1 && "Très mauvaise"}
            {rating === 2 && "Mauvaise"}
            {rating === 3 && "Correcte"}
            {rating === 4 && "Bonne"}
            {rating === 5 && "Excellente"}
          </p>
          {/* Optional comment */}
          {rating > 0 && rating <= 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Décrivez le problème (optionnel)
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Coupures, image floue, décalage son…"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleRatingSubmit}>
              Passer
            </Button>
            <Button
              onClick={handleRatingSubmit}
              disabled={rating === 0}
              loading={ratingMutation.isPending}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Medical entity modals ── */}
      <DiagnosticFormModal
        open={showDiagModal}
        onClose={() => setShowDiagModal(false)}
        consultationId={id}
        onSuccess={invalidateConsultation}
      />
      <ExamenFormModal
        open={showExamModal}
        onClose={() => setShowExamModal(false)}
        consultationId={id}
        dossierPatientId={consultation?.dossier_patient_id}
        onSuccess={invalidateConsultation}
      />
      <PrescriptionFormModal
        open={showPrescModal}
        onClose={() => setShowPrescModal(false)}
        consultationId={id}
        onSuccess={invalidateConsultation}
      />
      <TraitementFormModal
        open={showTraitModal}
        onClose={() => setShowTraitModal(false)}
        consultationId={id}
        diagnostics={consultation?.diagnostics || []}
        onSuccess={invalidateConsultation}
      />
    </div>
  );
}

// ── Modal forms for medical entities ──────────────────────────────────────────
const DIAG_TYPE_OPTIONS = [
  { value: "principal", label: "Principal" },
  { value: "secondaire", label: "Secondaire" },
  { value: "differentiel", label: "Différentiel" },
];
const DIAG_SEVERITY_OPTIONS = [
  { value: "legere", label: "Légère" },
  { value: "moderee", label: "Modérée" },
  { value: "severe", label: "Sévère" },
  { value: "critique", label: "Critique" },
];
const DIAG_STATUS_OPTIONS = [
  { value: "presume", label: "Présumé" },
  { value: "confirme", label: "Confirmé" },
  { value: "infirme", label: "Infirmé" },
];

function DiagnosticFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({
    libelle: "",
    type: "principal",
    code_cim: "",
    gravite: "",
    statut: "presume",
    description: "",
  });
  useEffect(() => {
    if (open)
      setForm({
        libelle: "",
        type: "principal",
        code_cim: "",
        gravite: "",
        statut: "presume",
        description: "",
      });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) =>
      diagnosticsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => {
      toast.success("Diagnostic ajouté");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter un diagnostic"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Intitulé *"
            value={form.libelle}
            onChange={(e) => set("libelle", e.target.value)}
            placeholder="Ex: Paludisme à P. falciparum"
          />
        </div>
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          options={DIAG_TYPE_OPTIONS}
        />
        <Input
          label="Code CIM-10"
          value={form.code_cim}
          onChange={(e) => set("code_cim", e.target.value)}
          placeholder="Ex: B50.9"
        />
        <Select
          label="Gravité"
          value={form.gravite}
          onChange={(e) => set("gravite", e.target.value)}
          options={DIAG_SEVERITY_OPTIONS}
          placeholder="Sélectionner..."
        />
        <Select
          label="Statut"
          value={form.statut}
          onChange={(e) => set("statut", e.target.value)}
          options={DIAG_STATUS_OPTIONS}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}

function ExamenFormModal({
  open,
  onClose,
  consultationId,
  dossierPatientId,
  onSuccess,
}) {
  const [form, setForm] = useState({
    libelle: "",
    type: "",
    indication: "",
    urgent: false,
  });
  useEffect(() => {
    if (open) setForm({ libelle: "", type: "", indication: "", urgent: false });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) =>
      examensApi.create({
        ...data,
        consultation_id: consultationId,
        dossier_patient_id: dossierPatientId,
      }),
    onSuccess: () => {
      toast.success("Examen prescrit");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prescrire un examen"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Prescrire
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Intitulé *"
          value={form.libelle}
          onChange={(e) => set("libelle", e.target.value)}
          placeholder="NFS, Goutte épaisse, Radio thorax..."
        />
        <Input
          label="Type"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          placeholder="Biologie, Imagerie..."
        />
        <Textarea
          label="Indication"
          value={form.indication}
          onChange={(e) => set("indication", e.target.value)}
          rows={2}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) => set("urgent", e.target.checked)}
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  );
}

function PrescriptionFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({
    denomination: "",
    posologie: "",
    instructions: "",
    duree_jours: "",
    urgent: false,
  });
  useEffect(() => {
    if (open)
      setForm({
        denomination: "",
        posologie: "",
        instructions: "",
        duree_jours: "",
        urgent: false,
      });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) => prescriptionsApi.create(consultationId, data),
    onSuccess: () => {
      toast.success("Prescription ajoutée");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une prescription"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Dénomination *"
            value={form.denomination}
            onChange={(e) => set("denomination", e.target.value)}
            placeholder="Paracétamol 500mg"
          />
        </div>
        <Input
          label="Posologie"
          value={form.posologie}
          onChange={(e) => set("posologie", e.target.value)}
          placeholder="3x/jour après repas"
        />
        <Input
          label="Durée (jours)"
          type="number"
          value={form.duree_jours}
          onChange={(e) => set("duree_jours", e.target.value)}
          placeholder="7"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Instructions"
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            rows={2}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) => set("urgent", e.target.checked)}
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  );
}

const TRAIT_TYPE_OPTIONS = [
  { value: "medicamenteux", label: "Médicamenteux" },
  { value: "chirurgical", label: "Chirurgical" },
  { value: "physiotherapie", label: "Physiothérapie" },
  { value: "autre", label: "Autre" },
];

function TraitementFormModal({
  open,
  onClose,
  consultationId,
  diagnostics,
  onSuccess,
}) {
  const [form, setForm] = useState({
    type: "medicamenteux",
    medicaments: "",
    dosages: "",
    posologies: "",
    duree: "",
    diagnostic_id: "",
  });
  useEffect(() => {
    if (open)
      setForm({
        type: "medicamenteux",
        medicaments: "",
        dosages: "",
        posologies: "",
        duree: "",
        diagnostic_id: diagnostics?.[0]?.id || "",
      });
  }, [open, diagnostics]);
  const mutation = useMutation({
    mutationFn: (data) =>
      traitementsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => {
      toast.success("Traitement ajouté");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const diagOptions = (diagnostics || []).map((d) => ({
    value: String(d.id),
    label: d.title || d.libelle,
  }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter un traitement"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Type *"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          options={TRAIT_TYPE_OPTIONS}
        />
        {diagOptions.length > 0 ? (
          <Select
            label="Diagnostic associé"
            value={form.diagnostic_id}
            onChange={(e) => set("diagnostic_id", e.target.value)}
            options={diagOptions}
          />
        ) : (
          <div className="flex items-center text-sm text-amber-600">
            <AlertTriangle className="w-4 h-4 mr-1" /> Ajoutez d'abord un
            diagnostic
          </div>
        )}
        <Input
          label="Médicaments"
          value={form.medicaments}
          onChange={(e) => set("medicaments", e.target.value)}
          placeholder="Artéméther-luméfantrine"
        />
        <Input
          label="Dosages"
          value={form.dosages}
          onChange={(e) => set("dosages", e.target.value)}
          placeholder="80/480mg"
        />
        <Input
          label="Posologie"
          value={form.posologies}
          onChange={(e) => set("posologies", e.target.value)}
          placeholder="2 fois/jour"
        />
        <Input
          label="Durée"
          value={form.duree}
          onChange={(e) => set("duree", e.target.value)}
          placeholder="3 jours"
        />
      </div>
    </Modal>
  );
}

function SidebarSection({ title, icon, items, empty, render }) {
  if (!items || items.length === 0)
    return (
      <div>
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
          {icon} {title}
        </h4>
        <p className="text-gray-500 text-xs italic">{empty}</p>
      </div>
    );
  return (
    <div>
      <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
        {icon} {title} ({items.length})
      </h4>
      <div className="space-y-1.5">{items.slice(0, 5).map(render)}</div>
      {items.length > 5 && (
        <p className="text-xs text-gray-500 mt-1">
          +{items.length - 5} autres…
        </p>
      )}
    </div>
  );
}
