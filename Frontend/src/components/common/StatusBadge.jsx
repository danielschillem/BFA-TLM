import { cn } from '@/utils/cn'
import { APPOINTMENT_STATUS_CONFIG, URGENCY_CONFIG, TELEEXPERTISE_STATUS_CONFIG } from '@/utils/helpers'

export function AppointmentBadge({ status }) {
  const cfg = APPOINTMENT_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={cn('status-badge', cfg.color)}>{cfg.label}</span>
}

export function UrgencyBadge({ urgency, level }) {
  const cfg = URGENCY_CONFIG[urgency ?? level] ?? URGENCY_CONFIG.normal
  return <span className={cn('status-badge', cfg.color)}>{cfg.label}</span>
}

export function TeleexpertiseBadge({ status }) {
  const cfg = TELEEXPERTISE_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={cn('status-badge', cfg.color)}>{cfg.label}</span>
}
