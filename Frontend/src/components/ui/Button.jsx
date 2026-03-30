import { cn } from '@/utils/cn'
import { Spinner } from '@/components/common/LoadingSpinner'

const variants = {
  primary:   'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500 shadow-md hover:shadow-lg',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
  outline:   'border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50 focus:ring-primary-400',
  danger:    'bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 focus:ring-red-500 shadow-md hover:shadow-lg',
  ghost:     'text-gray-600 hover:bg-gray-100/80 focus:ring-gray-400',
  success:   'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 focus:ring-green-500 shadow-md hover:shadow-lg',
}
const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
}

export default function Button({ variant = 'primary', size = 'md', loading, disabled, icon: Icon, children, className, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" className="border-current border-t-current opacity-60" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}
