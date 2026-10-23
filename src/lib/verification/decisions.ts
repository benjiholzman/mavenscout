import { supabase } from '../supabase'
import type { Profile, VerificationEvidence, VerificationMethod, VerificationOutcome } from '../../types/db'
import { bioFingerprint } from './items'
import { withRecheck } from './recheck'
import type { ItemState } from './state'

// Admin decisions (docs/MavenScout-profiles-membership.md §3.1): a human
// decides, after the AI first pass. Each decision is an audit row (what,
// how, by whom, when), and the evidence for that item is deleted straight
// after: the audit row keeps only its kind, type and size, never the file
// name or the document (§3.1 "Documents are deleted after review").
//
// ⚠ STUB: evidence files are never stored in this build
// (lib/verification/store), so "deleting the document" deletes its row and a
// placeholder path. The hardening pass deletes the private Storage object.

/** Which methods fit each label, per item kind (§3.1 "How"). */
export const METHODS: Record<ItemState['kind'], { confirmed: VerificationMethod[]; document_reviewed: boolean }> = {
  identity: { confirmed: ['id_provider'], document_reviewed: false },
  employer: { confirmed: ['referee_email', 'public_document'], document_reviewed: true },
  degree: { confirmed: ['degree_service'], document_reviewed: true },
  certification: { confirmed: ['registry'], document_reviewed: true },
}

export const METHOD_LABELS: Record<VerificationMethod, string> = {
  id_provider: 'ID + selfie check',
  registry: 'Public register',
  degree_service: 'Degree-verification service',
  document: 'Document reviewed',
  public_document: 'Public document naming them',
  referee_email: 'Referee’s work email',
  admin_review: 'Admin review',
}

/** The evidence as the audit record keeps it: no names, no contents. */
function evidenceSummary(rows: VerificationEvidence[]) {
  return rows.map((r) => (r.link_url ? { kind: 'link' } : { kind: 'file', mime_type: r.mime_type, size: r.file_size }))
}

/** STUB: deletes the evidence rows (and, in the real version, the files). */
async function deleteEvidence(rows: VerificationEvidence[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('verification_evidence').delete().in('id', rows.map((r) => r.id))
  if (error) throw new Error(error.message)
}

export interface Decision {
  outcome: Extract<VerificationOutcome, 'confirmed' | 'document_reviewed' | 'unverifiable'>
  method: VerificationMethod | null
  note: string
  adminName: string
}

/** Records the decision, deletes the item's evidence, and for a certification
 *  that can't be verified, removes it from the profile (§3.1: unverifiable
 *  certifications can't be listed). */
export function decideItem(profile: Profile, item: ItemState, d: Decision): Promise<void> {
  return withRecheck(profile.id, async () => {
    const now = new Date().toISOString()
    const { error } = await supabase.from('verification_checks').insert({
      profile_id: profile.id,
      item_kind: item.kind,
      item_id: item.id,
      item_summary: item.summary,
      item_fingerprint: item.fingerprint,
      outcome: d.outcome,
      method: d.outcome === 'document_reviewed' ? 'document' : d.outcome === 'unverifiable' ? 'admin_review' : d.method,
      actor: 'admin',
      actor_name: d.adminName,
      detail: {
        ...(d.note.trim() ? { note: d.note.trim() } : {}),
        evidence: evidenceSummary(item.evidence),
        ...(item.evidence.length ? { evidence_deleted_at: now } : {}),
        ...(d.outcome === 'unverifiable' && item.kind === 'certification' ? { removed_from_profile: true } : {}),
      },
    })
    if (error) throw new Error(error.message)
    await deleteEvidence(item.evidence)
    if (d.outcome === 'unverifiable' && item.kind === 'certification') {
      const { data } = await supabase.from('profiles').select('accreditations').eq('id', profile.id).single()
      const accreditations = ((data?.accreditations ?? []) as Profile['accreditations']).filter((a) => a.id !== item.id)
      const { error: e2 } = await supabase.from('profiles').update({ accreditations }).eq('id', profile.id)
      if (e2) throw new Error(e2.message)
    }
  })
}

/** Asks the consultant to edit claims in their bio (§3.1 "Bio"). The request
 *  shows in their editor until they save a new version. */
export async function requestBioEdits(profile: Profile, note: string, adminName: string): Promise<void> {
  const { error } = await supabase.from('verification_checks').insert({
    profile_id: profile.id,
    item_kind: 'bio',
    item_id: 'bio',
    item_summary: (profile.detailed_bio ?? '').slice(0, 140),
    item_fingerprint: bioFingerprint(profile),
    outcome: 'edits_requested',
    method: 'admin_review',
    actor: 'admin',
    actor_name: adminName,
    detail: { note: note.trim() },
  })
  if (error) throw new Error(error.message)
}
