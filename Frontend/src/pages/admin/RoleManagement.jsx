import { useState, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, ShieldCheck, ShieldAlert, Users, Plus, Pencil, Trash2,
  Search, Check, X, ChevronDown, ChevronRight, Eye, Lock, Key,
  UserCog, AlertTriangle, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

// ── Labels humains pour les rôles ─────────────────────────────────────────────
const ROLE_LABELS = {
  admin:               'Administrateur',
  doctor:              'Médecin',
  specialist:          'Spécialiste',
  health_professional: 'PS Accompagnant',
  patient:             'Patient',
  structure_manager:   'Gestionnaire de structure',
}

const ROLE_COLORS = {
  admin:               'from-red-500 to-rose-600',
  doctor:              'from-blue-500 to-indigo-600',
  specialist:          'from-purple-500 to-violet-600',
  health_professional: 'from-teal-500 to-cyan-600',
  patient:             'from-green-500 to-emerald-600',
  structure_manager:   'from-amber-500 to-orange-600',
}

const PERMISSION_CATEGORIES = {
  patients:        { label: 'Patients',         icon: Users },
  dossiers:        { label: 'Dossiers médicaux', icon: Eye },
  consultations:   { label: 'Consultations',    icon: Eye },
  appointments:    { label: 'Rendez-vous',      icon: Eye },
  prescriptions:   { label: 'Ordonnances',      icon: Eye },
  diagnostics:     { label: 'Diagnostics',      icon: Eye },
  examens:         { label: 'Examens',          icon: Eye },
  documents:       { label: 'Documents',        icon: Eye },
  messages:        { label: 'Messages',         icon: Eye },
  teleexpertise:   { label: 'Téléexpertise',    icon: Eye },
  admin:           { label: 'Administration',   icon: ShieldCheck },
  structures:      { label: 'Structures',       icon: Eye },
  type_structures: { label: 'Types de structure', icon: Eye },
  users:           { label: 'Utilisateurs',     icon: UserCog },
  payments:        { label: 'Paiements',        icon: Eye },
}

const PROTECTED_ROLES = ['admin', 'doctor', 'specialist', 'health_professional', 'patient', 'structure_manager']

// ── Onglets ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'roles',  label: 'Rôles',        icon: Shield },
  { key: 'matrix', label: 'Matrice',       icon: Key },
  { key: 'users',  label: 'Utilisateurs',  icon: UserCog },
]

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState('roles')

  return (
    <AppLayout title="Rôles & Permissions">
      <div className="space-y-5 animate-fade-in">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'roles'  && <RolesTab />}
        {activeTab === 'matrix' && <MatrixTab />}
        {activeTab === 'users'  && <UsersTab />}
      </div>
    </AppLayout>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 1 : Gestion des rôles
// ══════════════════════════════════════════════════════════════════════════════

