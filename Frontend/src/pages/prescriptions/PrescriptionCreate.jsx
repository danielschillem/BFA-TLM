import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { prescriptionsApi, consultationsApi } from '@/api'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Pill, AlertTriangle, Save } from 'lucide-react'

export default function PrescriptionCreate() {
  const { consultationId } = useParams()
  const navigate = useNavigate()

  const { data: consultationData, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: () => consultationsApi.get(consultationId),
    enabled: !!consultationId,
  })

  const [medications, setMedications] = useState([
    { name: '', dosage: '', instructions: '', duration_days: '', urgent: false },
  ])

  const createMutation = useMutation({
    mutationFn: (data) => prescriptionsApi.create(consultationId, data),
    onSuccess: () => {
      toast.success('Ordonnance créée avec succès')
      navigate(`/consultations/${consultationId}/report`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création')
    },
  })

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', instructions: '', duration_days: '', urgent: false },
    ])
  }

  const removeMedication = (index) => {
    if (medications.length === 1) return
    setMedications(medications.filter((_, i) => i !== index))
  }

  const updateMedication = (index, field, value) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const validMeds = medications.filter((m) => m.name.trim())
    if (validMeds.length === 0) {
      toast.error('Ajoutez au moins un médicament')
      return
    }

    // Envoyer chaque médicament comme une ordonnance séparée
    const promises = validMeds.map((med) =>
      prescriptionsApi.create(consultationId, {
        denomination: med.name,
        posologie: med.dosage,
        instructions: med.instructions,
        duree_jours: med.duration_days ? parseInt(med.duration_days, 10) : null,
        urgent: med.urgent,
      })
    )

    Promise.all(promises)
      .then(() => {
        toast.success(`${validMeds.length} ordonnance(s) créée(s)`)
        navigate(`/consultations/${consultationId}/report`)
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la création')
      })
  }

  const consultation = consultationData?.data?.data || consultationData?.data || {}

  if (isLoading) return <LoadingPage />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate(-1)}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle ordonnance</h1>
          {consultation.reason && (
            <p className="text-gray-500 mt-1">
              Consultation : {consultation.reason}
            </p>
          )}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {medications.map((med, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-cyan-600" />
                <h3 className="font-semibold">Médicament {index + 1}</h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={med.urgent}
                    onChange={(e) => updateMedication(index, 'urgent', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 font-medium">Urgent</span>
                </label>
                {medications.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    icon={Trash2}
                    onClick={() => removeMedication(index)}
                    className="text-red-500 hover:text-red-700"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Dénomination *"
                  placeholder="Ex: Amoxicilline 500mg"
                  value={med.name}
                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  required
                />
                <Input
                  label="Posologie"
                  placeholder="Ex: 1 comprimé 3 fois/jour"
                  value={med.dosage}
                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Textarea
                    label="Instructions"
                    placeholder="Prendre pendant les repas, éviter l'alcool..."
                    value={med.instructions}
                    onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                    rows={2}
                  />
                </div>
                <Input
                  label="Durée (jours)"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="7"
                  value={med.duration_days}
                  onChange={(e) => updateMedication(index, 'duration_days', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Ajouter un médicament */}
        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addMedication}
          className="w-full border-dashed"
        >
          Ajouter un médicament
        </Button>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={createMutation.isPending}
          >
            Créer l'ordonnance ({medications.filter((m) => m.name.trim()).length} médicament{medications.filter((m) => m.name.trim()).length > 1 ? 's' : ''})
          </Button>
        </div>
      </form>
    </div>
  )
}
