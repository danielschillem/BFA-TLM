import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Trash2, Clock, Video, Users } from 'lucide-react'
import { toast } from 'sonner'
import { directoryApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { formatDate, formatTime } from '@/utils/helpers'

const TYPE_LABELS = {
  teleconsultation: { label: 'Téléconsultation', icon: Video, color: 'text-primary-700 bg-primary-50' },
  presentiel:       { label: 'Présentiel',       icon: Users, color: 'text-green-700 bg-green-50' },
}

export default function DoctorSchedule() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '', type: 'teleconsultation' })

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: () => directoryApi.mySchedule().then(r => r.data.data ?? r.data ?? []),
  })

  const createMutation = useMutation({
    mutationFn: (data) => directoryApi.createSchedule(data),
    onSuccess: () => {
      toast.success('Créneau ajouté')
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] })
      setShowCreate(false)
      setForm({ date: '', start_time: '', end_time: '', type: 'teleconsultation' })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur lors de la création'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => directoryApi.deleteSchedule(id),
    onSuccess: () => {
      toast.success('Créneau supprimé')
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur lors de la suppression'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.date || !form.start_time || !form.end_time) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    createMutation.mutate(form)
  }

  // Group slots by date
  const grouped = slots.reduce((acc, slot) => {
    const d = slot.date ?? slot.start_date ?? 'Non défini'
    if (!acc[d]) acc[d] = []
    acc[d].push(slot)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  return (
    <AppLayout title="Mon agenda – Créneaux">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Gérez vos créneaux de disponibilité pour les rendez-vous.</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Nouveau créneau</Button>
        </div>

        {/* Slots list */}
        {isLoading ? <LoadingPage /> : sortedDates.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aucun créneau"
            description="Ajoutez des créneaux pour permettre aux patients de prendre rendez-vous."
            action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Ajouter un créneau</Button>}
          />
        ) : (
          <div className="space-y-4">
            {sortedDates.map(date => (
              <Card key={date}>
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <h3 className="font-semibold text-gray-900">{formatDate(date)}</h3>
                  <span className="text-xs text-gray-400 ml-auto">{grouped[date].length} créneau(x)</span>
                </div>
                <CardContent className="divide-y divide-gray-50">
                  {grouped[date].map(slot => {
                    const typeCfg = TYPE_LABELS[slot.type] ?? TYPE_LABELS.teleconsultation
                    const TypeIcon = typeCfg.icon
                    return (
                      <div key={slot.id} className="flex items-center gap-4 py-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {slot.start_time ?? slot.heure_debut} – {slot.end_time ?? slot.heure_fin}
                          </p>
                          <span className={`text-xs rounded-full px-2 py-0.5 inline-flex items-center gap-1 mt-1 ${typeCfg.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeCfg.label}
                          </span>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          icon={Trash2}
                          onClick={() => deleteMutation.mutate(slot.id)}
                          loading={deleteMutation.isPending}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          Supprimer
                        </Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Ajouter un créneau">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Heure début"
              type="time"
              value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              required
            />
            <Input
              label="Heure fin"
              type="time"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              required
            />
          </div>
          <Select
            label="Type"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="teleconsultation">Téléconsultation</option>
            <option value="presentiel">Présentiel</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
