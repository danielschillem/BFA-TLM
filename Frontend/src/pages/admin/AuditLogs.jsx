import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Search, Download, Filter, Eye } from 'lucide-react'
import { auditApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDateTime, downloadBlob } from '@/utils/helpers'

const METHOD_COLORS = {
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-blue-100 text-blue-700',
  PATCH:  'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  GET:    'bg-gray-100 text-gray-600',
}

export default function AuditLogs() {
  const [search, setSearch]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'logs', search, dateFrom, dateTo, page],
    queryFn: () => auditApi.list({ search, date_from: dateFrom, date_to: dateTo, page, per_page: 20 }).then(r => r.data.data),
    keepPreviousData: true,
  })

  const logs  = data?.data ?? []
  const meta  = data?.meta ?? {}

  const downloadReport = async () => {
    try {
      const res = await auditApi.report({ date_from: dateFrom, date_to: dateTo, format: 'csv' })
      downloadBlob(res.data, `audit-report-${new Date().toISOString().split('T')[0]}.csv`)
    } catch {
      // ignore
    }
  }

  return (
    <AppLayout title="Journaux d'audit">
      <div className="space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher action, URL, utilisateur…" className="input-field pl-9 w-full" />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" />
          <Button onClick={downloadReport} variant="outline" icon={Download} size="sm">
            Exporter CSV
          </Button>
        </div>

        {/* Logs */}
        {isLoading ? <LoadingPage /> : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucun log d'audit" description="Les actions système apparaîtront ici." />
        ) : (
          <>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <span className={`text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 ${METHOD_COLORS[log.method] ?? METHOD_COLORS.GET}`}>
                    {log.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-700 truncate">{log.url}</p>
                    <p className="text-xs text-gray-400">
                      {log.user?.first_name} {log.user?.last_name} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    log.response_status >= 400 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {log.response_status ?? '—'}
                  </span>
                  <Eye className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Précédent
                </Button>
                <span className="text-sm text-gray-500">Page {page} / {meta.last_page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}>
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Détail du log"
        size="lg"
      >
        {selected && (
          <div className="space-y-3 font-mono text-xs">
            {[
              ['Méthode',  selected.method],
              ['URL',      selected.url],
              ['Statut',   selected.response_status],
              ['Utilisateur', `${selected.user?.first_name ?? ''} ${selected.user?.last_name ?? ''} (${selected.user?.email ?? ''})`],
              ['IP',       selected.ip_address],
              ['User Agent', selected.user_agent],
              ['Date',     formatDateTime(selected.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                <span className="text-gray-700 break-all">{String(value ?? '—')}</span>
              </div>
            ))}
            {selected.request_payload && (
              <div>
                <p className="text-gray-400 mb-1">Payload</p>
                <pre className="bg-gray-50 rounded-xl p-3 text-gray-600 overflow-auto max-h-48 text-xs">
                  {JSON.stringify(selected.request_payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
