import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

/** Dialog that renders as a centered modal on desktop and a bottom sheet on
 *  mobile — the PRD's hard modals (filters, availability, JD ranking) must be
 *  genuinely usable at phone width. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  fullScreenMobile = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  /** Below sm, fill the screen instead of a bottom sheet (long content). */
  fullScreenMobile?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex justify-center sm:items-center ${fullScreenMobile ? 'items-stretch' : 'items-end'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative z-10 w-full overflow-y-auto bg-white p-5 shadow-xl sm:m-4 sm:max-h-[85vh] sm:rounded-2xl ${
              fullScreenMobile ? 'h-full sm:h-auto' : 'max-h-[85vh] rounded-t-2xl'
            } ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
            initial={{ y: 48, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-ink-faint hover:bg-paper hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
