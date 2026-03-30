import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Activity, Calendar, TrendingUp } from 'lucide-react'
import { certificatsDecesApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, StatCard } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'

export default function MortalityStatistics() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const { data, isLoading } = useQuery({
    queryKey: ['certificats-deces', 'statistics', period],
    queryFn: () => {
      const [y, m] = period.split('-')
      return certificatsDecesApi.statistics({
        date_debut: `${y}-${m}-01`,
        date_fin: `${y}-${m}-${new Date(y, m, 0).getDate()}`,
      }).then(r => r.data.data ?? r.data ?? {})
    },
  })

  const stats = data ?? {}
  const topCauses = stats.top_causes ?? stats.causes_principales ?? []
  const byAge = stats.by_age_group ?? stats.par_tranche_age ?? []
  const bySex = stats.by_sex ?? stats.par_sexe ?? {}

  return (
    <AppLayout title="Statistiques de mortalité">
      <div className="space-y-5 animate-fade-in max-w-5xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/certificats-deces')}>Retour</Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5"
            />
          </div>
        </div>

        {isLoading ? <LoadingPage /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatCard label="Total décès" value={stats.total ?? 0} icon={Activity} color="red" />
              <StatCard label="Hommes" value={bySex.M ?? bySex.masculin ?? 0} icon={BarChart3} color="blue" />
              <StatCard label="Femmes" value={bySex.F ?? bySex.feminin ?? 0} icon={BarChart3} color="pink" />
              <StatCard label="Taux (mois)" value={stats.rate ? `${stats.rate}%` : '—'} icon={TrendingUp} color="purple" />
            </div>

            {/* Top causes */}
            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Principales causes de décès</h3></CardHeader>
              <CardContent>
                {Array.isArray(topCauses) && topCauses.length > 0 ? (
                  <div className="space-y-2">
                    {topCauses.map((cause, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-800">{cause.cause ?? cause.label}</span>
                            <span className="text-xs font-medium text-gray-500">{cause.count ?? cause.nombre} ({cause.percentage ?? cause.pourcentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${cause.percentage ?? cause.pourcentage ?? 0}%` }} />
                          </div>
                        </div>
                        {(cause.icd11_code ?? cause.code_icd11) && (
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{cause.icd11_code ?? cause.code_icd11}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={BarChart3} title="Aucune donnée" description="Pas de statistiques disponibles pour cette période." />
                )}
              </CardContent>
            </Card>

            {/* By age group */}
            {Array.isArray(byAge) && byAge.length > 0 && (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold">Répartition par tranche d'âge</h3></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {byAge.map((group, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{group.range ?? group.tranche}</p>
                        <p className="text-lg font-semibold text-gray-900">{group.count ?? group.nombre}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
