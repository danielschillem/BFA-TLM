import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, Video, MapPin, Search, Plus, Edit, Eye, Trash2,
  Download, Printer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import { appointmentsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { formatDate } from '@/utils/helpers'

export default function AppointmentList() {
  const navigate = useNavigate()
  const { isPatient, isDoctor } = useAuthStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState([])

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['appointments', page, perPage],
    queryFn: () => appointmentsApi.list({ page, per_page: perPage }).then(r => r.data),
  })

  const appointments = rawData?.data?.data ?? rawData?.data ?? []
  const pagination = rawData?.meta?.pagination ?? rawData?.data?.meta?.pagination ?? {}
  const totalEntries = pagination.total ?? appointments.length
  const lastPage = pagination.last_page ?? 1
  const currentPage = pagination.current_page ?? page

  // Client-side search filter
  const filtered = search.trim()
    ? appointments.filter(apt => {
        const q = search.toLowerCase()
        return (
          (apt.reason ?? '').toLowerCase().includes(q) ||
          (apt.doctor?.last_name ?? '').toLowerCase().includes(q) ||
          (apt.patient?.last_name ?? '').toLowerCase().includes(q) ||
          (apt.patient?.first_name ?? '').toLowerCase().includes(q) ||
          (apt.patient?.identifiant ?? '').toLowerCase().includes(q)
        )
      })
    : appointments

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAll = () => {
    setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(a => a.id))
  }

  const startIdx = (currentPage - 1) * perPage + 1
  const endIdx = Math.min(currentPage * perPage, totalEntries)

  return (
    <AppLayout title="Rendez-vous">
      <div className="space-y-4 animate-fade-in">
        {/* Action buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" icon={Plus} onClick={() => navigate('/appointments/new')}>
              Nouveau
            </Button>
            <Button size="sm" variant="primary" icon={Edit}
              disabled={selectedIds.length !== 1}
              onClick={() => selectedIds.length === 1 && navigate(`/appointments/${selectedIds[0]}`)}>
              Éditer
            </Button>
            <Button size="sm" variant="warning" icon={Eye}
              disabled={selectedIds.length !== 1}
              onClick={() => selectedIds.length === 1 && navigate(`/appointments/${selectedIds[0]}`)}>
              Détails
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} disabled={selectedIds.length === 0}>
              Supprimer
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" icon={Download}>
              Exporter
            </Button>
            <Button size="sm" variant="outline" icon={Printer} onClick={() => window.print()}>
              Imprimer
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="input-field pl-10 w-full"
          />
        </div>

        {/* Table */}
        {isLoading ? <LoadingPage /> : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aucun rendez-vous"
            description="Aucun rendez-vous trouvé."
            action={<Button onClick={() => navigate('/appointments/new')}>Nouveau rendez-vous</Button>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Motif ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Professionnel de santé ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Assistant(s) ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Identifiant du Patient ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Patient ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Date ↕</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Heure ↕</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(apt => (
                    <tr key={apt.id}
                      className="border-b border-gray-50 hover:bg-primary-50/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/appointments/${apt.id}`)}>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(apt.id)}
                          onChange={() => toggleSelect(apt.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                      </td>
                      <td className="px-4 py-3 text-gray-800">{apt.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-800">{apt.doctor?.last_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {apt.assistants?.length > 0
                          ? apt.assistants.map(a => `Dr. ${a.last_name}`).join(', ')
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{apt.patient?.identifiant ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-800 uppercase">{apt.patient?.last_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{apt.date ? formatDate(apt.date) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{apt.time ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-500">
              <span>Affichage de {startIdx} à {endIdx} sur {totalEntries} entrées</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(1)} disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-gray-700 font-medium">Page {currentPage} sur {lastPage}</span>
                <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(lastPage)} disabled={currentPage >= lastPage}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white">
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} lignes</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
