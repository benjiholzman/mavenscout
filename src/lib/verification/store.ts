import { supabase } from '../supabase'
import type { Profile, VerificationCheck, VerificationEvidence, VerificationItemKind } from '../../types/db'
import { identityFingerprint, type VerificationItem } from './items'

// Reading and writing verification data (docs/MavenScout-profiles-membership.md
// §3; 016): the audit record (verification_checks) and evidence awaiting
// review (verification_evidence).
//
// ⚠ SCAFFOLDED, flagged for the hardening pass:
// - Evidence storage is STUBBED. Employment letters, contracts and degree
//   certificates are the most sensitive data in the app, so no file is ever
//   uploaded in this build: only the file's name, type and size are recorded,
//   against a placeholder path. The real version needs a private bucket,
//   admin-only access and deletion after review.
// - The ID + selfie check is a PLACEHOLDER for a provider such as Stripe
//   Identity or Persona: the consultant picks the outcome. MavenScout keeps
//   only the result, never the ID document.
// - Rows are written with the anon key under the dev policies.

export async function loadVerification(
  profileId: string,
): Promise<{ checks: VerificationCheck[]; evidence: VerificationEvidence[] }> {
  const [{ data: checks }, { data: evidence }] = await Promise.all([
    supabase.from('verification_checks').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    supabase.from('verification_evidence').select('*').eq('profile_id', profileId).order('created_at'),
  ])
  return {
    checks: (checks as VerificationCheck[]) ?? [],
    evidence: (evidence as VerificationEvidence[]) ?? [],
  }
}

/** Placeholder ID + selfie check (§3.1). Stores the result only. */
export async function runPlaceholderIdCheck(profile: Profile, passed: boolean): Promise<void> {
  const { error } = await supabase.from('verification_checks').insert({
    profile_id: profile.id,
    item_kind: 'identity',
    item_id: 'identity',
    item_summary: profile.name,
    item_fingerprint: identityFingerprint(profile),
    outcome: passed ? 'provider_passed' : 'provider_failed',
    method: 'id_provider',
    actor: 'provider',
    actor_name: 'ID provider (placeholder)',
    detail: {
      placeholder: true,
      name_on_id_matches: passed,
      selfie_matches_id: passed,
      note: 'Placeholder result: no ID provider is connected in this build.',
    },
  })
  if (error) throw new Error(error.message)
}

/** Files evidence can be: PDFs and photos of documents. */
export const EVIDENCE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024

export function evidenceFileProblem(file: File): string | null {
  if (!(EVIDENCE_TYPES as readonly string[]).includes(file.type)) return 'Use a PDF, JPG or PNG.'
  if (file.size > EVIDENCE_MAX_BYTES) return 'Keep it under 10 MB.'
  return null
}

type EvidenceItem = Pick<VerificationItem, 'kind' | 'id'> & { kind: Exclude<VerificationItemKind, 'identity'> }

/** STUB: records the document without storing it (see the note above). */
export async function addEvidenceFile(profileId: string, item: EvidenceItem, file: File, explanation: string): Promise<void> {
  const problem = evidenceFileProblem(file)
  if (problem) throw new Error(problem)
  const { error } = await supabase.from('verification_evidence').insert({
    profile_id: profileId,
    item_kind: item.kind,
    item_id: item.id,
    file_path: `stub://verification-evidence/${profileId}/${crypto.randomUUID()}`,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    explanation: explanation.trim() || null,
  })
  if (error) throw new Error(error.message)
}

/** A public document naming the consultant (employer only, §3.1). */
export async function addEvidenceLink(profileId: string, item: EvidenceItem, url: string, explanation: string): Promise<void> {
  const link = url.trim()
  if (!/^https?:\/\/\S+\.\S+/i.test(link)) throw new Error('Paste a full link, starting with https://')
  const { error } = await supabase.from('verification_evidence').insert({
    profile_id: profileId,
    item_kind: item.kind,
    item_id: item.id,
    link_url: link,
    explanation: explanation.trim() || null,
  })
  if (error) throw new Error(error.message)
}

/** The consultant takes back evidence before it's reviewed. */
export async function removeEvidence(row: VerificationEvidence): Promise<void> {
  const { error } = await supabase.from('verification_evidence').delete().eq('id', row.id)
  if (error) throw new Error(error.message)
}
