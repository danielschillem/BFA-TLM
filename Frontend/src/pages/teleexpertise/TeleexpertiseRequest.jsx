import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, Users, Search } from 'lucide-react'
import { toast } from 'sonner'
import { teleexpertiseApi, directoryApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Input, { Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { getInitials } from '@/utils/helpers'

const schema = z.object({
  title:             z.string().min(5, 'Titre requis (min 5 caractères)'),
  specialty_requested: z.string().min(2, 'Spécialité requise'),
  urgency_level:     z.enum(['low', 'normal', 'high', 'urgent']),
  clinical_summary:  z.string().min(20, 'Résumé clinique requis (min 20 caractères)'),
  question:          z.string().min(10, 'Question requise'),
  patient_age:       z.string().optional(),
  patient_gender:    z.string().optional(),
})

const SPECIALTIES = [
  'Cardiologie','Neurologie','Dermatologie','Pédiatrie','Psychiatrie',
  'Ophtalmologie','Gynécologie','Orthopédie','Infectiologie','Endocrinologie',
  'Pneumologie','Gastroentérologie','Urologie','Rhumatologie',
]

export default function TeleexpertiseRequest() {
  const navigate = useNavigate()
  const [specialistSearch, setSpecialistSearch] = useState('')
  const [selectedSpecialist, setSelectedSpecialist] = useState(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { urgency_level: 'normal' },
  })

  const specialty = watch('specialty_requested')

  const { data: specialists } = useQuery({
    queryKey: ['directory', 'specialists', specialty, specialistSearch],
    queryFn: () => directoryApi.search({ specialty, search: specialistSearch, limit: 10 }).then(r => r.data.data?.data ?? []),
    enabled: !!specialty,
  })

  const mutation = useMutation({
    mutationFn: data => teleexpertiseApi.create({ ...data, specialist_id: selectedSpecialist?.id }),
    onSuccess: (res) => {
      toast.success('Demande de téléexpertise envoyée !')
      navigate(`/teleexpertise/${res.data.data.id}`)
    },
    onError: err => toast.error(err.response?.data?.message ?? 'Erreur lors de la création'),
  })

  return (
    <AppLayout title="Nouvelle demande de téléexpertise">
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          {/* Informations de la demande */}
          <Card>
            <CardHeader><h3 className="section-title">Informations de la demande</h3></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Titre de la demande" placeholder="Ex : Interprétation ECG anormal" error={errors.title?.message} {...register('title')} />

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Spécialité requise"
                  error={errors.specialty_requested?.message}
                  {...register('specialty_requested')}
                  options={SPECIALTIES.map(s => ({ value: s, label: s }))}
                  placeholder="Choisir une spécialité"
                />
                <Select
                  label="Niveau d'urgence"
                  {...register('urgency_level')}
                  options={[
                    { value: 'low',    label: '🟢 Faible' },
                    { value: 'normal', label: '🔵 Normal' },
                    { value: 'high',   label: '🟠 Élevé' },
                    { value: 'urgent', label: '🔴 Urgent' },
                  ]}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Âge du patient (optionnel)" placeholder="Ex : 45" {...register('patient_age')} />
                <Select
                  label="Genre du patient (optionnel)"
                  {...register('patient_gender')}
                  options={[
                    { value: 'male',   label: 'Masculin' },
                    { value: 'female', label: 'Féminin' },
                    { value: 'other',  label: 'Autre' },
                  ]}
                  placeholder="Sélectionner"
                />
              </div>
            </CardContent>
          </Card>

          {/* Résumé clinique */}
          <Card>
            <CardHeader><h3 className="section-title">Résumé clinique</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Résumé du cas clinique <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  placeholder="Décrivez le cas clinique, les antécédents pertinents, les examens réalisés et leurs résultats…"
                  className={`input-field w-full resize-y ${errors.clinical_summary ? 'border-red-300' : ''}`}
                  {...register('clinical_summary')}
                />
                {errors.clinical_summary && <p className="text-xs text-red-500 mt-1">{errors.clinical_summary.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question posée au spécialiste <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Quelle est votre question précise pour le spécialiste ?"
                  className={`input-field w-full resize-y ${errors.question ? 'border-red-300' : ''}`}
                  {...register('question')}
                />
                {errors.question && <p className="text-xs text-red-500 mt-1">{errors.question.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Choix du spécialiste */}
          {specialty && (
            <Card>
              <CardHeader><h3 className="section-title">Spécialiste (optionnel)</h3></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Laissez vide pour que la plateforme assigne automatiquement un spécialiste disponible.</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={specialistSearch}
                    onChange={e => setSpecialistSearch(e.target.value)}
                    placeholder={`Chercher un spécialiste en ${specialty}…`}
                    className="input-field pl-9 w-full"
                  />
                </div>
                <div className="space-y-2">
                  {(specialists ?? []).map(doc => (
                    <button key={doc.id} type="button"
                      onClick={() => setSelectedSpecialist(selectedSpecialist?.id === doc.id ? null : doc)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedSpecialist?.id === doc.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(`${doc.first_name} ${doc.last_name}`)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
                        <p className="text-xs text-gray-500">{doc.specialty}</p>
                      </div>
                      {selectedSpecialist?.id === doc.id && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedSpecialist && (
                  <p className="text-xs text-primary-600 bg-primary-50 rounded-lg p-2">
                    Spécialiste sélectionné : Dr. {selectedSpecialist.first_name} {selectedSpecialist.last_name}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Button type="submit" loading={mutation.isPending} className="w-full" size="lg" icon={Users}>
            Envoyer la demande de téléexpertise
          </Button>
        </form>
      </div>
    </AppLayout>
  )
}
