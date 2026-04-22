import { X } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-6xl",
  };
  const panelRef = useRef(null);

  // Lock scroll when modal is open (with scrollbar width compensation)
  useScrollLock(open);

  // Close on click outside the panel
  useOnClickOutside(
    panelRef,
    useCallback(() => {
      if (open) onClose?.();
    }, [open, onClose]),
  );

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Focus trap — focus the panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full animate-slide-up ring-1 ring-black/5 outline-none",
          sizes[size],
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-base font-bold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
