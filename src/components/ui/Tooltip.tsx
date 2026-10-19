import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Styled dark tooltip (replaces native `title` tooltips). Opens on mouse
 *  hover and keyboard focus; on touch, a tap toggles it when `tapToggle` is
 *  set (for triggers whose only job is to reveal the tip — e.g. availability
 *  chips) and a tap anywhere else closes it. Renders above the trigger;
 *  `align` picks which edge it hugs so tips near a card edge stay inside. */
export function Tooltip({
  content,
  children,
  align = 'start',
  tapToggle = false,
  className = '',
}: {
  content: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  tapToggle?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const lastPointer = useRef<string>('mouse')

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const position = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }[align]
  const arrow = {
    start: 'left-3.5',
    center: 'left-1/2 -ml-1',
    end: 'right-3.5',
  }[align]

  return (
    <span
      ref={ref}
      className={`relative inline-flex ${className}`}
      onPointerDown={(e) => (lastPointer.current = e.pointerType)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onFocus={(e) => {
        // Keyboard focus only — a tap also focuses the trigger.
        if ((e.target as Element).matches(':focus-visible')) setOpen(true)
      }}
      onBlur={() => setOpen(false)}
      onClick={() => {
        if (tapToggle && lastPointer.current !== 'mouse') setOpen((o) => !o)
      }}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-[240px] rounded-[7px] bg-ink px-2.5 py-1.5 text-left text-xs font-medium leading-4 text-white shadow-tooltip ${position}`}
        >
          {content}
          <span
            className={`absolute top-full h-2 w-2 -translate-y-1 rotate-45 bg-ink ${arrow}`}
            aria-hidden
          />
        </span>
      )}
    </span>
  )
}
