import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MessageSquare, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { teleexpertiseApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'

export default function TeleexpertiseRespond() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [response, setResponse] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)

  const { data: req, isLoading } = useQuery({
    queryKey: ['teleexpertise', id],
    queryFn: () => teleexpertiseApi.get(id).then(r => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: () => teleexpertiseApi.respond(id, { response, recommendations, follow_up_required: followUpRequired }),
    onSuccess: () => {
      toast.success('Réponse envoyée avec succès !')
      queryClient.invalidateQueries({ queryKey: ['teleexpertise', id] })
      navigate(`/teleexpertise/${id}`)
    },
    onError: err => toast.error(err.response?.data?.message ?? 'Erreur lors de l\'envoi'),
  })

  if (isLoading) return <AppLayout title="Répondre"><LoadingPage /></AppLayout>
  if (!req)      return <AppLayout title="Répondre"><div className="text-center py-12 text-gray-400">Introuvable</div></AppLayout>

  const canSubmit = response.trim().length >= 20

  return (
    <AppLayout title="Répondre à la demande de téléexpertise">
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        {/* Rappel de la demande */}
        <Card>
          <CardHeader><h3 className="section-title">Demande de {req.requesting_doctor?.last_name}</h3></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Résumé</p>
              <p className="text-sm text-gray-700 mt-1">{req.clinical_summary}</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
              <p className="text-xs font-medium text-primary-600 mb-1">Question posée</p>
              <p className="text-sm text-primary-800">{req.question}</p>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire réponse */}
        <Card>
          <CardHeader><h3 className="section-title">Votre avis d'expert</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avis clinique <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                value={response}
                onChange={e => setResponse(e.target.value)}
                className="input-field w-full resize-y"
                placeholder="Rédigez votre avis d'expert (diagnostic différentiel, interprétation, commentaires)…"
              />
              {response.length > 0 && response.length < 20 && (
                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Minimum 20 caractères requis
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommandations thérapeutiques (optionnel)
              </label>
              <textarea
                rows={4}
                value={recommendations}
                onChange={e => setRecommendations(e.target.value)}
                className="input-field w-full resize-y"
                placeholder="Examens complémentaires suggérés, traitement recommandé, orientation…"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={e => setFollowUpRequired(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600"
              />
              <span className="text-sm text-gray-700">Un suivi spécialisé est nécessaire (orientation vers spécialiste)</span>
            </label>

            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!canSubmit}
              className="w-full"
              size="lg"
              icon={Check}
            >
              Envoyer ma réponse
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
