import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { consultationsApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { formatDateTime } from '@/utils/helpers'
import {
  ArrowLeft, FileText, Stethoscope, FlaskConical, Pill,
  ClipboardList, Activity, User, Calendar, AlertCircle,
  Weight, Ruler, Thermometer, Heart, Droplets, Check, Printer
} from 'lucide-react'

const STATUS_MAP = { en_cours: 'En cours', terminee: 'Terminée', planifiee: 'Planifiée', annulee: 'Annulée', completed: 'Terminée', in_progress: 'En cours', pending: 'Planifiée' }
const STATUS_COLORS = { terminee: 'bg-green-100 text-green-700', completed: 'bg-green-100 text-green-700', en_cours: 'bg-blue-100 text-blue-700', in_progress: 'bg-blue-100 text-blue-700', planifiee: 'bg-gray-100 text-gray-600', pending: 'bg-gray-100 text-gray-600' }

export default function ConsultationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: consultation, isLoading, error } = useQuery({
    queryKey: ['consultation-detail', id],
    queryFn: () => consultationsApi.get(id).then(r => r.data.data),
  })

  if (isLoading) return <AppLayout title="Consultation"><LoadingPage /></AppLayout>
  if (error || !consultation) return (
    <AppLayout title="Consultation">
      <EmptyState icon={AlertCircle} title="Consultation introuvable"
        action={<Button variant="primary" onClick={() => navigate(-1)}>Retour</Button>} />
    </AppLayout>
  )

  const report = consultation.report
  const structured = report?.structured_data || {}
  const diagnostics = consultation.diagnostics || []
  const prescriptions = consultation.prescriptions || []
  const examens = consultation.examens || []
  const treatments = consultation.treatments || []
  const patient = consultation.patient_record?.patient || consultation.appointment?.patient || {}

  return (
    <AppLayout title="Détail de la consultation">
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consultation #{id}</h1>
            <p className="text-sm text-gray-500">
              {consultation.started_at ? formatDateTime(consultation.started_at) : formatDateTime(consultation.created_at)}
              {' · '}
              {consultation.doctor?.full_name || 'Médecin'}
            </p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[consultation.status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_MAP[consultation.status] || consultation.status}
          </span>
        </div>

        {/* Infos générales */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-500">Patient</p><p className="font-semibold">{patient.full_name || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Médecin</p><p className="font-semibold">{consultation.doctor?.full_name || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Motif</p><p className="font-semibold">{consultation.reason || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Date</p><p className="font-semibold">{consultation.started_at ? formatDateTime(consultation.started_at) : '—'}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Compte-rendu */}
        {report && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                <h3 className="font-semibold">Compte-rendu</h3>
                {report.signed_at && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Signé
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'chief_complaint', label: 'Motif de consultation' },
                { key: 'history', label: 'Anamnèse' },
                { key: 'examination', label: 'Examen clinique' },
                { key: 'diagnosis', label: 'Diagnostic' },
                { key: 'treatment_plan', label: 'Plan thérapeutique' },
                { key: 'notes', label: 'Notes' },
              ].map(({ key, label }) => structured[key] && (
                <div key={key}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{structured[key]}</p>
                </div>
              ))}
              {report.follow_up_instructions && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Consignes de suivi</p>
                  <p className="text-sm text-amber-900 mt-0.5">{report.follow_up_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Diagnostics */}
        {diagnostics.length > 0 && (
          <Card>
            <CardHeader><div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-cyan-600" /><h3 className="font-semibold">Diagnostics ({diagnostics.length})</h3></div></CardHeader>
            <CardContent className="space-y-2">
              {diagnostics.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{d.title}</span>
                    {d.icd_code && <span className="ml-2 text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-mono">{d.icd_code}</span>}
                    {d.type && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full capitalize">{d.type}</span>}
                    {d.description && <p className="text-sm text-gray-500 mt-0.5">{d.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {d.severity && <span className={`text-xs px-2 py-0.5 rounded-full ${d.severity === 'severe' || d.severity === 'critique' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.severity}</span>}
                    {d.status && <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'confirme' ? 'bg-green-100 text-green-700' : d.status === 'infirme' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.status}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Prescriptions */}
        {prescriptions.length > 0 && (
          <Card>
            <CardHeader><div className="flex items-center gap-2"><Pill className="w-5 h-5 text-indigo-600" /><h3 className="font-semibold">Prescriptions ({prescriptions.length})</h3></div></CardHeader>
            <CardContent className="space-y-2">
              {prescriptions.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.dosage && <span className="text-sm text-gray-500 ml-2">{p.dosage}</span>}
                    {p.instructions && <p className="text-xs text-gray-400 mt-0.5">{p.instructions}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.duration_days && <span className="text-xs text-gray-500">{p.duration_days}j</span>}
                    {p.signed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Signée</span>}
                    {p.urgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Urgent</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Examens */}
        {examens.length > 0 && (
          <Card>
            <CardHeader><div className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-purple-600" /><h3 className="font-semibold">Examens ({examens.length})</h3></div></CardHeader>
            <CardContent className="space-y-2">
              {examens.map(e => (
                <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{e.title}</span>
                      {e.urgent && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Urgent</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'interprete' ? 'bg-green-100 text-green-700' : e.status === 'resultat_disponible' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                  </div>
                  {e.indication && <p className="text-sm text-gray-500 mt-1">{e.indication}</p>}
                  {e.results && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <span className="font-medium text-green-700">Résultats :</span> {e.results}
                    </div>
                  )}
                  {e.comment && <p className="text-xs text-gray-400 mt-1">{e.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Traitements */}
        {treatments.length > 0 && (
          <Card>
            <CardHeader><div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-teal-600" /><h3 className="font-semibold">Traitements ({treatments.length})</h3></div></CardHeader>
            <CardContent className="space-y-2">
              {treatments.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium capitalize">{t.type}</span>
                    {t.medications && <span className="text-sm text-gray-500 ml-2">{t.medications}</span>}
                    {t.dosages && <span className="text-xs text-gray-400 ml-2">{t.dosages}</span>}
                  </div>
                  {t.status && <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'en_cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" icon={Printer} onClick={() => window.print()}>Imprimer</Button>
          {consultation.status === 'completed' && report && !report.signed_at && (
            <Button icon={FileText} onClick={() => navigate(`/consultations/${id}/report`)}>Compléter le rapport</Button>
          )}
          {consultation.status === 'completed' && report?.signed_at && (
            <Button variant="outline" icon={FileText} onClick={() => navigate(`/consultations/${id}/report`)}>Voir le rapport</Button>
          )}
          {consultation.patient_record?.patient?.id && (
            <Button variant="outline" icon={User} onClick={() => navigate(`/patients/${consultation.patient_record.patient.id}/record`)}>Dossier patient</Button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
