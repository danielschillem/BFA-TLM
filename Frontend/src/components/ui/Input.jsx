import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, hint, icon: Icon, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
    <div className="relative">
      {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Icon className="w-4 h-4" /></div>}
      <input
        ref={ref}
        className={cn(
          'input-field',
          Icon && 'pl-10',
          error && 'border-red-400 focus:ring-red-500/25 focus:border-red-400',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef(({ label, error, hint, className, rows = 4, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
    <textarea
      ref={ref}
      rows={rows}
      className={cn('input-field resize-none', error && 'border-red-400 focus:ring-red-500/25', className)}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef(({ label, error, options = [], placeholder, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
    <select
      ref={ref}
      className={cn('input-field bg-white/80', error && 'border-red-400 focus:ring-red-500/25', className)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
))
Select.displayName = 'Select'

export default Input
