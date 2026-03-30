import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin, Clock, FileText, Activity, Stethoscope, User,
  Save, Check, ChevronLeft, AlertCircle, Plus, FlaskConical,
  Pill, ClipboardList, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { consultationsApi, diagnosticsApi, examensApi, prescriptionsApi, traitementsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { formatDateTime } from '@/utils/helpers'

export default function PhysicalConsultation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [activeSection, setActiveSection] = useState('notes')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showVitals, setShowVitals] = useState(false)
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false)
  const [showExamenModal, setShowExamenModal] = useState(false)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)

  // Notes cliniques
  const [notes, setNotes] = useState({
    chief_complaint: '', history: '', examination: '',
    diagnosis: '', treatment_plan: '', notes: '', follow_up_instructions: '',
  })
  const setNote = (k, v) => setNotes(prev => ({ ...prev, [k]: v }))

  // Constantes
  const [vitals, setVitals] = useState({
    weight: '', height: '', temperature: '',
    blood_pressure_systolic: '', blood_pressure_diastolic: '',
    heart_rate: '', respiratory_rate: '', spo2: '', glycemia: '',
  })

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation-physical', id],
    queryFn: () => consultationsApi.get(id).then(r => r.data.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['consultation-physical', id] })

  // Sauvegarder le rapport
  const saveMutation = useMutation({
    mutationFn: (data) => consultationsApi.createReport(id, data),
    onSuccess: () => { toast.success('Notes sauvegardées'); invalidate() },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const handleSaveNotes = () => {
    const content = Object.values(notes).filter(Boolean).join('\n\n')
    saveMutation.mutate({
      title: `Consultation présentielle #${id}`,
      content,
      structured_data: notes,
      follow_up_instructions: notes.follow_up_instructions,
    })
  }

  // Constantes vitales
  const vitalsMutation = useMutation({
    mutationFn: (data) => consultationsApi.transmitParams(id, data),
    onSuccess: () => { toast.success('Constantes enregistrées'); setShowVitals(false); invalidate() },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const handleVitalsSubmit = (e) => {
    e.preventDefault()
    const keyMap = {
      weight: 'poids', height: 'taille', temperature: 'temperature',
      blood_pressure_systolic: 'tension_systolique', blood_pressure_diastolic: 'tension_diastolique',
      heart_rate: 'frequence_cardiaque', respiratory_rate: 'frequence_respiratoire',
      spo2: 'saturation_o2', glycemia: 'glycemie',
    }
    const payload = {}
    Object.entries(vitals).forEach(([k, v]) => { if (v !== '' && keyMap[k]) payload[keyMap[k]] = Number(v) })
    if (Object.keys(payload).length === 0) { toast.error('Saisissez au moins un paramètre'); return }
    vitalsMutation.mutate(payload)
  }

  // Terminer
  const endMutation = useMutation({
    mutationFn: () => consultationsApi.end(id),
    onSuccess: () => { toast.success('Consultation terminée'); navigate(`/consultations/${id}/report`) },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  // Entités
  const deleteDiagnostic = useMutation({ mutationFn: (dId) => diagnosticsApi.delete(dId), onSuccess: () => { toast.success('Supprimé'); invalidate() } })
  const deleteExamen = useMutation({ mutationFn: (eId) => examensApi.delete(eId), onSuccess: () => { toast.success('Supprimé'); invalidate() } })

  if (isLoading) return <AppLayout title="Consultation"><LoadingPage /></AppLayout>
  if (!consultation) return (
    <AppLayout title="Consultation">
      <EmptyState icon={AlertCircle} title="Consultation introuvable"
        action={<Button onClick={() => navigate(-1)}>Retour</Button>} />
    </AppLayout>
  )

  // Redirect teleconsultation to video room
  if (consultation.type === 'teleconsultation') {
    navigate(`/consultations/${id}`, { replace: true })
    return null
  }

  const patient = consultation.patient_record?.patient || consultation.appointment?.patient || {}
  const diagList = consultation.diagnostics || []
  const examList = consultation.examens || []
  const prescList = consultation.prescriptions || []
  const traitList = consultation.treatments || []
  const report = consultation.report
  const isActive = consultation.status === 'in_progress'

  const sections = [
    { id: 'notes', label: 'Notes cliniques', icon: FileText },
    { id: 'entities', label: 'Diagnostics & Rx', icon: Stethoscope },
    { id: 'vitals', label: 'Constantes', icon: Activity },
  ]

  return (
    <AppLayout title="Consultation présentielle">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => navigate(-1)} />
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Consultation présentielle #{id}
              </h1>
              <p className="text-sm text-gray-500">
                {patient.full_name || 'Patient'} · {formatDateTime(consultation.started_at || consultation.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {isActive ? 'En cours' : 'Terminée'}
            </span>
          </div>
        </div>

        {/* Info patient */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div><span className="text-gray-500 text-xs">Patient</span><p className="font-semibold">{patient.full_name || '—'}</p></div>
              <div><span className="text-gray-500 text-xs">Médecin</span><p className="font-semibold">Dr. {user?.first_name} {user?.last_name}</p></div>
              <div><span className="text-gray-500 text-xs">Motif</span><p className="font-semibold">{consultation.reason || '—'}</p></div>
              <div><span className="text-gray-500 text-xs">Type</span><p className="font-semibold text-emerald-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Présentiel</p></div>
              <div><span className="text-gray-500 text-xs">Suivi</span><p className="font-semibold capitalize">{consultation.follow_up_type || '—'}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Section tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 -mb-px">
            {sections.map(s => {
              const Icon = s.icon
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeSection === s.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />{s.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ═══ Notes cliniques ═══ */}
        {activeSection === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><h3 className="font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Notes de consultation</h3></CardHeader>
              <CardContent className="space-y-4">
                <Textarea label="Motif de consultation" rows={2} value={notes.chief_complaint} onChange={e => setNote('chief_complaint', e.target.value)} placeholder="Motif principal de la visite…" disabled={!isActive} />
                <Textarea label="Anamnèse / Histoire de la maladie" rows={3} value={notes.history} onChange={e => setNote('history', e.target.value)} placeholder="Antécédents, symptômes, évolution…" disabled={!isActive} />
                <Textarea label="Examen clinique" rows={3} value={notes.examination} onChange={e => setNote('examination', e.target.value)} placeholder="Inspection, palpation, auscultation…" disabled={!isActive} />
                <Textarea label="Diagnostic" rows={2} value={notes.diagnosis} onChange={e => setNote('diagnosis', e.target.value)} placeholder="Diagnostic retenu…" disabled={!isActive} />
                <Textarea label="Plan thérapeutique" rows={2} value={notes.treatment_plan} onChange={e => setNote('treatment_plan', e.target.value)} placeholder="Traitement prescrit, conduite à tenir…" disabled={!isActive} />
                <Textarea label="Notes complémentaires" rows={2} value={notes.notes} onChange={e => setNote('notes', e.target.value)} placeholder="Observations, remarques…" disabled={!isActive} />
                <Textarea label="Consignes de suivi" rows={2} value={notes.follow_up_instructions} onChange={e => setNote('follow_up_instructions', e.target.value)} placeholder="Rendez-vous de contrôle, surveillance…" disabled={!isActive} />
              </CardContent>
            </Card>
            {isActive && (
              <div className="flex justify-end">
                <Button icon={Save} onClick={handleSaveNotes} loading={saveMutation.isPending}>Sauvegarder les notes</Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ Diagnostics & Entités ═══ */}
        {activeSection === 'entities' && (
          <div className="space-y-4">
            {isActive && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={Stethoscope} onClick={() => setShowDiagnosticModal(true)}>Diagnostic</Button>
                <Button variant="outline" size="sm" icon={FlaskConical} onClick={() => setShowExamenModal(true)}>Examen</Button>
                <Button variant="outline" size="sm" icon={Pill} onClick={() => setShowPrescriptionModal(true)}>Prescription</Button>
              </div>
            )}

            {/* Diagnostics */}
            {diagList.length > 0 && (
              <Card>
                <CardHeader><h3 className="font-semibold text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4 text-cyan-600" /> Diagnostics ({diagList.length})</h3></CardHeader>
                <CardContent className="space-y-2">
                  {diagList.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{d.title}</span>
                        {d.icd_code && <span className="ml-2 text-xs text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded font-mono">{d.icd_code}</span>}
                        {d.severity && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${d.severity === 'critique' || d.severity === 'severe' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.severity}</span>}
                      </div>
                      {isActive && <button onClick={() => { if (window.confirm('Supprimer ?')) deleteDiagnostic.mutate(d.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Examens */}
            {examList.length > 0 && (
              <Card>
                <CardHeader><h3 className="font-semibold text-sm flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-600" /> Examens ({examList.length})</h3></CardHeader>
                <CardContent className="space-y-2">
                  {examList.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{e.title}</span>
                        {e.urgent && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Urgent</span>}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${e.status === 'prescrit' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{e.status}</span>
                      </div>
                      {isActive && <button onClick={() => { if (window.confirm('Supprimer ?')) deleteExamen.mutate(e.id) }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Prescriptions */}
            {prescList.length > 0 && (
              <Card>
                <CardHeader><h3 className="font-semibold text-sm flex items-center gap-2"><Pill className="w-4 h-4 text-indigo-600" /> Prescriptions ({prescList.length})</h3></CardHeader>
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

            {diagList.length === 0 && examList.length === 0 && prescList.length === 0 && (
              <EmptyState icon={ClipboardList} title="Aucune entité médicale" description="Ajoutez des diagnostics, examens ou prescriptions." />
            )}
          </div>
        )}

        {/* ═══ Constantes ═══ */}
        {activeSection === 'vitals' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> Constantes vitales</h3>
                {isActive && <Button size="sm" icon={Plus} onClick={() => setShowVitals(true)}>Mesurer</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVitalsSubmit} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Input label="Poids (kg)" type="number" step="0.1" value={vitals.weight} onChange={e => setVitals(v => ({ ...v, weight: e.target.value }))} disabled={!isActive} />
                  <Input label="Taille (cm)" type="number" value={vitals.height} onChange={e => setVitals(v => ({ ...v, height: e.target.value }))} disabled={!isActive} />
                  <Input label="Température (°C)" type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))} disabled={!isActive} />
                  <Input label="FC (bpm)" type="number" value={vitals.heart_rate} onChange={e => setVitals(v => ({ ...v, heart_rate: e.target.value }))} disabled={!isActive} />
                  <Input label="TA systolique" type="number" value={vitals.blood_pressure_systolic} onChange={e => setVitals(v => ({ ...v, blood_pressure_systolic: e.target.value }))} disabled={!isActive} />
                  <Input label="TA diastolique" type="number" value={vitals.blood_pressure_diastolic} onChange={e => setVitals(v => ({ ...v, blood_pressure_diastolic: e.target.value }))} disabled={!isActive} />
                  <Input label="FR (/min)" type="number" value={vitals.respiratory_rate} onChange={e => setVitals(v => ({ ...v, respiratory_rate: e.target.value }))} disabled={!isActive} />
                  <Input label="SpO₂ (%)" type="number" value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))} disabled={!isActive} />
                  <Input label="Glycémie (g/L)" type="number" step="0.01" value={vitals.glycemia} onChange={e => setVitals(v => ({ ...v, glycemia: e.target.value }))} disabled={!isActive} />
                </div>
                {isActive && (
                  <div className="flex justify-end">
                    <Button type="submit" loading={vitalsMutation.isPending} icon={Save}>Enregistrer les constantes</Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Barre d'actions */}
        {isActive && (
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm sticky bottom-4">
            <div className="text-sm text-gray-500">
              N'oubliez pas de sauvegarder vos notes avant de terminer.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={FileText} onClick={() => navigate(`/consultations/${id}/report`)}>Rapport</Button>
              {!showEndConfirm ? (
                <Button variant="danger" onClick={() => setShowEndConfirm(true)}>Terminer la consultation</Button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2">
                  <span className="text-sm text-red-700">Confirmer ?</span>
                  <Button size="sm" variant="danger" onClick={() => endMutation.mutate()} loading={endMutation.isPending}>Oui</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowEndConfirm(false)}>Non</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Diagnostic */}
        <DiagnosticQuickModal open={showDiagnosticModal} onClose={() => setShowDiagnosticModal(false)} consultationId={id} onSuccess={invalidate} />
        <ExamenQuickModal open={showExamenModal} onClose={() => setShowExamenModal(false)} consultationId={id} dossierPatientId={consultation?.dossier_patient_id} onSuccess={invalidate} />
        <PrescriptionQuickModal open={showPrescriptionModal} onClose={() => setShowPrescriptionModal(false)} consultationId={id} onSuccess={invalidate} />
      </div>
    </AppLayout>
  )
}

// ── Quick Modals ──────────────────────────────────────────────────────────────

function DiagnosticQuickModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({ libelle: '', type: 'principal', code_cim: '', gravite: '', statut: 'presume', description: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const mutation = useMutation({
    mutationFn: (data) => diagnosticsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => { toast.success('Diagnostic ajouté'); onSuccess?.(); onClose(); setForm({ libelle: '', type: 'principal', code_cim: '', gravite: '', statut: 'presume', description: '' }) },
    onError: () => toast.error('Erreur'),
  })
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un diagnostic" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => mutation.mutate(form)} loading={mutation.isPending} icon={Check}>Ajouter</Button></>
    }>
      <div className="space-y-3">
        <Input label="Libellé *" value={form.libelle} onChange={e => set('libelle', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)} options={[
            { value: 'principal', label: 'Principal' }, { value: 'secondaire', label: 'Secondaire' }, { value: 'differentiel', label: 'Différentiel' }
          ]} />
          <Select label="Gravité" value={form.gravite} onChange={e => set('gravite', e.target.value)} options={[
            { value: 'legere', label: 'Légère' }, { value: 'moderee', label: 'Modérée' }, { value: 'severe', label: 'Sévère' }, { value: 'critique', label: 'Critique' }
          ]} placeholder="—" />
        </div>
        <Input label="Code CIM-10" value={form.code_cim} onChange={e => set('code_cim', e.target.value)} placeholder="Ex: J06.9" />
        <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}

function ExamenQuickModal({ open, onClose, consultationId, dossierPatientId, onSuccess }) {
  const [form, setForm] = useState({ libelle: '', type: '', indication: '', urgent: false })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const mutation = useMutation({
    mutationFn: (data) => examensApi.create({ ...data, consultation_id: consultationId, dossier_patient_id: dossierPatientId }),
    onSuccess: () => { toast.success('Examen ajouté'); onSuccess?.(); onClose(); setForm({ libelle: '', type: '', indication: '', urgent: false }) },
    onError: () => toast.error('Erreur'),
  })
  return (
    <Modal open={open} onClose={onClose} title="Prescrire un examen" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => mutation.mutate(form)} loading={mutation.isPending} icon={Check}>Ajouter</Button></>
    }>
      <div className="space-y-3">
        <Input label="Libellé *" value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="NFS, Glycémie…" />
        <Input label="Type" value={form.type} onChange={e => set('type', e.target.value)} placeholder="Biologie, Imagerie…" />
        <Textarea label="Indication" value={form.indication} onChange={e => set('indication', e.target.value)} rows={2} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="rounded border-gray-300 text-red-600" /> Urgent</label>
      </div>
    </Modal>
  )
}

function PrescriptionQuickModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({ denomination: '', posologie: '', duree_jours: '', instructions: '', urgent: false })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const mutation = useMutation({
    mutationFn: (data) => prescriptionsApi.create(consultationId, data),
    onSuccess: () => { toast.success('Prescription ajoutée'); onSuccess?.(); onClose(); setForm({ denomination: '', posologie: '', duree_jours: '', instructions: '', urgent: false }) },
    onError: () => toast.error('Erreur'),
  })
  return (
    <Modal open={open} onClose={onClose} title="Ajouter une prescription" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => mutation.mutate(form)} loading={mutation.isPending} icon={Check}>Ajouter</Button></>
    }>
      <div className="space-y-3">
        <Input label="Dénomination *" value={form.denomination} onChange={e => set('denomination', e.target.value)} placeholder="Paracétamol 500mg" />
        <Input label="Posologie" value={form.posologie} onChange={e => set('posologie', e.target.value)} placeholder="3x/jour pendant 5 jours" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Durée (jours)" type="number" value={form.duree_jours} onChange={e => set('duree_jours', e.target.value)} />
          <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="rounded border-gray-300 text-red-600" /> Urgent</label>
        </div>
        <Textarea label="Instructions" value={form.instructions} onChange={e => set('instructions', e.target.value)} rows={2} placeholder="Prendre après les repas…" />
      </div>
    </Modal>
  )
}
