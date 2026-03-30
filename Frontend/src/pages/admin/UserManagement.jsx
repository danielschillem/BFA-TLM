import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, CheckCircle, XCircle, ShieldCheck, AlertCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { formatDateTime, getInitials } from '@/utils/helpers'

const STATUS_CONFIG = {
  active:   { label: 'Actif',     color: 'text-green-700 bg-green-50 border-green-100' },
  inactive: { label: 'Inactif',   color: 'text-gray-600 bg-gray-50 border-gray-100' },
  banned:   { label: 'Banni',     color: 'text-red-700 bg-red-50 border-red-100' },
  pending:  { label: 'En attente',color: 'text-orange-700 bg-orange-50 border-orange-100' },
}

const ROLE_FILTER = [
  { value: '',                  label: 'Tous les rôles' },
  { value: 'patient',           label: 'Patients' },
  { value: 'doctor',            label: 'Médecins' },
  { value: 'specialist',        label: 'Spécialistes' },
  { value: 'health_professional',label: 'PS Accompagnants' },
  { value: 'admin',             label: 'Admins' },
]

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter, search],
    queryFn: () => adminApi.listUsers({ role: roleFilter, search }).then(r => r.data.data?.data ?? []),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateUserStatus(id, { status }),
    onSuccess: () => {
      toast.success('Statut mis à jour')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowModal(false)
    },
    onError: () => toast.error('Erreur'),
  })

  const verifyMutation = useMutation({
    mutationFn: id => adminApi.verifyDoctor(id),
    onSuccess: () => {
      toast.success('Médecin vérifié !')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowModal(false)
    },
    onError: () => toast.error('Erreur lors de la vérification'),
  })

  const users = data ?? []

  return (
    <AppLayout title="Gestion des utilisateurs">
      <div className="space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…" className="input-field pl-9 w-full" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field min-w-40">
            {ROLE_FILTER.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {/* List */}
        {isLoading ? <LoadingPage /> : users.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur" description="Aucun résultat pour ces critères." />
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const statusCfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG.inactive
              const isPendingDoctor = (u.roles?.includes('doctor') || u.roles?.includes('specialist')) && u.status !== 'active'
              return (
                <div key={u.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitials(`${u.first_name} ${u.last_name}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                      {isPendingDoctor && (
                        <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> À vérifier
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {u.roles?.map(r => (
                        <span key={r} className="text-xs bg-primary-50 text-primary-700 rounded-md px-1.5 py-0.5">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs border rounded-full px-2.5 py-1 font-medium ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <Button size="xs" variant="outline" onClick={() => { setSelectedUser(u); setNewStatus(u.status); setShowModal(true) }}>
                      Gérer
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* User modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Gérer · ${selectedUser?.first_name} ${selectedUser?.last_name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Fermer</Button>
            <Button onClick={() => statusMutation.mutate({ id: selectedUser?.id, status: newStatus })}
              loading={statusMutation.isPending}>
              Appliquer
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-800 text-xs mt-0.5">{selectedUser.email}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Inscrit le</p>
                <p className="font-medium text-gray-800 text-xs mt-0.5">{formatDateTime(selectedUser.created_at)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut du compte</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input-field w-full">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="banned">Banni</option>
              </select>
            </div>

            {(selectedUser.roles?.includes('doctor') || selectedUser.roles?.includes('specialist')) &&
              selectedUser.status !== 'active' && (
              <div className="border-t border-gray-100 pt-3">
                <Button
                  onClick={() => verifyMutation.mutate(selectedUser.id)}
                  loading={verifyMutation.isPending}
                  icon={ShieldCheck}
                  variant="success"
                  className="w-full"
                >
                  Vérifier et approuver ce médecin
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
