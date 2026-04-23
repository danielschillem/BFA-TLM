import { cn } from "@/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";

export function Card({ className, children, hover = false }) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-card",
        hover && "hover:shadow-card-hover transition-shadow duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn("px-5 py-3.5 border-b border-gray-100", className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg",
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
      border: "border-l-blue-500",
      iconColor: "text-blue-500",
      bg: "bg-blue-50",
    },
    green: {
      border: "border-l-green-500",
      iconColor: "text-green-500",
      bg: "bg-green-50",
    },
    purple: {
      border: "border-l-purple-500",
      iconColor: "text-purple-500",
      bg: "bg-purple-50",
    },
    orange: {
      border: "border-l-amber-500",
      iconColor: "text-amber-500",
      bg: "bg-amber-50",
    },
    red: {
      border: "border-l-red-500",
      iconColor: "text-red-500",
      bg: "bg-red-50",
    },
    teal: {
      border: "border-l-teal-500",
      iconColor: "text-teal-500",
      bg: "bg-teal-50",
    },
    cyan: {
      border: "border-l-cyan-500",
      iconColor: "text-cyan-500",
      bg: "bg-cyan-50",
    },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 border-l-4 p-4",
        c.border,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value ?? "—"}</p>
          {delta !== undefined && (
            <p
              className={cn(
                "text-xs mt-1 font-medium flex items-center gap-1",
                delta >= 0 ? "text-green-600" : "text-red-500",
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
            "w-10 h-10 rounded-lg flex items-center justify-center",
            c.bg,
          )}
        >
          <Icon className={cn("w-5 h-5", c.iconColor)} />
        </div>
      </div>
    </div>
  );
}
