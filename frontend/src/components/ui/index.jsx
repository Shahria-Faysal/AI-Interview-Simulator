/**
 * components/ui/index.jsx
 * Shared primitive UI components used across all pages.
 */

import { Loader2 } from 'lucide-react'

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, className = '', ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-brand-500',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-slate-600 hover:bg-slate-100 focus:ring-brand-500',
  }

  const sizes = {
    sm:  'text-xs px-3 py-1.5',
    md:  'text-sm px-4 py-2.5',
    lg:  'text-base px-6 py-3',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ─── Textarea ────────────────────────────────────────────────────────────────

export function Textarea({ label, error, hint, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`input resize-none ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`input appearance-none cursor-pointer ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────

const badgeVariants = {
  default:  'bg-slate-100 text-slate-700',
  brand:    'bg-brand-100 text-brand-700',
  success:  'bg-green-100 text-green-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  easy:     'bg-green-100 text-green-700',
  medium:   'bg-amber-100 text-amber-700',
  hard:     'bg-red-100 text-red-700',
}

export function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 24, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-brand-600 ${className}`}
    />
  )
}

// ─── PageLoader ──────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size={36} />
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
          <Icon size={24} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

// ─── PageHeader ──────────────────────────────────────────────────────────────

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── ErrorAlert ──────────────────────────────────────────────────────────────

export function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
      <span className="font-medium">{message}</span>
    </div>
  )
}
