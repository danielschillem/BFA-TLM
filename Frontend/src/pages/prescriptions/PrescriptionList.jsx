import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { prescriptionsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Pill, Search, Filter, CheckCircle, Send, Clock,
  AlertTriangle, FileText, PenTool, Share2
} from 'lucide-react'

const STATUS_CONFIG = {
  active:   { label: 'Active',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  signed:   { label: 'Signée',    color: 'bg-blue-100 text-blue-700',    icon: PenTool },
  pending:  { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  shared:   { label: 'Partagée',  color: 'bg-purple-100 text-purple-700', icon: Share2 },
}

export default function PrescriptionList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isDoctor, isAdmin } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', searchParams.toString()],
    queryFn: () => prescriptionsApi.list({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || 1,
    }),
  })

  const signMutation = useMutation({
    mutationFn: (id) => prescriptionsApi.sign(id),
    onSuccess: () => {
      toast.success('Ordonnance signée avec succès')
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
    },
    onError: () => toast.error('Erreur lors de la signature'),
  })

  const shareMutation = useMutation({
    mutationFn: (id) => prescriptionsApi.share(id, { share_with: ['patient'] }),
    onSuccess: () => {
      toast.success('Ordonnance partagée avec le patient')
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
    },
    onError: () => toast.error('Erreur lors du partage'),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) params.set('search', search)
    else params.delete('search')
    if (statusFilter !== 'all') params.set('status', statusFilter)
    else params.delete('status')
    params.delete('page')
    setSearchParams(params)
  }

  const prescriptions = data?.data?.data || data?.data || []
  const meta = data?.data?.meta || {}

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordonnances</h1>
          <p className="text-gray-500 mt-1">
            {isDoctor() ? 'Gérez vos ordonnances médicales' : 'Consultez vos ordonnances'}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                icon={Search}
                placeholder="Rechercher par médicament..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'active', label: 'Active' },
                { value: 'signed', label: 'Signée' },
                { value: 'pending', label: 'En attente' },
              ]}
            />
            <Button type="submit" variant="outline" icon={Filter}>
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      {prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Aucune ordonnance"
          description="Les ordonnances créées lors des consultations apparaîtront ici."
        />
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => {
            const status = prescription.signed ? 'signed' : (prescription.status || 'pending')
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
            const StatusIcon = config.icon

            return (
              <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${prescription.urgent ? 'bg-red-100' : 'bg-cyan-50'}`}>
                          {prescription.urgent ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Pill className="w-5 h-5 text-cyan-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {prescription.name || 'Ordonnance'}
                            </h3>
                            {prescription.urgent && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Urgent
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          {prescription.dosage && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Posologie :</span> {prescription.dosage}
                            </p>
                          )}
                          {prescription.instructions && (
                            <p className="text-sm text-gray-500 mt-0.5 truncate">
                              {prescription.instructions}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            {prescription.duration_days && (
                              <span>Durée : {prescription.duration_days} jours</span>
                            )}
                            {prescription.created_at && (
                              <span>
                                {format(new Date(prescription.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions médecin */}
                    {isDoctor() && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!prescription.signed && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={PenTool}
                            loading={signMutation.isPending}
                            onClick={() => signMutation.mutate(prescription.id)}
                          >
                            Signer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Send}
                          loading={shareMutation.isPending}
                          onClick={() => shareMutation.mutate(prescription.id)}
                        >
                          Partager
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: meta.last_page }, (_, i) => (
                <Button
                  key={i + 1}
                  size="sm"
                  variant={meta.current_page === i + 1 ? 'primary' : 'outline'}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams)
                    params.set('page', i + 1)
                    setSearchParams(params)
                  }}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
