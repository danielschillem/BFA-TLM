import { cn } from "@/utils/cn";
import { Spinner } from "@/components/common/LoadingSpinner";

const variants = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500/30",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300",
  outline:
    "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30",
  ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500/30",
};
const sizes = {
  xs: "px-2.5 py-1 text-xs rounded-md",
  sm: "px-3 py-1.5 text-[13px] rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-sm rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon: Icon,
  children,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          className="border-current border-t-current opacity-60"
        />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      {children}
    </button>
  );
}
