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

export const downloadBlob = (blob, filename, mimeType) => {
  const finalBlob = mimeType ? new Blob([blob], { type: mimeType }) : blob
  const url = URL.createObjectURL(finalBlob)
  const a   = document.createElement('a')
  a.href    = url
  a.download= filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Ouvrir un blob PDF dans un nouvel onglet pour aperçu / impression navigateur.
 */
export const previewPdfBlob = (blob) => {
  const finalBlob = new Blob([blob], { type: 'application/pdf' })
  const url = URL.createObjectURL(finalBlob)
  window.open(url, '_blank')
}

/**
 * Impression d'un contenu HTML quelconque (render dans une iframe cachée).
 * @param {string} title - Titre du document imprimé
 * @param {string} bodyHtml - HTML du corps à imprimer
 */
export const printHtml = (title, bodyHtml) => {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.left = '-9999px'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
  h1 { font-size: 18px; color: #0891b2; margin: 0 0 6px; }
  h2 { font-size: 15px; color: #334155; margin: 12px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 13px; color: #0891b2; margin: 10px 0 4px; }
  .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-bottom: 15px; }
  .header p { color: #666; margin: 2px 0; font-size: 10px; }
  .meta-grid { display: flex; gap: 20px; margin-bottom: 15px; }
  .meta-col { flex: 1; }
  .label { color: #888; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fecaca; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
  th { background: #f1f5f9; color: #334155; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  .section { margin-bottom: 12px; }
  .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #999; font-size: 9px; }
  .no-print { display: none !important; }
</style>
</head><body>${bodyHtml}</body></html>`)
  doc.close()

  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => document.body.removeChild(iframe), 3000)
}
