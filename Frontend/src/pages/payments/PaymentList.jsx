import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Download, Search, CheckCircle, Clock, XCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { paymentsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import { formatDateTime, formatCurrency, downloadBlob } from '@/utils/helpers'

const STATUS_CONFIG = {
  pending:   { label: 'En attente', icon: Clock,       color: 'text-yellow-700 bg-yellow-50' },
  confirmed: { label: 'Confirmé',   icon: CheckCircle, color: 'text-green-700 bg-green-50' },
  failed:    { label: 'Échoué',     icon: XCircle,     color: 'text-red-700 bg-red-50' },
  refunded:  { label: 'Remboursé',  icon: RefreshCw,   color: 'text-blue-700 bg-blue-50' },
}

const METHOD_LABELS = {
  orange_money: 'Orange Money',
  moov_money:   'Moov Money',
  carte:        'Carte bancaire',
  especes:      'Espèces',
}

const TABS = [
  { value: '',          label: 'Tous' },
  { value: 'confirmed', label: 'Confirmés' },
  { value: 'pending',   label: 'En attente' },
  { value: 'failed',    label: 'Échoués' },
]

export default function PaymentList() {
  const { isDoctor } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'statement', activeTab, dateFrom, dateTo],
    queryFn: () => paymentsApi.statement({
      status: activeTab || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }).then(r => ({
      payments: r.data.data ?? [],
      stats: r.data.stats ?? {},
      meta: r.data.meta ?? {},
    })),
  })

  const payments = data?.payments ?? []
  const stats = data?.stats ?? {}

  const handleDownloadInvoice = async (paymentId) => {
    try {
      const res = await paymentsApi.downloadInvoice(paymentId)
      downloadBlob(res.data, `recu-${paymentId}.pdf`, 'application/pdf')
    } catch {
      toast.error('Erreur lors du téléchargement du reçu')
    }
  }

  const validateMutation = useMutation({
    mutationFn: (paymentId) => paymentsApi.doctorValidate(paymentId),
    onSuccess: () => {
      toast.success('Paiement validé')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur de validation'),
  })

  return (
    <AppLayout title="Paiements">
      <div className="space-y-5 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total payé" value={formatCurrency(stats.total_paid ?? 0)} icon={CheckCircle} color="green" />
          <StatCard label="En attente" value={formatCurrency(stats.total_pending ?? 0)} icon={Clock} color="yellow" />
          <StatCard label="Transactions" value={stats.count ?? 0} icon={CreditCard} color="primary" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="input-field" placeholder="Du" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="input-field" placeholder="Au" />
        </div>

        {/* List */}
        {isLoading ? <LoadingPage /> : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Aucun paiement"
            description="Vos paiements apparaîtront ici après une consultation."
          />
        ) : (
          <div className="space-y-2">
            {payments.map(payment => {
              const statusCfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending
              const StatusIcon = statusCfg.icon
              return (
                <div key={payment.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 flex items-center gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
                      <span>·</span>
                      <span>{payment.reference}</span>
                      <span>·</span>
                      <span>{formatDateTime(payment.created_at)}</span>
                    </div>
                  </div>
                  {payment.status === 'confirmed' && (
                    <Button size="xs" variant="outline" icon={Download}
                      onClick={() => handleDownloadInvoice(payment.id)}>
                      Reçu
                    </Button>
                  )}
                  {payment.status === 'pending' && isDoctor() && (
                    <Button size="xs" icon={ShieldCheck}
                      onClick={() => validateMutation.mutate(payment.id)}
                      loading={validateMutation.isPending}>
                      Valider
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
