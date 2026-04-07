import { useState } from "react";
import { Shield, CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const CONSENT_ITEMS = [
  "J'accepte la réalisation de cette consultation à distance via la plateforme LiptakoCare TLM-BFA.",
  "Je comprends que mes données médicales seront traitées de manière confidentielle conformément à la réglementation en vigueur.",
  "J'ai été informé(e) que je peux interrompre la consultation à tout moment.",
  "Je consens au stockage sécurisé de mon dossier médical et des données issues de cette consultation.",
];

export default function ConsentModal({
  open,
  onClose,
  onAccept,
  loading,
  appointmentType,
}) {
  const [accepted, setAccepted] = useState([]);

  const toggleItem = (index) => {
    setAccepted((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const allAccepted = accepted.length === CONSENT_ITEMS.length;

  const handleAccept = () => {
    if (!allAccepted) return;
    onAccept({
      accepted: true,
      type:
        appointmentType === "teleconsultation"
          ? "teleconsultation"
          : "consultation",
      items_accepted: CONSENT_ITEMS,
      accepted_at: new Date().toISOString(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consentement patient"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            icon={Shield}
            onClick={handleAccept}
            disabled={!allAccepted}
            loading={loading}
          >
            Je donne mon consentement
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Conformément aux normes OMS et à la réglementation sur la
            télémédecine, votre consentement éclairé est requis avant toute
            consultation.
          </p>
        </div>

        <div className="space-y-3">
          {CONSENT_ITEMS.map((item, index) => (
            <label
              key={index}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                accepted.includes(index)
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                  accepted.includes(index)
                    ? "bg-primary-500"
                    : "border-2 border-gray-300"
                }`}
              >
                {accepted.includes(index) && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-sm text-gray-700">{item}</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={accepted.includes(index)}
                onChange={() => toggleItem(index)}
              />
            </label>
          ))}
        </div>

        {!allAccepted && (
          <p className="text-xs text-gray-400 text-center">
            Veuillez accepter tous les points pour continuer.
          </p>
        )}
      </div>
    </Modal>
  );
}
