import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const formatDate    = (d, fmt = 'dd/MM/yyyy')       => d ? format(new Date(d), fmt, { locale: fr }) : '—'
export const formatDateTime= (d)                            => d ? format(new Date(d), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '—'
export const formatTime    = (d)                            => d ? format(new Date(d), 'HH:mm', { locale: fr }) : '—'
export const fromNow       = (d)                            => d ? formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr }) : '—'

export const formatDateLabel = (d) => {
  const date = new Date(d)
  if (isToday(date))    return `Aujourd'hui à ${format(date, 'HH:mm')}`
  if (isTomorrow(date)) return `Demain à ${format(date, 'HH:mm')}`
  return formatDateTime(d)
}

export const formatCurrency = (amount, currency = 'XOF') => {
  if (currency === 'XOF') return `${Number(amount).toLocaleString('fr-FR')} FCFA`
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')

export const CONSULTATION_TYPES = {
  teleconsultation:               'Téléconsultation',
  presentiel:                     'Consultation physique',
}

export const APPOINTMENT_STATUS_CONFIG = {
  pending:           { label: 'En attente',  color: 'bg-yellow-100 text-yellow-800' },
  confirmed:         { label: 'Confirmé',    color: 'bg-green-100 text-green-800'  },
  cancelled:         { label: 'Annulé',      color: 'bg-red-100 text-red-800'     },
  cancelled_patient: { label: 'Annulé',      color: 'bg-red-100 text-red-800'     },
  cancelled_doctor:  { label: 'Annulé',      color: 'bg-red-100 text-red-800'     },
  in_progress:       { label: 'En cours',    color: 'bg-blue-100 text-blue-800'   },
  completed:         { label: 'Terminé',     color: 'bg-gray-100 text-gray-700'   },
  no_show:           { label: 'Absent',      color: 'bg-orange-100 text-orange-800'},
}

export const URGENCY_CONFIG = {
  low:         { label: 'Faible',      color: 'bg-green-100 text-green-700'     },
  normal:      { label: 'Normal',      color: 'bg-gray-100 text-gray-700'       },
  high:        { label: 'Élevé',       color: 'bg-orange-100 text-orange-800'   },
  urgent:      { label: 'Urgent',      color: 'bg-red-100 text-red-800'         },
}

export const TELEEXPERTISE_STATUS_CONFIG = {
  pending:     { label: 'En attente',  color: 'bg-yellow-100 text-yellow-800'   },
  accepted:    { label: 'Acceptée',    color: 'bg-blue-100 text-blue-800'       },
  responded:   { label: 'Répondue',    color: 'bg-green-100 text-green-800'     },
  rejected:    { label: 'Rejetée',     color: 'bg-red-100 text-red-800'         },
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download= filename
  a.click()
  URL.revokeObjectURL(url)
}
