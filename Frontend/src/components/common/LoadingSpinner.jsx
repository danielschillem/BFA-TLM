import { cn } from "@/utils/cn";

export function Spinner({ size = "md", className }) {
  const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primary-200 border-t-primary-500",
        sizes[size],
        className,
      )}
    />
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-64 flex-col gap-4">
      <div className="relative">
        <Spinner size="lg" />
        <div className="absolute inset-0 rounded-full bg-primary-500/10" />
      </div>
      <p className="text-sm font-medium text-gray-500">Chargement…</p>
    </div>
  );
}

export function LoadingOverlay({ label = "Chargement…" }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 flex-col gap-4">
      <div className="relative">
        <Spinner size="lg" />
        <div className="absolute inset-0 rounded-full bg-primary-500/10" />
      </div>
      <p className="text-gray-700 font-semibold">{label}</p>
    </div>
  );
}
