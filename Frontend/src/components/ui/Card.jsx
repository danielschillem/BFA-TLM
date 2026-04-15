import { cn } from "@/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";

export function Card({ className, children, hover = false }) {
  return (
    <div
      className={cn(
        "bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-card",
        hover && "card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-100/80", className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return (
    <div
      className={cn(
        "px-6 py-3.5 border-t border-gray-100/80 bg-gray-50/40 rounded-b-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  color = "blue",
  className,
}) {
  const colors = {
    blue: {
      card: "from-blue-500 to-blue-600",
      iconBg: "bg-white/20",
      ring: "ring-blue-400/20",
    },
    green: {
      card: "from-emerald-500 to-emerald-600",
      iconBg: "bg-white/20",
      ring: "ring-emerald-400/20",
    },
    purple: {
      card: "from-purple-500 to-purple-600",
      iconBg: "bg-white/20",
      ring: "ring-purple-400/20",
    },
    orange: {
      card: "from-amber-500 to-orange-500",
      iconBg: "bg-white/20",
      ring: "ring-amber-400/20",
    },
    red: {
      card: "from-rose-500 to-red-500",
      iconBg: "bg-white/20",
      ring: "ring-rose-400/20",
    },
    teal: {
      card: "from-teal-500 to-teal-600",
      iconBg: "bg-white/20",
      ring: "ring-teal-400/20",
    },
    cyan: {
      card: "from-cyan-500 to-cyan-600",
      iconBg: "bg-white/20",
      ring: "ring-cyan-400/20",
    },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ring-1 card-hover",
        c.card,
        c.ring,
        className,
      )}
    >
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
          <p className="text-3xl font-extrabold tracking-tight">
            {value ?? "—"}
          </p>
          {delta !== undefined && (
            <p
              className={cn(
                "text-xs mt-1.5 font-semibold flex items-center gap-1",
                delta >= 0 ? "text-white/90" : "text-white/70",
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {delta >= 0 ? ` +${delta}` : ` ${delta}`} ce mois
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            c.iconBg,
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
