import { TESTIMONIAL_RULES } from '../config'

// "Confirm it's me" codes (docs/MavenScout-profiles-membership.md §4.3 step 2):
// 6 digits, single-use, valid ~10 minutes, limited attempts.
//
// ⚠ Client-side in this build: the browser generates the code, stores only its
// hash, and compares hashes. Anyone with the anon key can read the hash (and a
// 6-digit hash is trivially brute-forced), so this is a SCAFFOLD for the
// hardening pass, which generates, emails and verifies the code server-side.

export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Salted with the testimonial id, so equal codes never share a hash. */
export function hashSecret(secret: string, testimonialId: string): Promise<string> {
  return sha256(`${testimonialId}:${secret}`)
}

export function codeExpiry(from = new Date()): string {
  return new Date(from.getTime() + TESTIMONIAL_RULES.codeTtlMinutes * 60_000).toISOString()
}

export function normalizeCodeInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6)
}
