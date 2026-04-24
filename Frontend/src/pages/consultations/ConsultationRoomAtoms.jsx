import { Signal, SignalLow, SignalZero } from "lucide-react";
import { ConnectionQuality } from "livekit-client";
import {
  useConnectionQualityIndicator,
  useIsSpeaking,
} from "@livekit/components-react";

export function NetworkQualityBadge({ participant }) {
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

export function SpeakingIndicator({ participant }) {
  const isSpeaking = useIsSpeaking(participant);
  if (!isSpeaking) return null;
  return (
    <div className="absolute inset-0 rounded-xl ring-[3px] ring-green-400 ring-opacity-80 pointer-events-none z-20 animate-pulse" />
  );
}

export function ControlButton({
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
        className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 ${base} ${
          disabled ? "opacity-40 cursor-not-allowed" : ""
        }`}
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