function RolesTab() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [viewingRole, setViewingRole] = useState(null)

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminApi.listRoles().then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteRole(id),
    onSuccess: () => {
      toast.success('Rôle supprimé')
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la suppression'),
  })

  const roles = rolesData ?? []

  if (isLoading) return <LoadingPage />

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Rôles du système</h2>
          <p className="text-sm text-gray-500">{roles.length} rôle(s) configuré(s)</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Nouveau rôle</Button>
      </div>

      {/* Role cards */}
      {roles.length === 0 ? (
        <EmptyState icon={Shield} title="Aucun rôle" description="Créez votre premier rôle." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(role => {
            const isProtected = PROTECTED_ROLES.includes(role.name)
            const gradient = ROLE_COLORS[role.name] || 'from-gray-500 to-gray-600'

            return (
              <Card key={role.id} hover className="overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{ROLE_LABELS[role.name] || role.name}</h3>
                        <p className="text-xs text-gray-400 font-mono">{role.name}</p>
                      </div>
                    </div>
                    {isProtected && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Système
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {role.users_count} utilisateur(s)</span>
                    <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> {role.permissions_count} permission(s)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="ghost" icon={Eye} onClick={() => setViewingRole(role)}>Voir</Button>
                    <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setEditingRole(role)}>Modifier</Button>
                    {!isProtected && (
                      <Button size="xs" variant="ghost" icon={Trash2} className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Supprimer le rôle "${role.name}" ?`)) deleteMutation.mutate(role.id)
                        }}
                      >Supprimer</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <RoleFormModal
          open
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }) }}
        />
      )}
      {editingRole && (
        <RoleFormModal
          open
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSuccess={() => { setEditingRole(null); queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }) }}
        />
      )}
      {viewingRole && <RoleDetailModal open role={viewingRole} onClose={() => setViewingRole(null)} />}
    </>
  )
}

// ── Modal création / modification de rôle ────────────────────────────────────

function RoleFormModal({ open, onClose, role, onSuccess }) {
  const isEdit = !!role
  const [name, setName] = useState(role?.name || '')
  const [selectedPerms, setSelectedPerms] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})

  const { data: permissionsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => adminApi.listPermissions().then(r => r.data),
  })

  // Charger les permissions du rôle en édition
  const { isLoading: loadingRole } = useQuery({
    queryKey: ['admin', 'role', role?.id],
    queryFn: () => adminApi.getRole(role.id).then(r => r.data.data),
    enabled: isEdit,
    onSuccess: (data) => setSelectedPerms(data.permissions || []),
  })

  const mutation = useMutation({
    mutationFn: (payload) => isEdit
      ? adminApi.updateRole(role.id, payload)
      : adminApi.createRole(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Rôle mis à jour' : 'Rôle créé')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  })

  const allPermissions = permissionsData?.data ?? []
  const grouped = useMemo(() => {
    const groups = {}
    allPermissions.forEach(p => {
      const cat = p.name.split('.')[0]
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    })
    return groups
  }, [allPermissions])

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))

  const togglePerm = (permName) => {
    setSelectedPerms(prev =>
      prev.includes(permName)
        ? prev.filter(p => p !== permName)
        : [...prev, permName]
    )
  }

  const toggleAllCategory = (cat) => {
    const catPerms = grouped[cat]?.map(p => p.name) || []
    const allSelected = catPerms.every(p => selectedPerms.includes(p))
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !catPerms.includes(p)))
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...catPerms])])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({ name, permissions: selectedPerms })
  }

  const isProtectedRole = isEdit && PROTECTED_ROLES.includes(role.name)

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Modifier : ${ROLE_LABELS[role.name] || role.name}` : 'Nouveau rôle'} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {isEdit ? 'Enregistrer' : 'Créer le rôle'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom du rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du rôle</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isProtectedRole}
            placeholder="ex: supervisor"
            className="input-field w-full font-mono"
            pattern="^[a-z_]+$"
            title="Lettres minuscules et underscores uniquement"
            required
          />
          {isProtectedRole && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Le nom des rôles système ne peut pas être modifié
            </p>
          )}
        </div>

        {/* Permissions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Permissions ({selectedPerms.length}/{allPermissions.length})
            </label>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-primary-600 hover:underline"
                onClick={() => setSelectedPerms(allPermissions.map(p => p.name))}>
                Tout sélectionner
              </button>
              <button type="button" className="text-xs text-gray-500 hover:underline"
                onClick={() => setSelectedPerms([])}>
                Tout désélectionner
              </button>
            </div>
          </div>

          {loadingPerms || loadingRole ? (
            <div className="text-center py-8 text-gray-400">Chargement…</div>
          ) : (
            <div className="space-y-1 max-h-[45vh] overflow-y-auto rounded-xl border border-gray-100 p-2">
              {Object.entries(grouped).map(([cat, perms]) => {
                const catConfig = PERMISSION_CATEGORIES[cat] || { label: cat, icon: Key }
                const CatIcon = catConfig.icon
                const isExpanded = expandedCategories[cat]
                const selectedInCat = perms.filter(p => selectedPerms.includes(p.name)).length
                const allSelectedInCat = selectedInCat === perms.length

                return (
                  <div key={cat} className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors rounded-xl"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <CatIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">{catConfig.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        allSelectedInCat ? 'bg-green-50 text-green-700' : selectedInCat > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {selectedInCat}/{perms.length}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleAllCategory(cat) }}
                        className="text-xs text-primary-600 hover:text-primary-800 px-1"
                      >
                        {allSelectedInCat ? 'Décocher' : 'Cocher'}
                      </button>
                    </button>

                    {isExpanded && (
                      <div className="pl-9 pr-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {perms.map(p => {
                          const isSelected = selectedPerms.includes(p.name)
                          const action = p.name.split('.').slice(1).join('.')
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50/50 border border-transparent hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePerm(p.name)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{action}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

// ── Modal détail d'un rôle ───────────────────────────────────────────────────

function RoleDetailModal({ open, role, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'role', role.id],
    queryFn: () => adminApi.getRole(role.id).then(r => r.data.data),
    enabled: open,
  })

  const gradient = ROLE_COLORS[role.name] || 'from-gray-500 to-gray-600'

  return (
    <Modal open={open} onClose={onClose} title={`Rôle : ${ROLE_LABELS[role.name] || role.name}`} size="lg">
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-5">
          {/* Info */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{ROLE_LABELS[role.name] || role.name}</h3>
              <p className="text-sm text-gray-500 font-mono">{role.name} — {data?.permissions?.length || 0} permissions</p>
            </div>
          </div>

          {/* Permissions list */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Permissions attribuées</h4>
            <div className="flex flex-wrap gap-1.5">
              {(data?.permissions || []).map(perm => (
                <span key={perm} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg font-mono">
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Users */}
          {data?.users && data.users.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Utilisateurs ({data.users.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.users.map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900">{u.first_name} {u.last_name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 2 : Matrice rôles × permissions
// ══════════════════════════════════════════════════════════════════════════════

function MatrixTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'roles-matrix'],
    queryFn: () => adminApi.rolesMatrix().then(r => r.data.data),
  })

  if (isLoading) return <LoadingPage />
  if (!data) return null

  const { roles: matrixRoles, permissions } = data

  // Grouper les permissions par catégorie
  const grouped = useMemo(() => {
    const groups = {}
    permissions.forEach(p => {
      const cat = p.split('.')[0]
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    })
    return groups
  }, [permissions])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Matrice Rôles × Permissions</h2>
        <p className="text-sm text-gray-500">Vue complète des permissions par rôle</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 bg-gray-50/80 sticky left-0 z-10 min-w-[200px]">
                  Permission
                </th>
                {matrixRoles.map(r => (
                  <th key={r.role} className="px-3 py-3 text-center font-semibold text-gray-700 bg-gray-50/80 min-w-[100px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs">{ROLE_LABELS[r.role] || r.role}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{r.role}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, catPerms]) => (
                <Fragment key={cat}>
                  <tr>
                    <td colSpan={matrixRoles.length + 1}
                      className="px-4 py-2 bg-gray-50/60 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0">
                      {PERMISSION_CATEGORIES[cat]?.label || cat}
                    </td>
                  </tr>
                  {catPerms.map(perm => (
                    <tr key={perm} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-gray-700 font-mono text-xs sticky left-0 bg-white">
                        {perm.split('.').slice(1).join('.')}
                      </td>
                      {matrixRoles.map(r => {
                        const has = r.permissions.includes(perm)
                        return (
                          <td key={`${r.role}-${perm}`} className="px-3 py-2 text-center">
                            {has ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-green-50">
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-50">
                                <X className="w-3.5 h-3.5 text-gray-300" />
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-50">
            <Check className="w-3 h-3 text-green-600" />
          </span>
          Autorisé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-50">
            <X className="w-3 h-3 text-gray-300" />
          </span>
          Non autorisé
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 3 : Attribution des rôles aux utilisateurs
// ══════════════════════════════════════════════════════════════════════════════

function UsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editingUser, setEditingUser] = useState(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter, search],
    queryFn: () => adminApi.listUsers({ role: roleFilter, search, per_page: 50 }).then(r => r.data.data?.data ?? r.data.data ?? []),
  })

  const users = usersData ?? []

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Attribution des rôles</h2>
          <p className="text-sm text-gray-500">Modifiez les rôles attribués aux utilisateurs</p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…" className="input-field pl-9 w-full" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field min-w-40">
            <option value="">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Liste */}
        {isLoading ? <LoadingPage /> : users.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur" description="Aucun résultat pour ces critères." />
        ) : (
          <Card>
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {(u.first_name?.[0] || '').toUpperCase()}{(u.last_name?.[0] || '').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(u.roles || []).map(role => {
                      const gradient = ROLE_COLORS[role] || 'from-gray-500 to-gray-600'
                      return (
                        <span key={role} className={`text-[11px] text-white bg-gradient-to-r ${gradient} px-2 py-0.5 rounded-lg font-medium`}>
                          {ROLE_LABELS[role] || role}
                        </span>
                      )
                    })}
                  </div>
                  <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setEditingUser(u)}>
                    Rôles
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {editingUser && (
        <UserRoleModal
          open
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
          }}
        />
      )}
    </>
  )
}

// ── Modal d'assignation de rôles à un utilisateur ────────────────────────────

function UserRoleModal({ open, user, onClose, onSuccess }) {
  const [selectedRoles, setSelectedRoles] = useState(user.roles || [])

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminApi.listRoles().then(r => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: (roles) => adminApi.assignUserRoles(user.id, { roles }),
    onSuccess: () => {
      toast.success('Rôles mis à jour')
      onSuccess()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  })

  const allRoles = rolesData ?? []

  const toggleRole = (roleName) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`Rôles de ${user.first_name} ${user.last_name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate(selectedRoles)} loading={mutation.isPending}
            disabled={selectedRoles.length === 0}>
            Enregistrer
          </Button>
        </>
      }
    >
      {selectedRoles.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Attention : l'utilisateur doit avoir au moins un rôle.</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-2">
          {allRoles.map(role => {
            const isSelected = selectedRoles.includes(role.name)
            const gradient = ROLE_COLORS[role.name] || 'from-gray-500 to-gray-600'

            return (
              <label
                key={role.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-primary-50/60 border-primary-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRole(role.name)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[role.name] || role.name}</p>
                  <p className="text-xs text-gray-500">{role.permissions_count} permissions</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary-600" />}
              </label>
            )
          })}
        </div>
      )}

      {/* Aperçu */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Rôles sélectionnés :</p>
        <div className="flex flex-wrap gap-1.5">
          {selectedRoles.length === 0 ? (
            <span className="text-xs text-gray-400 italic">Aucun rôle</span>
          ) : (
            selectedRoles.map(r => (
              <span key={r} className={`text-[11px] text-white bg-gradient-to-r ${ROLE_COLORS[r] || 'from-gray-500 to-gray-600'} px-2.5 py-1 rounded-lg font-medium`}>
                {ROLE_LABELS[r] || r}
              </span>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
