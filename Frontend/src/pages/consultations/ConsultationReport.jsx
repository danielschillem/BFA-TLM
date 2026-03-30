import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, FileText, Edit3, Check, Share2, Download, AlertCircle, Plus, Stethoscope, FlaskConical, Pill, ClipboardList, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { consultationsApi, diagnosticsApi, examensApi, prescriptionsApi, traitementsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { formatDateTime } from '@/utils/helpers'

export default function ConsultationReport() {
  const { id } = useParams() // consultation id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isDoctor } = useAuthStore()

  const [editing, setEditing] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false)
  const [showExamenModal, setShowExamenModal] = useState(false)
  const [editingExamen, setEditingExamen] = useState(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showTraitementModal, setShowTraitementModal] = useState(false)
  const [form, setForm] = useState({
    chief_complaint: '', history: '', examination: '', diagnosis: '',
    treatment_plan: '', notes: '', follow_up_instructions: '',
  })

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultations', id],
    queryFn: () => consultationsApi.get(id).then(r => r.data.data),
  })

  const report = consultation?.report
  const diagList = consultation?.diagnostics || []
  const examList = consultation?.examens || []
  const prescList = consultation?.prescriptions || []
  const traitList = consultation?.treatments || []

  const invalidateConsultation = () => queryClient.invalidateQueries({ queryKey: ['consultations', id] })

  const deleteDiagnostic = useMutation({ mutationFn: (dId) => diagnosticsApi.delete(dId), onSuccess: () => { toast.success('Diagnostic supprimé'); invalidateConsultation() } })
  const deleteExamen = useMutation({ mutationFn: (eId) => examensApi.delete(eId), onSuccess: () => { toast.success('Examen supprimé'); invalidateConsultation() } })
  const deleteTraitement = useMutation({ mutationFn: (tId) => traitementsApi.delete(tId), onSuccess: () => { toast.success('Traitement supprimé'); invalidateConsultation() } })

  const handleDownloadPdf = async () => {
    try {
      const res = await consultationsApi.downloadReportPdf(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-consultation-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Erreur lors du téléchargement') }
  }

  const handleDownloadPrescription = async () => {
    try {
      const res = await consultationsApi.downloadPrescriptionPdf(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `ordonnance-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Erreur lors du téléchargement') }
  }

  const buildReportPayload = () => ({
    title: `Compte-rendu consultation #${id}`,
    content: [
      form.chief_complaint && `Motif: ${form.chief_complaint}`,
      form.history && `Anamnèse: ${form.history}`,
      form.examination && `Examen: ${form.examination}`,
      form.diagnosis && `Diagnostic: ${form.diagnosis}`,
      form.treatment_plan && `Conduite à tenir: ${form.treatment_plan}`,
      form.notes && `Notes: ${form.notes}`,
      form.follow_up_instructions && `Suivi: ${form.follow_up_instructions}`,
    ].filter(Boolean).join('\n\n'),
    follow_up_instructions: form.follow_up_instructions || null,
    structured_data: {
      chief_complaint: form.chief_complaint || null,
      history: form.history || null,
      examination: form.examination || null,
      diagnosis: form.diagnosis || null,
      treatment_plan: form.treatment_plan || null,
      notes: form.notes || null,
    },
  })

  useEffect(() => {
    if (report) {
      const structured = report.structured_data ?? {}
      setForm({
        chief_complaint:       structured.chief_complaint ?? '',
        history:               structured.history ?? '',
        examination:           structured.examination ?? '',
        diagnosis:             structured.diagnosis ?? '',
        treatment_plan:        structured.treatment_plan ?? '',
        notes:                 structured.notes ?? '',
        follow_up_instructions: report.follow_up_instructions ?? '',
      })
    } else if (consultation && !report && isDoctor()) {
      // Pre-fill chief_complaint from consultation reason
      setForm(f => ({ ...f, chief_complaint: consultation.reason ?? '' }))
      setEditing(true)
    }
  }, [consultation, report])

  const saveMutation = useMutation({
    mutationFn: () => consultationsApi.createReport(id, buildReportPayload()),
    onSuccess: () => {
      toast.success('Rapport sauvegardé')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['consultations', id] })
    },
    onError: err => toast.error(err.response?.data?.message ?? 'Erreur lors de la sauvegarde'),
  })

  const signMutation = useMutation({
    mutationFn: () => consultationsApi.signReport(id),
    onSuccess: () => {
      toast.success('Rapport signé électroniquement !')
      setShowSignModal(false)
      queryClient.invalidateQueries({ queryKey: ['consultations', id] })
    },
    onError: err => toast.error(err.response?.data?.message ?? 'Erreur lors de la signature'),
  })

  const shareMutation = useMutation({
    mutationFn: () => consultationsApi.shareReport(id, { share_with: ['patient'] }),
    onSuccess: () => {
      toast.success('Rapport partagé avec le patient')
      setShowShareModal(false)
    },
    onError: err => toast.error(err.response?.data?.message ?? 'Erreur lors du partage'),
  })

  if (isLoading) return <AppLayout title="Compte-rendu"><LoadingPage /></AppLayout>
  if (!consultation) return <AppLayout title="Compte-rendu"><div className="text-center py-12 text-gray-400">Consultation introuvable</div></AppLayout>

  const FIELDS = [
    { key: 'chief_complaint',       label: 'Motif de consultation',         multiline: true,  rows: 2 },
    { key: 'history',               label: 'Anamnèse / Historique',         multiline: true,  rows: 3 },
    { key: 'examination',           label: 'Examen clinique',               multiline: true,  rows: 3 },
    { key: 'diagnosis',             label: 'Diagnostic',                    multiline: true,  rows: 2 },
    { key: 'treatment_plan',        label: 'Plan thérapeutique',            multiline: true,  rows: 3 },
    { key: 'follow_up_instructions',label: 'Consignes de suivi',            multiline: true,  rows: 2 },
    { key: 'notes',                 label: 'Notes complémentaires',         multiline: true,  rows: 2 },
  ]

  return (
    <AppLayout title="Compte-rendu de consultation">
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" /> Compte-rendu TLM_CR
              </h2>
              {consultation && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Consultation du {formatDateTime(consultation.started_at ?? consultation.created_at)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {report?.signed_at ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> Signé le {formatDateTime(report.signed_at)}
                </span>
              ) : isDoctor() && report && (
                <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-full px-3 py-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Non signé
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form / Display */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="section-title">Contenu du rapport</h3>
              {isDoctor() && report && !editing && !report.signed_at && (
                <Button onClick={() => setEditing(true)} variant="outline" size="sm" icon={Edit3}>
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {FIELDS.map(({ key, label, rows }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                {editing ? (
                  <textarea
                    rows={rows}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input-field w-full resize-y"
                    placeholder={`${label}…`}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 min-h-[2.5rem]">
                    {form[key] ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{form[key]}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Non renseigné</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {editing && (
              <div className="flex justify-end gap-2 pt-2">
                {report && <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>}
                <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} icon={Check}>
                  Sauvegarder
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions médecin */}
        {isDoctor() && report && (
          <div className="flex flex-wrap gap-3">
            {!report.signed_at && (
              <Button onClick={() => setShowSignModal(true)} icon={Check} className="flex-1">
                Signer le rapport
              </Button>
            )}
            {report.signed_at && (
              <Button onClick={() => setShowShareModal(true)} variant="outline" icon={Share2} className="flex-1">
                Partager avec le patient
              </Button>
            )}
            {report.signed_at && (
              <Button onClick={handleDownloadPdf} variant="outline" icon={Download} className="flex-1">
                Télécharger PDF
              </Button>
            )}
            {report.signed_at && prescList.length > 0 && (
              <Button onClick={handleDownloadPrescription} variant="outline" icon={Pill} className="flex-1">
                Ordonnance PDF
              </Button>
            )}
          </div>
        )}

        {/* ═══════════════ Entités médicales ═══════════════ */}
        {isDoctor() && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Entités médicales liées</h3>

            {/* Boutons d'ajout */}
            {(!report?.signed_at) && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={Stethoscope} onClick={() => setShowDiagnosticModal(true)}>Diagnostic</Button>
                <Button variant="outline" size="sm" icon={FlaskConical} onClick={() => setShowExamenModal(true)}>Examen</Button>
                <Button variant="outline" size="sm" icon={Pill} onClick={() => setShowPrescriptionModal(true)}>Prescription</Button>
                <Button variant="outline" size="sm" icon={ClipboardList} onClick={() => setShowTraitementModal(true)}>Traitement</Button>
              </div>
            )}

            {/* Diagnostics */}
            {diagList.length > 0 && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-cyan-600" /><h4 className="font-semibold text-sm">Diagnostics ({diagList.length})</h4></div></CardHeader>
                <CardContent className="space-y-2">
                  {diagList.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{d.title}</span>
                        {d.icd_code && <span className="ml-2 text-xs text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded font-mono">{d.icd_code}</span>}
                        {d.severity && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${d.severity === 'critique' || d.severity === 'severe' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.severity}</span>}
                      </div>
                      {!report?.signed_at && <button onClick={() => { if (window.confirm('Supprimer ?')) deleteDiagnostic.mutate(d.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Examens */}
            {examList.length > 0 && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-600" /><h4 className="font-semibold text-sm">Examens ({examList.length})</h4></div></CardHeader>
                <CardContent className="space-y-2">
                  {examList.map(e => (
                    <div key={e.id} className="p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{e.title}</span>
                          {e.urgent && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Urgent</span>}
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${e.status === 'prescrit' ? 'bg-gray-100 text-gray-600' : e.status === 'interprete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{e.status}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingExamen(e)} className="p-1 text-gray-400 hover:text-purple-600" title="Résultats"><Edit3 className="w-3.5 h-3.5" /></button>
                          {!report?.signed_at && <button onClick={() => { if (window.confirm('Supprimer ?')) deleteExamen.mutate(e.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      </div>
                      {e.results && (
                        <div className="mt-1 p-1.5 bg-green-50 rounded text-xs">
                          <span className="font-medium text-green-700">Résultats :</span> {e.results}
                        </div>
                      )}
                      {e.comment && <p className="text-xs text-gray-400 mt-0.5">{e.comment}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Prescriptions */}
            {prescList.length > 0 && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><Pill className="w-4 h-4 text-indigo-600" /><h4 className="font-semibold text-sm">Prescriptions ({prescList.length})</h4></div></CardHeader>
                <CardContent className="space-y-2">
                  {prescList.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.dosage && <span className="ml-2 text-xs text-gray-500">{p.dosage}</span>}
                        {p.duration_days && <span className="ml-2 text-xs text-gray-400">{p.duration_days}j</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Traitements */}
            {traitList.length > 0 && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-teal-600" /><h4 className="font-semibold text-sm">Traitements ({traitList.length})</h4></div></CardHeader>
                <CardContent className="space-y-2">
                  {traitList.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{t.type}</span>
                        {t.medications && <span className="ml-2 text-xs text-gray-500">{t.medications}</span>}
                        {t.status && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${t.status === 'en_cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>}
                      </div>
                      {!report?.signed_at && <button onClick={() => { if (window.confirm('Supprimer ?')) deleteTraitement.mutate(t.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Sign modal */}
      <Modal
        open={showSignModal}
        onClose={() => setShowSignModal(false)}
        title="Signer le rapport"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSignModal(false)}>Annuler</Button>
            <Button onClick={() => signMutation.mutate()} loading={signMutation.isPending} icon={Check}>
              Confirmer la signature
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          En signant ce rapport, vous certifiez l'exactitude des informations médicales.
          La signature est électronique et horodatée.
        </p>
      </Modal>

      {/* Share modal */}
      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Partager le rapport"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>Annuler</Button>
            <Button onClick={() => shareMutation.mutate()} loading={shareMutation.isPending} icon={Share2}>
              Partager
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Le rapport signé sera partagé avec le patient via son espace personnel.
          Il recevra une notification par email.
        </p>
      </Modal>

      {/* Diagnostic modal */}
      <DiagnosticFormModal open={showDiagnosticModal} onClose={() => setShowDiagnosticModal(false)} consultationId={id} onSuccess={invalidateConsultation} />
      <ExamenFormModal open={showExamenModal} onClose={() => setShowExamenModal(false)} consultationId={id} dossierPatientId={consultation?.dossier_patient_id} onSuccess={invalidateConsultation} />
      <PrescriptionFormModal open={showPrescriptionModal} onClose={() => setShowPrescriptionModal(false)} consultationId={id} onSuccess={invalidateConsultation} />
      <TraitementFormModal open={showTraitementModal} onClose={() => setShowTraitementModal(false)} consultationId={id} diagnostics={diagList} onSuccess={invalidateConsultation} />
      <ExamenResultModal examen={editingExamen} onClose={() => setEditingExamen(null)} onSuccess={invalidateConsultation} />
    </AppLayout>
  )
}

// ── Modal: Diagnostic ─────────────────────────────────────────────────────────
const DIAG_TYPE_OPTIONS = [
  { value: 'principal', label: 'Principal' },
  { value: 'secondaire', label: 'Secondaire' },
  { value: 'differentiel', label: 'Différentiel' },
]
const DIAG_SEVERITY_OPTIONS = [
  { value: 'legere', label: 'Légère' },
  { value: 'moderee', label: 'Modérée' },
  { value: 'severe', label: 'Sévère' },
  { value: 'critique', label: 'Critique' },
]
const DIAG_STATUS_OPTIONS = [
  { value: 'presume', label: 'Présumé' },
  { value: 'confirme', label: 'Confirmé' },
  { value: 'infirme', label: 'Infirmé' },
]

function DiagnosticFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({ libelle: '', type: 'principal', code_cim: '', gravite: '', statut: 'presume', description: '' })
  useEffect(() => { if (open) setForm({ libelle: '', type: 'principal', code_cim: '', gravite: '', statut: 'presume', description: '' }) }, [open])

  const mutation = useMutation({
    mutationFn: (data) => diagnosticsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => { toast.success('Diagnostic ajouté'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un diagnostic" size="lg" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input label="Intitulé *" value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Ex: Paludisme à P. falciparum" /></div>
        <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)} options={DIAG_TYPE_OPTIONS} />
        <Input label="Code CIM-10" value={form.code_cim} onChange={e => set('code_cim', e.target.value)} placeholder="Ex: B50.9" />
        <Select label="Gravité" value={form.gravite} onChange={e => set('gravite', e.target.value)} options={DIAG_SEVERITY_OPTIONS} placeholder="Sélectionner..." />
        <Select label="Statut" value={form.statut} onChange={e => set('statut', e.target.value)} options={DIAG_STATUS_OPTIONS} />
        <div className="sm:col-span-2"><Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} /></div>
      </div>
    </Modal>
  )
}

// ── Modal: Examen ─────────────────────────────────────────────────────────────
function ExamenFormModal({ open, onClose, consultationId, dossierPatientId, onSuccess }) {
  const [form, setForm] = useState({ libelle: '', type: '', indication: '', urgent: false })
  useEffect(() => { if (open) setForm({ libelle: '', type: '', indication: '', urgent: false }) }, [open])

  const mutation = useMutation({
    mutationFn: (data) => examensApi.create({ ...data, consultation_id: consultationId, dossier_patient_id: dossierPatientId }),
    onSuccess: () => { toast.success('Examen prescrit'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de la prescription'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Prescrire un examen" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Prescrire</Button></>
    }>
      <div className="space-y-4">
        <Input label="Intitulé de l'examen *" value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Ex: NFS, Goutte épaisse, Radio thorax..." />
        <Input label="Type d'examen" value={form.type} onChange={e => set('type', e.target.value)} placeholder="Biologie, Imagerie, Fonctionnel..." />
        <Textarea label="Indication" value={form.indication} onChange={e => set('indication', e.target.value)} rows={2} placeholder="Raison de la prescription..." />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Modal: Prescription ───────────────────────────────────────────────────────
function PrescriptionFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({ denomination: '', posologie: '', instructions: '', duree_jours: '', urgent: false })
  useEffect(() => { if (open) setForm({ denomination: '', posologie: '', instructions: '', duree_jours: '', urgent: false }) }, [open])

  const mutation = useMutation({
    mutationFn: (data) => prescriptionsApi.create(consultationId, data),
    onSuccess: () => { toast.success('Prescription ajoutée'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une prescription" size="lg" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input label="Dénomination *" value={form.denomination} onChange={e => set('denomination', e.target.value)} placeholder="Ex: Paracétamol 500mg" /></div>
        <Input label="Posologie" value={form.posologie} onChange={e => set('posologie', e.target.value)} placeholder="3x/jour après repas" />
        <Input label="Durée (jours)" type="number" value={form.duree_jours} onChange={e => set('duree_jours', e.target.value)} placeholder="7" />
        <div className="sm:col-span-2"><Textarea label="Instructions" value={form.instructions} onChange={e => set('instructions', e.target.value)} rows={2} placeholder="Instructions particulières..." /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Modal: Traitement ─────────────────────────────────────────────────────────
const TRAIT_TYPE_OPTIONS = [
  { value: 'medicamenteux', label: 'Médicamenteux' },
  { value: 'chirurgical', label: 'Chirurgical' },
  { value: 'physiotherapie', label: 'Physiothérapie' },
  { value: 'autre', label: 'Autre' },
]

function TraitementFormModal({ open, onClose, consultationId, diagnostics, onSuccess }) {
  const [form, setForm] = useState({ type: 'medicamenteux', medicaments: '', dosages: '', posologies: '', duree: '', diagnostic_id: '' })
  useEffect(() => {
    if (open) setForm({ type: 'medicamenteux', medicaments: '', dosages: '', posologies: '', duree: '', diagnostic_id: diagnostics?.[0]?.id || '' })
  }, [open, diagnostics])

  const mutation = useMutation({
    mutationFn: (data) => traitementsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => { toast.success('Traitement ajouté'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const diagOptions = (diagnostics || []).map(d => ({ value: String(d.id), label: d.title || d.libelle }))

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un traitement" size="lg" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Type *" value={form.type} onChange={e => set('type', e.target.value)} options={TRAIT_TYPE_OPTIONS} />
        {diagOptions.length > 0 ? (
          <Select label="Diagnostic associé *" value={form.diagnostic_id} onChange={e => set('diagnostic_id', e.target.value)} options={diagOptions} />
        ) : (
          <div className="flex items-center text-sm text-amber-600"><AlertCircle className="w-4 h-4 mr-1" /> Ajoutez d'abord un diagnostic</div>
        )}
        <Input label="Médicaments" value={form.medicaments} onChange={e => set('medicaments', e.target.value)} placeholder="Artéméther-luméfantrine" />
        <Input label="Dosages" value={form.dosages} onChange={e => set('dosages', e.target.value)} placeholder="80/480mg" />
        <Input label="Posologie" value={form.posologies} onChange={e => set('posologies', e.target.value)} placeholder="2 fois/jour" />
        <Input label="Durée" value={form.duree} onChange={e => set('duree', e.target.value)} placeholder="3 jours" />
      </div>
    </Modal>
  )
}

// ── Modal: Résultats d'examen ─────────────────────────────────────────────────
const EXAMEN_STATUS_OPTIONS = [
  { value: 'prescrit', label: 'Prescrit' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'resultat_disponible', label: 'Résultat disponible' },
  { value: 'interprete', label: 'Interprété' },
]

function ExamenResultModal({ examen, onClose, onSuccess }) {
  const [form, setForm] = useState({ resultats: '', commentaire: '', statut: 'prescrit', date_examen: '', date_reception_resultat: '' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    if (examen) {
      setForm({
        resultats: examen.results || examen.resultats || '',
        commentaire: examen.comment || examen.commentaire || '',
        statut: examen.status || examen.statut || 'prescrit',
        date_examen: examen.date_examen || '',
        date_reception_resultat: examen.date_reception_resultat || '',
      })
    }
  }, [examen])

  const mutation = useMutation({
    mutationFn: (data) => examensApi.update(examen.id, data),
    onSuccess: () => { toast.success('Résultats mis à jour'); onSuccess?.(); onClose() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {}
    if (form.resultats) payload.resultats = form.resultats
    if (form.commentaire) payload.commentaire = form.commentaire
    if (form.statut) payload.statut = form.statut
    if (form.date_examen) payload.date_examen = form.date_examen
    if (form.date_reception_resultat) payload.date_reception_resultat = form.date_reception_resultat
    mutation.mutate(payload)
  }

  return (
    <Modal
      open={!!examen}
      onClose={onClose}
      title={`Résultats — ${examen?.title || 'Examen'}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending} icon={Check}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label="Statut" value={form.statut} onChange={e => set('statut', e.target.value)} options={EXAMEN_STATUS_OPTIONS} />
        <Textarea label="Résultats" value={form.resultats} onChange={e => set('resultats', e.target.value)} rows={4} placeholder="Saisir les résultats de l'examen…" />
        <Textarea label="Commentaire" value={form.commentaire} onChange={e => set('commentaire', e.target.value)} rows={2} placeholder="Commentaire du praticien…" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date de l'examen" type="date" value={form.date_examen} onChange={e => set('date_examen', e.target.value)} />
          <Input label="Date réception résultat" type="date" value={form.date_reception_resultat} onChange={e => set('date_reception_resultat', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
