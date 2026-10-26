import { Info } from 'lucide-react'

/** Small info icon with a hover/focus popover — e.g. the Small/Large Firm
 *  threshold definition (PRD 7.19). `below` / `align="end"` keep it inside a
 *  scrolling panel's edges. */
export function InfoTip({
  text,
  below = false,
  align = 'center',
}: {
  text: string
  below?: boolean
  align?: 'center' | 'end'
}) {
  const vertical = below ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
  const horizontal = align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      <Info size={13} className="text-ink-faint" aria-hidden />
      <span className="sr-only">{text}</span>
      <span
        className={`pointer-events-none absolute z-30 w-52 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100 ${vertical} ${horizontal}`}
      >
        {text}
      </span>
    </span>
  )
}
