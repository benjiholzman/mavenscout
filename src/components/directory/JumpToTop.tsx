import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

const SHOW_AFTER_PX = 600

/** Floating "back to top" for the long directory grid. Appears once the page
 *  is scrolled past the filter bar; sits above the dev role switcher's
 *  bottom-right button (bottom-4, ~40px tall) so the two never overlap. */
export function JumpToTop() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Jump to top"
      title="Jump to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`fixed bottom-[4.5rem] right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-lg transition duration-200 hover:border-ink-faint hover:text-ink ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  )
}
