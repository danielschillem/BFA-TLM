import { FileText, X } from "lucide-react";

export default function ConsultationFormSidebar({
  show,
  onClose,
  children,
}) {
  if (!show) return null;

  return (
    <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" /> Consultation
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

