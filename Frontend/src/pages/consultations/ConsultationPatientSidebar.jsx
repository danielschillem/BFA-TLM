import {
  Activity,
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Pill,
  Stethoscope,
  X,
} from "lucide-react";

function SidebarSection({ title, icon, items, empty, render }) {
  if (!items || items.length === 0) {
    return (
      <div>
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
          {icon} {title}
        </h4>
        <p className="text-gray-500 text-xs italic">{empty}</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
        {icon} {title} ({items.length})
      </h4>
      <div className="space-y-1.5">{items.slice(0, 5).map(render)}</div>
      {items.length > 5 && (
        <p className="text-xs text-gray-500 mt-1">+{items.length - 5} autres…</p>
      )}
    </div>
  );
}

export default function ConsultationPatientSidebar({
  show,
  onClose,
  patientRecord,
  patientId,
}) {
  if (!show) return null;

  return (
    <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-400" /> Dossier patient
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      {!patientRecord ? (
        <div className="p-4 text-gray-400 text-sm text-center">Chargement…</div>
      ) : (
        <div className="p-3 space-y-4 text-sm">
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
          <SidebarSection
            title="Antécédents"
            icon={<Stethoscope className="w-3.5 h-3.5 text-yellow-400" />}
            items={patientRecord.antecedents}
            empty="Aucun antécédent"
            render={(a) => (
              <div key={a.id} className="p-2 bg-gray-700/50 rounded">
                <span className="text-gray-200">{a.title || a.libelle}</span>
                {a.type && (
                  <span className="ml-2 text-xs text-gray-400">{a.type}</span>
                )}
              </div>
            )}
          />
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
                <span className="text-green-300">{p.name || p.denomination}</span>
                {p.dosage && (
                  <span className="ml-2 text-xs text-green-400">{p.dosage}</span>
                )}
              </div>
            )}
          />
          {patientRecord.constantes?.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-400" /> Dernières
                constantes
              </h4>
              {(() => {
                const last = patientRecord.constantes[0];
                return (
                  <div className="grid grid-cols-2 gap-1.5">
                    {last.poids && (
                      <div className="bg-gray-700/50 rounded p-1.5 text-center">
                        <p className="text-xs text-gray-400">Poids</p>
                        <p className="text-white font-mono">{last.poids} kg</p>
                      </div>
                    )}
                    {last.taille && (
                      <div className="bg-gray-700/50 rounded p-1.5 text-center">
                        <p className="text-xs text-gray-400">Taille</p>
                        <p className="text-white font-mono">{last.taille} cm</p>
                      </div>
                    )}
                    {last.tension_systolique && (
                      <div className="bg-gray-700/50 rounded p-1.5 text-center">
                        <p className="text-xs text-gray-400">TA</p>
                        <p className="text-white font-mono">
                          {last.tension_systolique}/{last.tension_diastolique}
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
          {patientId && (
            <button
              onClick={() => window.open(`/patients/${patientId}/record`, "_blank")}
              className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              Voir le dossier complet{" "}
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

