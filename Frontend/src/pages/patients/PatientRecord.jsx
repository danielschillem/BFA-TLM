import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientRecordApi, antecedentsApi, allergiesApi, habitudesDeVieApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Textarea, Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  ArrowLeft, FileText, Heart, Activity, Thermometer,
  Droplets, AlertCircle, ClipboardList, Calendar,
  User, Stethoscope, Weight, Ruler, Plus, Pill,
  ShieldAlert, Cigarette, FlaskConical, Edit, Trash2, Search
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────
const ANTECEDENT_TYPE_LABELS = {
  medical: 'Médical', chirurgical: 'Chirurgical', familial: 'Familial',
  allergie: 'Allergique', autre: 'Autre',
}
const ANTECEDENT_TYPE_OPTIONS = Object.entries(ANTECEDENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const SEVERITY_LABELS = { legere: 'Légère', moderee: 'Modérée', severe: 'Sévère', critique: 'Critique' }
const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))
const SEVERITY_COLORS = { legere: 'bg-green-100 text-green-700', moderee: 'bg-yellow-100 text-yellow-700', severe: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' }

const DIAGNOSTIC_STATUS = { presume: 'Présumé', confirme: 'Confirmé', infirme: 'Infirmé' }
const DIAGNOSTIC_SEVERITY = { legere: 'Légère', moderee: 'Modérée', severe: 'Sévère', critique: 'Critique' }

const EXAM_STATUS_LABELS = { prescrit: 'Prescrit', en_cours: 'En cours', resultat_disponible: 'Résultat dispo.', interprete: 'Interprété' }
const EXAM_STATUS_COLORS = { prescrit: 'bg-gray-100 text-gray-700', en_cours: 'bg-blue-100 text-blue-700', resultat_disponible: 'bg-yellow-100 text-yellow-700', interprete: 'bg-green-100 text-green-700' }

const PRESCRIPTION_STATUS = { active: 'Active', terminee: 'Terminée', annulee: 'Annulée' }

// ── Composant principal ───────────────────────────────────────────────────────
export default function PatientRecord() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [showAntecedentModal, setShowAntecedentModal] = useState(false)
  const [showAllergieModal, setShowAllergieModal] = useState(false)
  const [showHabitudeModal, setShowHabitudeModal] = useState(false)
  const [showEditDossierModal, setShowEditDossierModal] = useState(false)
  const [editingAntecedent, setEditingAntecedent] = useState(null)
  const [editingAllergie, setEditingAllergie] = useState(null)
  const [editingHabitude, setEditingHabitude] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-record', patientId],
    queryFn: () => patientRecordApi.get(patientId),
    enabled: !!patientId,
  })

  const invalidateRecord = () => queryClient.invalidateQueries({ queryKey: ['patient-record', patientId] })

  const deleteAntecedent = useMutation({
    mutationFn: (id) => antecedentsApi.delete(id),
    onSuccess: () => { toast.success('Antécédent supprimé'); invalidateRecord() },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
  const deleteAllergie = useMutation({
    mutationFn: (id) => allergiesApi.delete(id),
    onSuccess: () => { toast.success('Allergie supprimée'); invalidateRecord() },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
  const deleteHabitude = useMutation({
    mutationFn: (id) => habitudesDeVieApi.delete(id),
    onSuccess: () => { toast.success('Habitude supprimée'); invalidateRecord() },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  if (isLoading) return <AppLayout title="Dossier médical"><LoadingPage /></AppLayout>
  if (error) return (
    <AppLayout title="Dossier médical">
      <EmptyState icon={AlertCircle} title="Dossier introuvable" description="Ce dossier patient n'existe pas ou vous n'y avez pas accès."
        action={<Button variant="primary" onClick={() => navigate(-1)}>Retour</Button>} />
    </AppLayout>
  )

  const record = data?.data?.data || data?.data || {}
  const patient = record.patient || {}
  const antecedents = record.antecedents || []
  const constantes = record.constantes || []
  const consultations = record.consultations || []
  const allergies = record.allergies || []
  const prescriptions = record.prescriptions || []
  const diagnostics = record.diagnostics || []
  const examens = record.examens || []
  const examensCliniques = record.examens_cliniques || []
  const habitudes = record.habitudes_de_vie || []
  const antecedentsMed = record.antecedents_medicamenteux || []

  const latestConstante = constantes.length > 0 ? constantes[0] : null

  // Filtre de recherche
  const q = searchTerm.toLowerCase()
  const matchStr = (...fields) => fields.some(f => f && String(f).toLowerCase().includes(q))
  const filteredConsultations = q ? consultations.filter(c => matchStr(c.reason, c.doctor?.full_name)) : consultations
  const filteredDiagnostics = q ? diagnostics.filter(d => matchStr(d.title, d.icd_code, d.description)) : diagnostics
  const filteredExamens = q ? examens.filter(e => matchStr(e.title, e.type, e.results)) : examens
  const filteredPrescriptions = q ? prescriptions.filter(p => matchStr(p.name, p.dosage, p.instructions)) : prescriptions
  const filteredAntecedents = q ? antecedents.filter(a => matchStr(a.title, a.type, a.description)) : antecedents
  const filteredAllergies = q ? allergies.filter(a => matchStr(a.allergen, a.severity)) : allergies

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: FileText },
    { id: 'antecedents', label: `Antécédents (${antecedents.length})`, icon: ClipboardList },
    { id: 'allergies', label: `Allergies (${allergies.length})`, icon: ShieldAlert },
    { id: 'constantes', label: `Constantes (${constantes.length})`, icon: Activity },
    { id: 'examens_cliniques', label: `Exam. cliniques (${examensCliniques.length})`, icon: Stethoscope },
    { id: 'examens_complementaires', label: `Exam. complémentaires (${examens.length})`, icon: FlaskConical },
    { id: 'diagnostics', label: `Diagnostics (${diagnostics.length})`, icon: Search },
    { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: Pill },
    { id: 'examens', label: `Examens (${consultations.length})`, icon: Calendar },
  ]

  return (
    <AppLayout title="Dossier médical">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} />
          <div>
            <h1 className="page-title">Dossier médical</h1>
            {patient.full_name && <p className="text-gray-500 mt-0.5 text-sm">Patient : {patient.full_name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Edit} onClick={() => setShowEditDossierModal(true)}>Modifier dossier</Button>
          <Button icon={Calendar} onClick={() => navigate(`/directory?patient_id=${patientId}`)}>Prendre un RDV</Button>
        </div>
      </div>

      {/* Infos patient */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-cyan-600" />
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-500">Identifiant</p><p className="font-semibold">{record.identifier || '—'}</p></div>
              {patient.ipp && <div><p className="text-xs text-gray-500">IPP (BFA-LPK)</p><p className="font-semibold font-mono text-primary-600">{patient.ipp}</p></div>}
              <div><p className="text-xs text-gray-500">Groupe sanguin</p><p className="font-semibold text-red-600">{record.blood_group || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Ouvert le</p><p className="font-semibold">{record.opened_at ? format(new Date(record.opened_at), 'dd MMM yyyy', { locale: fr }) : '—'}</p></div>
              <div><p className="text-xs text-gray-500">Dernière consultation</p><p className="font-semibold">{record.last_consultation_at ? format(new Date(record.last_consultation_at), 'dd MMM yyyy', { locale: fr }) : '—'}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Stethoscope} label="Consultations" value={record.consultations_count || 0} color="blue" />
        <StatCard icon={ClipboardList} label="Antécédents" value={antecedents.length} color="orange" />
        <StatCard icon={ShieldAlert} label="Allergies" value={allergies.length} color="red" />
        <StatCard icon={Activity} label="Mesures vitales" value={constantes.length} color="green" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Barre de recherche (onglets avec contenu filtrable) */}
      {['examens', 'diagnostics', 'examens_complementaires', 'prescriptions', 'antecedents', 'allergies', 'examens_cliniques'].includes(activeTab) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Rechercher dans ${activeTab}…`}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      )}

      {/* ═══════════════ TAB: Overview ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {record.important_notes && (
            <Card>
              <CardHeader><div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /><h3 className="font-semibold">Notes importantes</h3></div></CardHeader>
              <CardContent><p className="text-gray-700 whitespace-pre-wrap">{record.important_notes}</p></CardContent>
            </Card>
          )}

          {/* Allergies critiques */}
          {allergies.filter(a => a.severity === 'severe' || a.severity === 'critique').length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader><div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /><h3 className="font-semibold text-red-800">Allergies à risque</h3></div></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allergies.filter(a => a.severity === 'severe' || a.severity === 'critique').map((a, i) => (
                    <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">{a.allergen} — {SEVERITY_LABELS[a.severity]}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {latestConstante && (
            <Card>
              <CardHeader><h3 className="font-semibold">Dernières constantes vitales</h3></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {latestConstante.weight && <VitalCard icon={Weight} label="Poids" value={`${latestConstante.weight} kg`} color="blue" />}
                  {latestConstante.height && <VitalCard icon={Ruler} label="Taille" value={`${latestConstante.height} cm`} color="green" />}
                  {latestConstante.temperature && <VitalCard icon={Thermometer} label="Température" value={`${latestConstante.temperature} °C`} color="orange" />}
                  {(latestConstante.systolic_bp || latestConstante.diastolic_bp) && <VitalCard icon={Heart} label="Tension" value={`${latestConstante.systolic_bp}/${latestConstante.diastolic_bp} mmHg`} color="red" />}
                  {latestConstante.heart_rate && <VitalCard icon={Activity} label="Fréq. cardiaque" value={`${latestConstante.heart_rate} bpm`} color="pink" />}
                  {latestConstante.spo2 && <VitalCard icon={Droplets} label="SpO₂" value={`${latestConstante.spo2}%`} color="cyan" />}
                  {latestConstante.blood_sugar && <VitalCard icon={Droplets} label="Glycémie" value={`${latestConstante.blood_sugar} g/L`} color="purple" />}
                  {latestConstante.bmi && <VitalCard icon={User} label="IMC" value={latestConstante.bmi} color="teal" />}
                </div>
              </CardContent>
            </Card>
          )}

          {antecedents.length > 0 && (
            <Card>
              <CardHeader><h3 className="font-semibold">Antécédents récents</h3></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {antecedents.slice(0, 5).map((ant, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-1.5 rounded bg-orange-100"><ClipboardList className="w-4 h-4 text-orange-600" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{ant.title || '—'}</span>
                          {ant.type && <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{ANTECEDENT_TYPE_LABELS[ant.type] || ant.type}</span>}
                        </div>
                        {ant.description && <p className="text-sm text-gray-500 mt-0.5">{ant.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Antécédents ═══════════════ */}
      {activeTab === 'antecedents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={Plus} onClick={() => setShowAntecedentModal(true)}>Ajouter un antécédent</Button>
          </div>
          {filteredAntecedents.length === 0 ? (
            <EmptyState icon={ClipboardList} title={q ? 'Aucun résultat' : 'Aucun antécédent enregistré'} description={q ? 'Essayez un autre terme de recherche.' : 'Les antécédents médicaux seront ajoutés par le professionnel de santé.'} />
          ) : filteredAntecedents.map((ant) => (
            <Card key={ant.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${ant.type === 'allergie' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    {ant.type === 'allergie' ? <AlertCircle className="w-5 h-5 text-red-600" /> : <ClipboardList className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{ant.title}</h4>
                      {ant.type && <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{ANTECEDENT_TYPE_LABELS[ant.type] || ant.type}</span>}
                      {ant.current_state && <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{ant.current_state}</span>}
                    </div>
                    {ant.description && <p className="text-sm text-gray-600 mt-1">{ant.description}</p>}
                    {ant.treatments && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Traitements :</span> {ant.treatments}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      {ant.diagnosis_date && <span>Date : {format(new Date(ant.diagnosis_date), 'dd MMM yyyy', { locale: fr })}</span>}
                      {ant.icd_code && <span>CIM-10 : {ant.icd_code}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingAntecedent(ant); setShowAntecedentModal(true) }} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm('Supprimer cet antécédent ?')) deleteAntecedent.mutate(ant.id) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Antécédents médicamenteux */}
          {antecedentsMed.length > 0 && (
            <>
              <h3 className="font-semibold text-gray-700 mt-6 flex items-center gap-2"><Pill className="w-5 h-5" /> Antécédents médicamenteux</h3>
              {antecedentsMed.map((med) => (
                <Card key={med.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100"><Pill className="w-5 h-5 text-purple-600" /></div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{med.generic_name || med.brand_name}</h4>
                        {med.brand_name && med.generic_name && <p className="text-sm text-gray-500">Marque : {med.brand_name}</p>}
                        <div className="flex gap-4 mt-1 text-xs text-gray-400">
                          {med.dose && <span>{med.dose} {med.unit}</span>}
                          {med.route && <span>Voie : {med.route}</span>}
                          {med.tolerance && <span>Tolérance : {med.tolerance}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Habitudes de vie */}
          {habitudes.length > 0 && (
            <>
              <h3 className="font-semibold text-gray-700 mt-6 flex items-center gap-2"><Cigarette className="w-5 h-5" /> Habitudes de vie</h3>
              {habitudes.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-100"><Cigarette className="w-5 h-5 text-teal-600" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{h.type}</h4>
                          {h.status && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{h.status}</span>}
                        </div>
                        {h.details && <p className="text-sm text-gray-500 mt-1">{h.details}</p>}
                        <div className="flex gap-4 mt-1 text-xs text-gray-400">
                          {h.intensity && <span>Intensité : {h.intensity}</span>}
                          {h.frequency && <span>Fréquence : {h.frequency}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingHabitude(h); setShowHabitudeModal(true) }} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { if (window.confirm('Supprimer cette habitude ?')) deleteHabitude.mutate(h.id) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          <div className="flex gap-2">
            <Button variant="outline" icon={Plus} onClick={() => setShowHabitudeModal(true)}>Habitude de vie</Button>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Allergies ═══════════════ */}
      {activeTab === 'allergies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={Plus} onClick={() => setShowAllergieModal(true)}>Ajouter une allergie</Button>
          </div>
          {filteredAllergies.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Aucune allergie enregistrée" description="Les allergies connues seront documentées par le professionnel de santé." />
          ) : filteredAllergies.map((a) => (
            <Card key={a.id} className={a.severity === 'severe' || a.severity === 'critique' ? 'border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${a.severity === 'severe' || a.severity === 'critique' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      <ShieldAlert className={`w-5 h-5 ${a.severity === 'severe' || a.severity === 'critique' ? 'text-red-600' : 'text-yellow-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{a.allergen}</h4>
                      {a.manifestations && <p className="text-sm text-gray-500">{a.manifestations}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.severity && <span className={`px-3 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[a.severity] || 'bg-gray-100 text-gray-600'}`}>{SEVERITY_LABELS[a.severity]}</span>}
                    <button onClick={() => { setEditingAllergie(a); setShowAllergieModal(true) }} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm('Supprimer cette allergie ?')) deleteAllergie.mutate(a.id) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Constantes ═══════════════ */}
      {activeTab === 'constantes' && (
        <div className="space-y-4">
          {constantes.length === 0 ? (
            <EmptyState icon={Activity} title="Aucune mesure enregistrée" description="Les constantes vitales seront enregistrées lors des consultations." />
          ) : (
            <>
              {/* Graphes de tendances */}
              {constantes.length >= 2 && <VitalTrends constantes={constantes} />}

              {/* Liste détaillée */}
              {constantes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy à HH:mm', { locale: fr }) : '—'}</span>
                  {c.context && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{c.context}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {c.weight && <div><span className="text-gray-500">Poids :</span> <span className="font-semibold">{c.weight} kg</span></div>}
                  {c.height && <div><span className="text-gray-500">Taille :</span> <span className="font-semibold">{c.height} cm</span></div>}
                  {c.bmi && <div><span className="text-gray-500">IMC :</span> <span className="font-semibold">{c.bmi}</span></div>}
                  {c.temperature && <div><span className="text-gray-500">T° :</span> <span className="font-semibold">{c.temperature} °C</span></div>}
                  {c.systolic_bp && <div><span className="text-gray-500">TA :</span> <span className="font-semibold">{c.systolic_bp}/{c.diastolic_bp}</span></div>}
                  {c.heart_rate && <div><span className="text-gray-500">FC :</span> <span className="font-semibold">{c.heart_rate} bpm</span></div>}
                  {c.respiratory_rate && <div><span className="text-gray-500">FR :</span> <span className="font-semibold">{c.respiratory_rate} /min</span></div>}
                  {c.spo2 && <div><span className="text-gray-500">SpO₂ :</span> <span className="font-semibold">{c.spo2}%</span></div>}
                  {c.blood_sugar && <div><span className="text-gray-500">Glycémie :</span> <span className="font-semibold">{c.blood_sugar} g/L</span></div>}
                </div>
              </CardContent>
            </Card>
          ))}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Examens cliniques par systèmes ═══════════════ */}
      {activeTab === 'examens_cliniques' && (
        <div className="space-y-4">
          {examensCliniques.length === 0 ? (
            <EmptyState icon={Stethoscope} title="Aucun examen clinique" description="Les examens cliniques par systèmes seront enregistrés lors des consultations." />
          ) : examensCliniques.map((ec) => (
            <Card key={ec.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-cyan-600" />
                    <span className="font-semibold text-gray-900">Examen clinique</span>
                  </div>
                  <span className="text-sm text-gray-500">{ec.created_at ? format(new Date(ec.created_at), 'dd MMM yyyy à HH:mm', { locale: fr }) : '—'}</span>
                </div>
                {ec.user && <p className="text-sm text-gray-500 mb-2">Par : {ec.user.full_name || ec.user.name}</p>}
                {ec.synthese_globale && (
                  <div className="mb-3 p-3 bg-cyan-50 rounded-lg">
                    <p className="text-sm font-medium text-cyan-800">Synthèse globale</p>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{ec.synthese_globale}</p>
                  </div>
                )}
                {ec.systemes?.length > 0 && (
                  <div className="space-y-2">
                    {ec.systemes.map((s) => (
                      <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full capitalize">{s.systeme}</span>
                          {s.impression && <span className="text-xs text-gray-400 italic">{s.impression}</span>}
                        </div>
                        {s.description && <p className="text-sm text-gray-600">{s.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Examens complémentaires ═══════════════ */}
      {activeTab === 'examens_complementaires' && (
        <div className="space-y-4">
          {filteredExamens.length === 0 ? (
            <EmptyState icon={FlaskConical} title="Aucun examen complémentaire" description="Les examens prescrits et leurs résultats apparaîtront ici." />
          ) : filteredExamens.map((e) => (
            <Card key={e.id} className={e.urgent ? 'border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{e.title}</h4>
                      {e.urgent && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Urgent</span>}
                    </div>
                    {e.indication && <p className="text-sm text-gray-500 mt-0.5">{e.indication}</p>}
                    {e.results && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                        <span className="font-medium text-green-700">Résultats :</span> {e.results}
                      </div>
                    )}
                    {e.comment && <p className="text-xs text-gray-400 mt-1">{e.comment}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${EXAM_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-600'}`}>{EXAM_STATUS_LABELS[e.status] || e.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Consultations (Examens) ═══════════════ */}
      {activeTab === 'examens' && (
        <div className="space-y-4">
          {filteredConsultations.length === 0 ? (
            <EmptyState icon={Stethoscope} title={q ? 'Aucun résultat' : 'Aucune consultation'} description={q ? 'Essayez un autre terme.' : 'L\'historique des consultations apparaîtra ici.'} />
          ) : filteredConsultations.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => c.id && navigate(`/consultations/${c.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{c.reason || 'Consultation'}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{c.doctor?.full_name || 'Médecin'}</p>
                    {c.diagnostics?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {c.diagnostics.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-cyan-50 text-cyan-700 rounded">{d.title}{d.icd_code ? ` (${d.icd_code})` : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{c.date ? format(new Date(c.date), 'dd MMM yyyy', { locale: fr }) : '—'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                      c.status === 'completed' ? 'bg-green-100 text-green-700' : c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.status === 'completed' ? 'Terminée' : c.status === 'in_progress' ? 'En cours' : 'Planifiée'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Diagnostics ═══════════════ */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          {filteredDiagnostics.length === 0 ? (
            <EmptyState icon={Search} title="Aucun diagnostic" description="Les diagnostics seront ajoutés pendant les consultations." />
          ) : filteredDiagnostics.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{d.title}</h4>
                      {d.icd_code && <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded font-mono">{d.icd_code}</span>}
                      {d.type && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">{d.type}</span>}
                    </div>
                    {d.description && <p className="text-sm text-gray-500 mt-1">{d.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {d.severity && <span className={`px-2 py-0.5 text-xs rounded-full ${SEVERITY_COLORS[d.severity] || 'bg-gray-100 text-gray-600'}`}>{DIAGNOSTIC_SEVERITY[d.severity]}</span>}
                    {d.status && <span className={`px-2 py-0.5 text-xs rounded-full ${d.status === 'confirme' ? 'bg-green-100 text-green-700' : d.status === 'infirme' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{DIAGNOSTIC_STATUS[d.status]}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Prescriptions ═══════════════ */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {filteredPrescriptions.length === 0 ? (
            <EmptyState icon={Pill} title="Aucune prescription" description="Les prescriptions apparaîtront ici après les consultations." />
          ) : filteredPrescriptions.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${p.urgent ? 'bg-red-100' : 'bg-indigo-100'}`}>
                      <Pill className={`w-5 h-5 ${p.urgent ? 'text-red-600' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{p.name}</h4>
                        {p.signed && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Signée</span>}
                        {p.urgent && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Urgent</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{p.dosage}</p>
                      {p.instructions && <p className="text-xs text-gray-400 mt-0.5">{p.instructions}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    {p.duration_days && <p className="text-sm text-gray-600">{p.duration_days} jours</p>}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'terminee' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                    }`}>{PRESCRIPTION_STATUS[p.status] || p.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>

    {/* ═══════════════ MODALS ═══════════════ */}
    <AntecedentFormModal open={showAntecedentModal} onClose={() => { setShowAntecedentModal(false); setEditingAntecedent(null) }} dossierId={record.id} editing={editingAntecedent} onSuccess={invalidateRecord} />
    <AllergieFormModal open={showAllergieModal} onClose={() => { setShowAllergieModal(false); setEditingAllergie(null) }} dossierId={record.id} editing={editingAllergie} onSuccess={invalidateRecord} />
    <HabitudeFormModal open={showHabitudeModal} onClose={() => { setShowHabitudeModal(false); setEditingHabitude(null) }} dossierId={record.id} editing={editingHabitude} onSuccess={invalidateRecord} />
    <EditDossierModal open={showEditDossierModal} onClose={() => setShowEditDossierModal(false)} patientId={patientId} record={record} onSuccess={invalidateRecord} />
    </AppLayout>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function VitalCard({ icon: Icon, label, value, color }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600', pink: 'bg-pink-50 text-pink-600', cyan: 'bg-cyan-50 text-cyan-600', purple: 'bg-purple-50 text-purple-600', teal: 'bg-teal-50 text-teal-600' }
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${colors[color]?.split(' ')[0] || 'bg-gray-50'}`}>
      <Icon className={`w-5 h-5 ${colors[color]?.split(' ')[1] || 'text-gray-600'}`} />
      <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold">{value}</p></div>
    </div>
  )
}

// ── Modal: Antécédent (create + edit) ─────────────────────────────────────────
function AntecedentFormModal({ open, onClose, dossierId, editing, onSuccess }) {
  const emptyForm = { libelle: '', type: 'medical', description: '', code_cim: '', date_evenement: '', traitements: '', etat_actuel: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          libelle: editing.title || '', type: editing.type || 'medical', description: editing.description || '',
          code_cim: editing.icd_code || '', date_evenement: editing.diagnosis_date || '',
          traitements: editing.treatments || '', etat_actuel: editing.current_state || '',
        })
      } else {
        setForm(emptyForm)
      }
    }
  }, [open, editing])

  const mutation = useMutation({
    mutationFn: (data) => editing
      ? antecedentsApi.update(editing.id, data)
      : antecedentsApi.create({ ...data, dossier_patient_id: dossierId }),
    onSuccess: () => { toast.success(editing ? 'Antécédent modifié' : 'Antécédent ajouté'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier l\'antécédent' : 'Ajouter un antécédent'} size="lg" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Intitulé *" value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Ex: Diabète type 2" />
        <Select label="Type *" value={form.type} onChange={e => set('type', e.target.value)} options={ANTECEDENT_TYPE_OPTIONS} />
        <Input label="Code CIM-10" value={form.code_cim} onChange={e => set('code_cim', e.target.value)} placeholder="Ex: E11.9" />
        <Input label="Date de l'événement" type="date" value={form.date_evenement} onChange={e => set('date_evenement', e.target.value)} />
        <div className="sm:col-span-2"><Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} /></div>
        <Input label="Traitements" value={form.traitements} onChange={e => set('traitements', e.target.value)} placeholder="Traitements en cours" />
        <Input label="État actuel" value={form.etat_actuel} onChange={e => set('etat_actuel', e.target.value)} placeholder="Guéri, Sous traitement..." />
      </div>
    </Modal>
  )
}

// ── Modal: Allergie (create + edit) ───────────────────────────────────────────
function AllergieFormModal({ open, onClose, dossierId, editing, onSuccess }) {
  const emptyForm = { allergenes: '', manifestations: '', severite: 'legere' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ allergenes: editing.allergen || '', manifestations: editing.manifestations || '', severite: editing.severity || 'legere' })
      } else {
        setForm(emptyForm)
      }
    }
  }, [open, editing])

  const mutation = useMutation({
    mutationFn: (data) => editing
      ? allergiesApi.update(editing.id, data)
      : allergiesApi.create({ ...data, dossier_patient_id: dossierId }),
    onSuccess: () => { toast.success(editing ? 'Allergie modifiée' : 'Allergie ajoutée'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier l\'allergie' : 'Ajouter une allergie'} footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="space-y-4">
        <Input label="Allergène *" value={form.allergenes} onChange={e => set('allergenes', e.target.value)} placeholder="Ex: Pénicilline" />
        <Textarea label="Manifestations" value={form.manifestations} onChange={e => set('manifestations', e.target.value)} rows={2} placeholder="Urticaire, œdème..." />
        <Select label="Sévérité" value={form.severite} onChange={e => set('severite', e.target.value)} options={SEVERITY_OPTIONS} />
      </div>
    </Modal>
  )
}

// ── Modal: Habitude de vie (create + edit) ────────────────────────────────────
function HabitudeFormModal({ open, onClose, dossierId, editing, onSuccess }) {
  const emptyForm = { type: '', statut: '', details: '', intensite: '', frequence: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ type: editing.type || '', statut: editing.status || '', details: editing.details || '', intensite: editing.intensity || '', frequence: editing.frequency || '' })
      } else {
        setForm(emptyForm)
      }
    }
  }, [open, editing])

  const mutation = useMutation({
    mutationFn: (data) => editing
      ? habitudesDeVieApi.update(editing.id, data)
      : habitudesDeVieApi.create({ ...data, dossier_patient_id: dossierId }),
    onSuccess: () => { toast.success(editing ? 'Habitude modifiée' : 'Habitude ajoutée'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier l\'habitude' : 'Ajouter une habitude de vie'} footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Type *" value={form.type} onChange={e => set('type', e.target.value)} placeholder="Tabac, Alcool, Sport..." />
        <Input label="Statut" value={form.statut} onChange={e => set('statut', e.target.value)} placeholder="Actif, Ancien, Sevré..." />
        <div className="sm:col-span-2"><Textarea label="Détails" value={form.details} onChange={e => set('details', e.target.value)} rows={2} /></div>
        <Input label="Intensité" value={form.intensite} onChange={e => set('intensite', e.target.value)} placeholder="10 cig/jour, modérée..." />
        <Input label="Fréquence" value={form.frequence} onChange={e => set('frequence', e.target.value)} placeholder="Quotidienne, hebdomadaire..." />
      </div>
    </Modal>
  )
}

// ── Modal: Édition dossier ────────────────────────────────────────────────────
function EditDossierModal({ open, onClose, patientId, record, onSuccess }) {
  const [form, setForm] = useState({ groupe_sanguin: record.blood_group || '', notes_importantes: record.important_notes || '' })
  const mutation = useMutation({
    mutationFn: (data) => patientRecordApi.update(patientId, data),
    onSuccess: () => { toast.success('Dossier mis à jour'); onClose(); onSuccess() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const BLOOD_OPTIONS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))

  return (
    <Modal open={open} onClose={onClose} title="Modifier le dossier" footer={
      <><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)}>Enregistrer</Button></>
    }>
      <div className="space-y-4">
        <Select label="Groupe sanguin" value={form.groupe_sanguin} onChange={e => set('groupe_sanguin', e.target.value)} options={BLOOD_OPTIONS} placeholder="Sélectionner..." />
        <Textarea label="Notes importantes" value={form.notes_importantes} onChange={e => set('notes_importantes', e.target.value)} rows={4} placeholder="Informations critiques sur le patient..." />
      </div>
    </Modal>
  )
}

// ── Graphes de tendances des constantes vitales ───────────────────────────────
const VITAL_CHARTS = [
  { key: 'weight', label: 'Poids (kg)', color: '#0891b2', unit: 'kg' },
  { key: 'systolic_bp', label: 'Tension artérielle', color: '#dc2626', unit: 'mmHg', secondKey: 'diastolic_bp', secondColor: '#f97316', secondLabel: 'Diastolique' },
  { key: 'heart_rate', label: 'Fréquence cardiaque (bpm)', color: '#e11d48', unit: 'bpm' },
  { key: 'temperature', label: 'Température (°C)', color: '#f59e0b', unit: '°C' },
  { key: 'blood_sugar', label: 'Glycémie (g/L)', color: '#8b5cf6', unit: 'g/L' },
  { key: 'spo2', label: 'SpO₂ (%)', color: '#3b82f6', unit: '%' },
]

function VitalTrends({ constantes }) {
  const data = [...constantes].reverse().map(c => ({
    date: c.created_at ? format(new Date(c.created_at), 'dd/MM', { locale: fr }) : '',
    weight: c.weight ? Number(c.weight) : null,
    systolic_bp: c.systolic_bp ? Number(c.systolic_bp) : null,
    diastolic_bp: c.diastolic_bp ? Number(c.diastolic_bp) : null,
    heart_rate: c.heart_rate ? Number(c.heart_rate) : null,
    temperature: c.temperature ? Number(c.temperature) : null,
    blood_sugar: c.blood_sugar ? Number(c.blood_sugar) : null,
    spo2: c.spo2 ? Number(c.spo2) : null,
  }))

  const charts = VITAL_CHARTS.filter(ch => data.some(d => d[ch.key] !== null))

  if (charts.length === 0) return null

  return (
    <Card>
      <CardHeader><h3 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-600" /> Tendances des constantes vitales</h3></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {charts.map(ch => (
            <div key={ch.key}>
              <p className="text-sm font-medium text-gray-600 mb-2">{ch.label}</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={ch.key} stroke={ch.color} strokeWidth={2} dot={{ r: 3 }} connectNulls name={ch.label} />
                  {ch.secondKey && (
                    <Line type="monotone" dataKey={ch.secondKey} stroke={ch.secondColor} strokeWidth={2} dot={{ r: 3 }} connectNulls name={ch.secondLabel} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
