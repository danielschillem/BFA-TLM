import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Textarea, Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import AppLayout from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { toast } from 'sonner'
import {
  Building2, Plus, Search, Edit, Trash2, Phone,
  Mail, Users, MapPin, ToggleLeft, ToggleRight, X, Save,
  ArrowLeft, Layers, Tag
} from 'lucide-react'

const EMPTY_FORM = {
  libelle: '', telephone: '', telephone_2: '', email: '',
  type_structure_id: '', localite_id: '',
}

const EMPTY_SERVICE_FORM = { libelle: '', code: '', telephone: '' }
const EMPTY_TYPE_FORM = { libelle: '', description: '' }

export default function StructureManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStructure, setEditingStructure] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Service management state
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM)
  const [deleteServiceConfirm, setDeleteServiceConfirm] = useState(null)

  // Type de structure management state
  const [showTypeView, setShowTypeView] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM)
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState(null)

  // Structures
  const { data, isLoading } = useQuery({
    queryKey: ['admin-structures', search],
    queryFn: () => adminApi.listStructures({ search: search || undefined }).then(r => r.data),
  })

  // Types de structures
  const { data: typesData } = useQuery({
    queryKey: ['admin-type-structures'],
    queryFn: () => adminApi.listTypeStructures().then(r => r.data),
  })

  // ── Type de structure mutations ──
  const createTypeMutation = useMutation({
    mutationFn: (data) => adminApi.createTypeStructure(data),
    onSuccess: () => {
      toast.success('Type de structure créé')
      queryClient.invalidateQueries({ queryKey: ['admin-type-structures'] })
      closeTypeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la création'),
  })

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateTypeStructure(id, data),
    onSuccess: () => {
      toast.success('Type de structure mis à jour')
      queryClient.invalidateQueries({ queryKey: ['admin-type-structures'] })
      closeTypeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  const deleteTypeMutation = useMutation({
    mutationFn: (id) => adminApi.deleteTypeStructure(id),
    onSuccess: () => {
      toast.success('Type de structure supprimé')
      queryClient.invalidateQueries({ queryKey: ['admin-type-structures'] })
      setDeleteTypeConfirm(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de supprimer'),
  })

  const closeTypeModal = () => {
    setShowTypeModal(false)
    setEditingType(null)
    setTypeForm(EMPTY_TYPE_FORM)
  }

  const openCreateType = () => {
    setTypeForm(EMPTY_TYPE_FORM)
    setEditingType(null)
    setShowTypeModal(true)
  }

  const openEditType = (type) => {
    setTypeForm({
      libelle: type.libelle || type.name || '',
      description: type.description || '',
    })
    setEditingType(type)
    setShowTypeModal(true)
  }

  const handleTypeSubmit = (e) => {
    e.preventDefault()
    if (!typeForm.libelle.trim()) {
      toast.error('Le libellé est obligatoire')
      return
    }
    const payload = { libelle: typeForm.libelle.trim(), description: typeForm.description || null }
    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data: payload })
    } else {
      createTypeMutation.mutate(payload)
    }
  }

  const isSavingType = createTypeMutation.isPending || updateTypeMutation.isPending

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createStructure(data),
    onSuccess: () => {
      toast.success('Structure créée avec succès')
      queryClient.invalidateQueries({ queryKey: ['admin-structures'] })
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la création'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateStructure(id, data),
    onSuccess: () => {
      toast.success('Structure mise à jour')
      queryClient.invalidateQueries({ queryKey: ['admin-structures'] })
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la mise à jour'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteStructure(id),
    onSuccess: () => {
      toast.success('Structure supprimée')
      queryClient.invalidateQueries({ queryKey: ['admin-structures'] })
      setDeleteConfirm(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de supprimer'),
  })

  // ── Services queries & mutations ──
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['admin-structure-services', selectedStructure?.id],
    queryFn: () => adminApi.listServices(selectedStructure.id).then(r => r.data),
    enabled: !!selectedStructure,
  })

  const createServiceMutation = useMutation({
    mutationFn: (data) => adminApi.createService(selectedStructure.id, data),
    onSuccess: () => {
      toast.success('Service créé')
      queryClient.invalidateQueries({ queryKey: ['admin-structure-services', selectedStructure?.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-structures'] })
      closeServiceModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la création'),
  })

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateService(selectedStructure.id, id, data),
    onSuccess: () => {
      toast.success('Service mis à jour')
      queryClient.invalidateQueries({ queryKey: ['admin-structure-services', selectedStructure?.id] })
      closeServiceModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la mise à jour'),
  })

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId) => adminApi.deleteService(selectedStructure.id, serviceId),
    onSuccess: () => {
      toast.success('Service supprimé')
      queryClient.invalidateQueries({ queryKey: ['admin-structure-services', selectedStructure?.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-structures'] })
      setDeleteServiceConfirm(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de supprimer'),
  })

  const closeModal = () => {
    setShowModal(false)
    setEditingStructure(null)
    setForm(EMPTY_FORM)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingStructure(null)
    setShowModal(true)
  }

  const openEdit = (structure) => {
    setForm({
      libelle: structure.name || structure.libelle || '',
      telephone: structure.phone || structure.telephone || '',
      telephone_2: structure.telephone_2 || '',
      email: structure.email || '',
      type_structure_id: structure.type?.id || structure.type_structure_id || '',
      localite_id: structure.localite?.id || structure.localite_id || '',
    })
    setEditingStructure(structure)
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.libelle.trim()) {
      toast.error('Le nom est obligatoire')
      return
    }

    const payload = {
      libelle: form.libelle.trim(),
      telephone: form.telephone || null,
      telephone_2: form.telephone_2 || null,
      email: form.email || null,
      type_structure_id: form.type_structure_id || null,
      localite_id: form.localite_id || null,
    }

    if (editingStructure) {
      updateMutation.mutate({ id: editingStructure.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // ── Service helpers ──
  const closeServiceModal = () => {
    setShowServiceModal(false)
    setEditingService(null)
    setServiceForm(EMPTY_SERVICE_FORM)
  }

  const openCreateService = () => {
    setServiceForm(EMPTY_SERVICE_FORM)
    setEditingService(null)
    setShowServiceModal(true)
  }

  const openEditService = (service) => {
    setServiceForm({
      libelle: service.name || service.libelle || '',
      code: service.code || '',
      telephone: service.phone || service.telephone || '',
    })
    setEditingService(service)
    setShowServiceModal(true)
  }

  const handleServiceSubmit = (e) => {
    e.preventDefault()
    if (!serviceForm.libelle.trim() || !serviceForm.code.trim()) {
      toast.error('Le nom et le code sont obligatoires')
      return
    }
    const payload = {
      libelle: serviceForm.libelle.trim(),
      code: serviceForm.code.trim(),
      telephone: serviceForm.telephone || null,
    }
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: payload })
    } else {
      createServiceMutation.mutate(payload)
    }
  }

  const servicesList = servicesData?.data || []
  const isSavingService = createServiceMutation.isPending || updateServiceMutation.isPending

  const structures = data?.data?.data || data?.data || []
  const typeStructures = typesData?.data?.data || typesData?.data || []
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) return <AppLayout title="Structures"><LoadingPage /></AppLayout>

  // ── Types de structures view ──
  if (showTypeView) {
    return (
      <AppLayout title="Types de structures">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowTypeView(false)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Types de structures</h1>
                <p className="text-gray-500 mt-1">{typeStructures.length} type(s)</p>
              </div>
            </div>
            <Button variant="primary" icon={Plus} onClick={openCreateType}>
              Nouveau type
            </Button>
          </div>

          {typeStructures.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Aucun type de structure"
              description="Créez des types pour classifier vos structures sanitaires."
              action={<Button variant="primary" icon={Plus} onClick={openCreateType}>Créer un type</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {typeStructures.map(type => (
                <Card key={type.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Tag className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{type.libelle || type.name}</h3>
                          {type.structures_count != null && (
                            <span className="text-xs text-gray-500">{type.structures_count} structure(s)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-500 mb-3">{type.description}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                      <Button size="xs" variant="outline" icon={Edit} onClick={() => openEditType(type)}>
                        Modifier
                      </Button>
                      <Button size="xs" variant="danger" icon={Trash2} onClick={() => setDeleteTypeConfirm(type)}>
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Type create/edit modal */}
          <Modal
            open={showTypeModal}
            onClose={closeTypeModal}
            title={editingType ? 'Modifier le type' : 'Nouveau type de structure'}
            size="md"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeTypeModal}>Annuler</Button>
                <Button variant="primary" icon={Save} loading={isSavingType} onClick={handleTypeSubmit}>
                  {editingType ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            }
          >
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <Input
                label="Libellé *"
                placeholder="Ex: CHU, CMA, CSPS, Clinique…"
                value={typeForm.libelle}
                onChange={(e) => setTypeForm({ ...typeForm, libelle: e.target.value })}
                required
              />
              <Textarea
                label="Description"
                placeholder="Description du type de structure"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                rows={3}
              />
            </form>
          </Modal>

          {/* Type delete confirm */}
          <Modal
            open={!!deleteTypeConfirm}
            onClose={() => setDeleteTypeConfirm(null)}
            title="Confirmer la suppression"
            size="sm"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteTypeConfirm(null)}>Annuler</Button>
                <Button variant="danger" icon={Trash2} loading={deleteTypeMutation.isPending}
                  onClick={() => deleteTypeMutation.mutate(deleteTypeConfirm.id)}>
                  Supprimer
                </Button>
              </div>
            }
          >
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer le type{' '}
              <span className="font-semibold">{deleteTypeConfirm?.libelle || deleteTypeConfirm?.name}</span> ?
            </p>
          </Modal>
        </div>
      </AppLayout>
    )
  }

  // ── Service detail view for a selected structure ──
  if (selectedStructure) {
    return (
      <AppLayout title={`Services — ${selectedStructure.name || selectedStructure.libelle}`}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedStructure(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Services de {selectedStructure.name || selectedStructure.libelle}
                </h1>
                <p className="text-gray-500 mt-1">{servicesList.length} service(s)</p>
              </div>
            </div>
            <Button variant="primary" icon={Plus} onClick={openCreateService}>
              Nouveau service
            </Button>
          </div>

          {loadingServices ? <LoadingPage /> : servicesList.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Aucun service"
              description="Ajoutez des services à cette structure."
              action={<Button variant="primary" icon={Plus} onClick={openCreateService}>Créer un service</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {servicesList.map(service => (
                <Card key={service.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{service.name || service.libelle}</h3>
                          <span className="text-xs text-gray-500">Code : {service.code}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        (service.active ?? service.actif) !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(service.active ?? service.actif) !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      {(service.phone || service.telephone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{service.phone || service.telephone}</span>
                        </div>
                      )}
                      {service.users_count != null && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{service.users_count} professionnel(s)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                      <Button size="xs" variant="outline" icon={Edit} onClick={() => openEditService(service)}>
                        Modifier
                      </Button>
                      <Button size="xs" variant="danger" icon={Trash2} onClick={() => setDeleteServiceConfirm(service)}>
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Service create/edit modal */}
          <Modal
            open={showServiceModal}
            onClose={closeServiceModal}
            title={editingService ? 'Modifier le service' : 'Nouveau service'}
            size="md"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeServiceModal}>Annuler</Button>
                <Button variant="primary" icon={Save} loading={isSavingService} onClick={handleServiceSubmit}>
                  {editingService ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            }
          >
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <Input
                label="Nom du service *"
                placeholder="Cardiologie"
                value={serviceForm.libelle}
                onChange={(e) => setServiceForm({ ...serviceForm, libelle: e.target.value })}
                required
              />
              <Input
                label="Code du service *"
                placeholder="CARDIO"
                value={serviceForm.code}
                onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                required
              />
              <Input
                label="Téléphone"
                type="tel"
                placeholder="25 30 XX XX"
                value={serviceForm.telephone}
                onChange={(e) => setServiceForm({ ...serviceForm, telephone: e.target.value })}
                icon={Phone}
              />
            </form>
          </Modal>

          {/* Service delete confirm */}
          <Modal
            open={!!deleteServiceConfirm}
            onClose={() => setDeleteServiceConfirm(null)}
            title="Confirmer la suppression"
            size="sm"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteServiceConfirm(null)}>Annuler</Button>
                <Button variant="danger" icon={Trash2} loading={deleteServiceMutation.isPending}
                  onClick={() => deleteServiceMutation.mutate(deleteServiceConfirm.id)}>
                  Supprimer
                </Button>
              </div>
            }
          >
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer le service{' '}
              <span className="font-semibold">{deleteServiceConfirm?.name || deleteServiceConfirm?.libelle}</span> ?
            </p>
          </Modal>
        </div>
      </AppLayout>
    )
  }

  // ── Main structures list view ──
  return (
    <AppLayout title="Structures sanitaires">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Structures sanitaires</h1>
          <p className="text-gray-500 mt-1">{structures.length} structure(s) enregistrée(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Tag} onClick={() => setShowTypeView(true)}>
            Types de structures
          </Button>
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Nouvelle structure
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {structures.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune structure"
          description="Créez votre première structure sanitaire."
          action={
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Créer une structure
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {structures.map((structure) => (
            <Card key={structure.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{structure.name || structure.libelle}</h3>
                      {structure.type && (
                        <span className="text-xs text-gray-500">
                          {structure.type.name || structure.type.libelle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    structure.active ?? structure.actif
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {(structure.active ?? structure.actif) ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600">
                  {(structure.phone || structure.telephone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{structure.phone || structure.telephone}</span>
                    </div>
                  )}
                  {structure.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{structure.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    {structure.services_count != null && (
                      <span>{structure.services_count} service(s)</span>
                    )}
                    {structure.users_count != null && (
                      <span><Users className="w-3 h-3 inline" /> {structure.users_count} utilisateur(s)</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button size="xs" variant="outline" icon={Layers} onClick={() => setSelectedStructure(structure)}>
                    Services
                  </Button>
                  <Button size="xs" variant="outline" icon={Edit} onClick={() => openEdit(structure)}>
                    Modifier
                  </Button>
                  <Button size="xs" variant="danger" icon={Trash2} onClick={() => setDeleteConfirm(structure)}>
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal formulaire Create/Edit */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingStructure ? 'Modifier la structure' : 'Nouvelle structure'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>Annuler</Button>
            <Button variant="primary" icon={Save} loading={isSaving} onClick={handleSubmit}>
              {editingStructure ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom de la structure *"
            placeholder="CHU de Ouagadougou"
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              placeholder="25 30 XX XX"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              icon={Phone}
            />
            <Input
              label="Téléphone 2"
              type="tel"
              placeholder="70 XX XX XX"
              value={form.telephone_2}
              onChange={(e) => setForm({ ...form, telephone_2: e.target.value })}
              icon={Phone}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="contact@structure.bf"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
          />

          {typeStructures.length > 0 && (
            <Select
              label="Type de structure"
              value={form.type_structure_id}
              onChange={(e) => setForm({ ...form, type_structure_id: e.target.value })}
              options={[
                { value: '', label: '— Sélectionner un type —' },
                ...typeStructures.map((t) => ({
                  value: t.id,
                  label: t.name || t.libelle,
                })),
              ]}
            />
          )}
        </form>
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
            >
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Êtes-vous sûr de vouloir supprimer la structure{' '}
          <span className="font-semibold">{deleteConfirm?.name || deleteConfirm?.libelle}</span> ?
          Cette action est irréversible.
        </p>
      </Modal>
    </div>
    </AppLayout>
  )
}
