import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// DEV-ONLY DESIGN TWEAKS. Lets the owner try UI variants live from the dev
// panel (DevRoleSwitcher) and persist the choice in localStorage.
//
// REMOVAL: once a variant is chosen, hard-code it in its component and delete
// this file plus the "Tweaks" block in DevRoleSwitcher.tsx.
// ---------------------------------------------------------------------------

export const FLIP_NAV_VARIANTS = [
  { value: 'overlay', label: 'Overlay arrows (current)' },
  { value: 'bar', label: 'Bottom bar: ‹ dots ›' },
  { value: 'hover', label: 'Hover arrows (desktop), dots only on touch' },
  { value: 'dots', label: 'Dots only (swipe/tap dots)' },
  { value: 'tap', label: 'Tap card (left ⅓ back, right ⅔ next) + bottom bar' },
] as const

export type FlipNavVariant = (typeof FLIP_NAV_VARIANTS)[number]['value']

const KEY = 'ms.tweak.flipNav'
const listeners = new Set<() => void>()

function read(): FlipNavVariant {
  try {
    const v = localStorage.getItem(KEY)
    if (FLIP_NAV_VARIANTS.some((o) => o.value === v)) return v as FlipNavVariant
  } catch {
    /* storage unavailable */
  }
  return 'overlay'
}

let current = read()

export function setFlipNavVariant(v: FlipNavVariant) {
  current = v
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useFlipNavVariant(): FlipNavVariant {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
