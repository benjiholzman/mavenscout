import type { ReactNode } from 'react'

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  hint,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
  hint?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm">
      <span className="flex items-baseline justify-between font-medium">
        {label}
        {maxLength && (
          <span className={`text-xs font-normal ${value.length > maxLength ? 'text-red-600' : 'text-ink-faint'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {hint && <span className="mt-0.5 block text-xs font-normal text-ink-faint">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  rows?: number
  hint?: string
}) {
  return (
    <label className="block text-sm">
      <span className="flex items-baseline justify-between font-medium">
        {label}
        {maxLength && (
          <span className={`text-xs font-normal ${value.length > maxLength ? 'text-red-600' : 'text-ink-faint'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {hint && <span className="mt-0.5 block text-xs font-normal text-ink-faint">{hint}</span>}
    </label>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

/** Small list-item frame with a remove button — used by every list editor. */
export function ListItemCard({
  children,
  onRemove,
  removeBlockedReason,
}: {
  children: ReactNode
  onRemove: () => void
  /** When set, the entry can't be removed; shown as the button's tooltip. */
  removeBlockedReason?: string | null
}) {
  return (
    <div className="relative rounded-xl border border-line bg-paper/60 p-3.5">
      <button
        onClick={onRemove}
        disabled={!!removeBlockedReason}
        title={removeBlockedReason ?? undefined}
        aria-label={removeBlockedReason ? `Can't remove: ${removeBlockedReason}` : 'Remove entry'}
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-ink-faint hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
      >
        ✕
      </button>
      <div className="space-y-2.5 pr-6">{children}</div>
    </div>
  )
}
