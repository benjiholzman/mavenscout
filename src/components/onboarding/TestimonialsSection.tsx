import { AlertTriangle, Check, Clock, Copy, Mail, MessageCircle, Mic, RefreshCw, Share2, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadOrgIndex } from '../../lib/organizations'
import { membershipLimits } from '../../lib/membership'
import { firstName } from '../../lib/names'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/dates'
import { canRemove, publishTestimonial, removeTestimonial } from '../../lib/testimonials/lifecycle'
import { PRECHECK_IS_PLACEHOLDER } from '../../lib/testimonials/precheck'
import {
  cancelRequest,
  createRequest,
  requestUrl,
  suggestedMessage,
  type RequestDetails,
} from '../../lib/testimonials/requests'
import { holdsLink } from '../../lib/testimonials/integrity'
import {
  canReplace,
  isActive,
  isLegacy,
  isRequired,
  periodLabel,
  PROGRESS_STAGES,
  replacementTargets,
  requestBlock,
  rowTargetKey,
  STAGE_LABELS,
  targetKey,
  testimonialRequired,
  testimonialStage,
  type TestimonialStage,
  type TestimonialTarget,
} from '../../lib/testimonials/rules'
import type { AudioTestimonial, PortfolioItem, Profile, TestimonialRelationship } from '../../types/db'
import { Modal } from '../ui/Modal'
import { OrgPicker } from '../ui/OrgPicker'
import { Segmented } from '../ui/Segmented'
import { StreamingAudio } from '../media/AudioPlayer'
import { TranscriptDisclosure } from '../media/VideoPlayer'
import { FieldRow, TextArea, TextField } from './fields'

// Audio testimonials in the editor (docs/MavenScout-profiles-membership.md
// §4.1–4.2). One row per saved employer entry (and, for Featured Members,
// per portfolio item): request a testimonial, follow its progress, send the
// link yourself. Members get exactly 1, on an employer entry; Featured
// Members one per entry. Referees confirm themselves on /testimonial/:token.

export function TestimonialsSection({
  profile,
  rows,
  reload,
  portfolioCount,
  onProfileChanged,
}: {
  /** The SAVED profile: requests attach to saved employer entries. */
  profile: Profile
  rows: AudioTestimonial[]
  reload: () => void
  /** Changes when portfolio items are added or removed, to refetch them. */
  portfolioCount: number
  /** Publishing can end a withdrawal grace period on the profile row. */
  onProfileChanged: (patch: Partial<Profile>) => void
}) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [requesting, setRequesting] = useState<{ target: TestimonialTarget; replaces?: AudioTestimonial } | null>(null)
  const limits = membershipLimits(profile).testimonials

  useEffect(() => {
    supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order')
      .then(({ data }) => setPortfolio((data as PortfolioItem[]) ?? []))
  }, [profile.id, portfolioCount])

  const employers = profile.work_history.filter((w) => w.id)
  const legacy = rows.filter((t) => isLegacy(t) && t.status !== 'removed')

  const targets: { target: TestimonialTarget; title: string; sub: string }[] = [
    ...employers.map((entry) => ({
      target: { kind: 'employer', entry } as TestimonialTarget,
      title: entry.organization || 'Unnamed employer',
      sub: [entry.role, periodLabel(entry.start_year, entry.end_year)].filter(Boolean).join(' · '),
    })),
    ...(limits.onPortfolio
      ? portfolio.map((item) => ({
          target: { kind: 'portfolio', item } as TestimonialTarget,
          title: item.project_name,
          sub: ['Portfolio', item.organization].filter(Boolean).join(' · '),
        }))
      : []),
  ]

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        {limits.total === 1
          ? `Members have ${testimonialRequired(profile) ? 'exactly' : 'up to'} 1 audio testimonial, on an employer entry: from someone who supervised or contracted you, ideally in the last 5 years.`
          : `One testimonial per employer entry or portfolio project.${testimonialRequired(profile) ? ' At least one must be on an employer entry.' : ''}`}{' '}
        You send the link yourself; your referee confirms it's them with a code sent to their work email.
      </p>

      {profile.testimonial_grace_until && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-900" role="alert">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={15} /> Replace your required testimonial by {fmtDate(profile.testimonial_grace_until)}
          </p>
          <p className="mt-0.5 text-xs text-red-900/80">
            Your referee withdrew it. Publish a new testimonial on an employer entry by then, or your profile
            is unlisted until you do.
          </p>
        </div>
      )}

      {employers.length === 0 && (
        <p className="rounded-lg bg-paper px-3.5 py-3 text-sm text-ink-faint">
          Save at least one employer in Work history first. Testimonials attach to an employer entry.
        </p>
      )}

      <ul className="space-y-3">
        {targets.map(({ target, title, sub }) => (
          <EntryRow
            key={targetKey(target)}
            profile={profile}
            rows={rows}
            target={target}
            title={title}
            sub={sub}
            onRequest={() => setRequesting({ target })}
            onReplace={(t) => setRequesting({ target, replaces: t })}
            reload={reload}
            onProfileChanged={onProfileChanged}
          />
        ))}
      </ul>

      {!limits.onPortfolio && portfolio.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-ink-faint">
          <Sparkles size={13} className="text-gold-500" /> Featured Members can add a testimonial to each
          portfolio project too.
        </p>
      )}

      {legacy.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Earlier references
          </h3>
          <p className="mb-2.5 text-xs text-ink-faint">
            Added before referees confirmed their identity. They stay on your profile for now and will be
            replaced by testimonials on your employer entries.
          </p>
          <ul className="space-y-2.5">
            {legacy.map((t) => (
              <li key={t.id} className="rounded-xl border border-line bg-white p-3.5">
                <p className="text-sm font-medium">
                  {t.reference_name ?? 'Reference'}
                  <span className="ml-1.5 text-xs font-normal text-ink-faint">
                    {[t.reference_title, t.reference_org].filter(Boolean).join(', ')}
                  </span>
                </p>
                <StreamingAudio t={t} className="mt-2" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {PRECHECK_IS_PLACEHOLDER && (
        <p className="text-[11px] text-ink-faint">
          Demo build: the pre-check that looks your referee up in public records is a placeholder, and
          emails to referees are mocked.
        </p>
      )}

      {requesting && (
        <RequestModal
          profile={profile}
          rows={rows}
          target={requesting.target}
          replaces={requesting.replaces}
          onClose={() => setRequesting(null)}
          onCreated={() => {
            setRequesting(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function EntryRow({
  profile,
  rows,
  target,
  title,
  sub,
  onRequest,
  onReplace,
  reload,
  onProfileChanged,
}: {
  profile: Profile
  rows: AudioTestimonial[]
  target: TestimonialTarget
  title: string
  sub: string
  onRequest: () => void
  onReplace: (t: AudioTestimonial) => void
  reload: () => void
  onProfileChanged: (patch: Partial<Profile>) => void
}) {
  const key = targetKey(target)
  const mine = rows.filter((t) => rowTargetKey(t) === key)
  const active = mine.filter(isActive)
  // A published one stays primary while its replacement is under way here.
  const published = active.find((t) => testimonialStage(t) === 'published') ?? null
  const primary = published ?? active[0] ?? null
  const replacement = published ? rows.find((r) => r.replaces_id === published.id && isActive(r)) ?? null : null
  const replacementHere = replacement && rowTargetKey(replacement) === key ? replacement : null
  const lastEnded = !primary ? mine.find((t) => !isActive(t)) ?? null : null
  const block = primary ? null : requestBlock(target, profile, rows)
  const about = target.kind === 'employer' ? target.entry.organization : target.item.project_name
  const statusProps = { profile, rows, about, reload, onReplace, onProfileChanged }
  const replacedEntry = replacement && !replacementHere
    ? profile.work_history.find((w) => w.id === replacement.work_history_entry_id)?.organization
    : null

  return (
    <li className="rounded-xl border border-line bg-white p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {sub && <p className="text-xs text-ink-faint">{sub}</p>}
        </div>
        {primary && <StageChip stage={testimonialStage(primary)} />}
      </div>

      {primary ? (
        <>
          <RequestStatus t={primary} {...statusProps} />
          {replacement && !replacementHere && (
            <p className="mt-2 text-xs text-ink-faint">
              Being replaced by your request to {replacement.reference_name}
              {replacedEntry ? ` (${replacedEntry})` : ''}. This one stays live until that one is published.
            </p>
          )}
          {replacementHere && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Replacement <StageChip stage={testimonialStage(replacementHere)} />
              </p>
              <RequestStatus t={replacementHere} {...statusProps} />
            </div>
          )}
        </>
      ) : block === 'upgrade' ? (
        <p className="mt-3 rounded-lg border border-gold-300 bg-paper px-3 py-2 text-xs text-ink-soft">
          <Sparkles size={12} className="mr-1 inline text-gold-500" />
          Add more testimonials as a Featured Member.{' '}
          <a href="#tier" className="font-medium text-brand-600">
            Membership
          </a>
        </p>
      ) : block === null ? (
        <div className="mt-3">
          {lastEnded && testimonialStage(lastEnded) === 'rejected' && (
            <p className="mb-2 text-xs text-ink-faint">
              Your request to {lastEnded.reference_name} wasn't approved after review. You can ask someone else.
            </p>
          )}
          {lastEnded && testimonialStage(lastEnded) === 'withdrawn' && (
            <p className="mb-2 text-xs text-ink-faint">
              {lastEnded.reference_name} withdrew their testimonial on {fmtDate(lastEnded.withdrawn_at!)}.
            </p>
          )}
          <button
            onClick={onRequest}
            className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Mic size={14} /> Request audio testimonial
          </button>
        </div>
      ) : null}
    </li>
  )
}

function StageChip({ stage }: { stage: TestimonialStage }) {
  const tone =
    stage === 'published'
      ? 'bg-emerald-100 text-emerald-800'
      : stage === 'held'
        ? 'bg-amber-100 text-amber-900'
        : stage === 'recorded'
          ? 'bg-brand-100 text-brand-800'
          : 'bg-paper text-ink-soft'
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{STAGE_LABELS[stage]}</span>
}

/** Link created → opened → recorded → published (§4.2 step 4). */
function Progress({ stage }: { stage: TestimonialStage }) {
  const reached = (s: TestimonialStage) => {
    const order: TestimonialStage[] = ['link_created', 'opened', 'confirmed', 'recorded', 'published']
    return order.indexOf(stage) >= order.indexOf(s)
  }
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Progress">
      {PROGRESS_STAGES.map((s) => (
        <li key={s} className="min-w-0">
          <span className={`block h-1 rounded-full ${reached(s) ? 'bg-brand-500' : 'bg-line'}`} />
          <span className={`mt-1 block truncate text-[11px] ${reached(s) ? 'text-ink-soft' : 'text-ink-faint'}`}>
            {s === 'link_created' ? 'Link created' : s === 'opened' ? 'Opened' : s === 'recorded' ? 'Recorded' : 'Published'}
          </span>
        </li>
      ))}
    </ol>
  )
}

function RequestStatus({
  profile,
  rows,
  t,
  about,
  reload,
  onReplace,
  onProfileChanged,
}: {
  profile: Profile
  rows: AudioTestimonial[]
  t: AudioTestimonial
  about: string
  reload: () => void
  onReplace: (t: AudioTestimonial) => void
  onProfileChanged: (patch: Partial<Profile>) => void
}) {
  const stage = testimonialStage(t)
  const referee = (
    <p className="mt-2 text-sm text-ink-soft">
      <span className="font-medium text-ink">{t.reference_name}</span>
      {[t.reference_title, t.reference_org].filter(Boolean).length > 0 && `, ${[t.reference_title, t.reference_org].filter(Boolean).join(', ')}`}
      <span className="block text-xs text-ink-faint">{t.referee_email}</span>
    </p>
  )
  const cancel = (
    <button
      onClick={async () => {
        if (!window.confirm(`Cancel the request to ${t.reference_name}? The link will stop working.`)) return
        await cancelRequest(t)
        reload()
      }}
      className="text-xs font-medium text-ink-faint hover:text-red-600"
    >
      Cancel request
    </button>
  )

  if (stage === 'held') {
    const reasons = t.review_flags.filter(holdsLink)
    return (
      <div>
        {referee}
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5" role="status">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <Clock size={15} /> Held for a quick review, usually within a day
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/80">
            We check some requests by hand before the link is created. Nothing has been sent to{' '}
            {t.reference_name}. Your link appears here as soon as it's cleared.
          </p>
          {reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-amber-950/80">
              {reasons.map((f) => (
                <li key={f.code}>{f.message.replace(/^Pre-check: /, '')}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-2">{cancel}</div>
      </div>
    )
  }

  if (stage === 'recorded' || stage === 'published')
    return (
      <div>
        {referee}
        <Progress stage={stage} />
        <StreamingAudio t={t} className="mt-3" />
        <TranscriptDisclosure transcript={t.transcript} />
        <PublishedActions
          t={t}
          profile={profile}
          rows={rows}
          reload={reload}
          onReplace={onReplace}
          onProfileChanged={onProfileChanged}
        />
      </div>
    )

  // link_created / opened / confirmed: the consultant sends the link.
  return (
    <div>
      {referee}
      <Progress stage={stage} />
      {t.submission_token && <SendLink profile={profile} t={t} about={about} />}
      <div className="mt-2">{cancel}</div>
    </div>
  )
}

/** Publish, decline, remove or replace (§4.4–4.5). */
function PublishedActions({
  t,
  profile,
  rows,
  reload,
  onReplace,
  onProfileChanged,
}: {
  t: AudioTestimonial
  profile: Profile
  rows: AudioTestimonial[]
  reload: () => void
  onReplace: (t: AudioTestimonial) => void
  onProfileChanged: (patch: Partial<Profile>) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const stage = testimonialStage(t)
  const required = isRequired(t, profile, rows)
  const replacesName = t.replaces_id ? rows.find((r) => r.id === t.replaces_id)?.reference_name : null
  const btn = 'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium disabled:opacity-50'

  return (
    <div className="mt-3">
      {stage === 'recorded' && (
        <p className="mb-2 text-xs text-ink-soft">
          Recorded {t.submitted_at && fmtDate(t.submitted_at)}. Listen, then publish it to your profile.
          {replacesName && ` Publishing replaces your testimonial from ${replacesName}.`}
        </p>
      )}
      {stage === 'published' && t.published_at && (
        <p className="mb-2 text-xs text-ink-faint">
          Published {fmtDate(t.published_at)}
          {required && ' · your required testimonial: it can be replaced, not removed'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {stage === 'recorded' && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await publishTestimonial(t)
                if (t.work_history_entry_id && profile.testimonial_grace_until) onProfileChanged({ testimonial_grace_until: null })
              })
            }
            className={`${btn} bg-brand-500 text-white hover:bg-brand-600`}
          >
            <Check size={13} /> Publish
          </button>
        )}
        {stage === 'published' && canReplace(t, profile, rows) && (
          <button disabled={busy} onClick={() => onReplace(t)} className={`${btn} border border-line text-ink-soft hover:border-brand-400`}>
            <RefreshCw size={13} /> Replace
          </button>
        )}
        {canRemove(t, profile, rows) && (
          <button
            disabled={busy}
            onClick={() => {
              const what = stage === 'recorded' ? "Don't publish this testimonial?" : 'Remove this testimonial from your profile?'
              if (window.confirm(`${what} The recording is deleted; ${t.reference_name} isn't notified.`))
                run(() => removeTestimonial(t, 'consultant'))
            }}
            className={`${btn} text-ink-faint hover:text-red-600`}
          >
            <Trash2 size={13} /> {stage === 'recorded' ? "Don't publish" : 'Remove'}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  )
}

function SendLink({ profile, t, about }: { profile: Profile; t: AudioTestimonial; about: string }) {
  const url = requestUrl(t.submission_token!)
  const message = suggestedMessage(profile, t, url, about)
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const copy = async (what: 'link' | 'message') => {
    await navigator.clipboard.writeText(what === 'link' ? url : message)
    setCopied(what)
    setTimeout(() => setCopied(null), 1600)
  }
  const subject = 'Would you record a short audio testimonial for me?'
  const pill =
    'flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink-soft hover:border-brand-400'
  return (
    <div className="mt-3 space-y-2.5 rounded-lg bg-paper/70 p-3">
      <p className="text-xs text-ink-soft">
        Send this link yourself, however you usually reach {firstName(t.reference_name) ?? 'them'}. It
        comes from you, not from an unknown sender.
      </p>
      <div className="flex items-center gap-1.5">
        <input readOnly value={url} aria-label="Testimonial link" className="w-full min-w-0 truncate rounded-lg border border-line bg-white px-2.5 py-2 text-xs" />
        <button onClick={() => copy('link')} className={`${pill} shrink-0`}>
          {copied === 'link' ? <Check size={13} /> : <Copy size={13} />} {copied === 'link' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-brand-600">Suggested message</summary>
        <textarea readOnly rows={9} value={message} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-soft" />
      </details>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button onClick={() => copy('message')} className={pill}>
          {copied === 'message' ? <Check size={13} /> : <Copy size={13} />} Copy message
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={pill}>
          <MessageCircle size={13} /> WhatsApp
        </a>
        <a
          href={`mailto:${t.referee_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
          className={pill}
        >
          <Mail size={13} /> Email
        </a>
        {typeof navigator.share === 'function' && (
          <button onClick={() => navigator.share({ title: subject, text: message }).catch(() => {})} className={pill}>
            <Share2 size={13} /> Share…
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function RequestModal({
  profile,
  rows,
  target: initialTarget,
  replaces = null,
  onClose,
  onCreated,
}: {
  profile: Profile
  rows: AudioTestimonial[]
  target: TestimonialTarget
  replaces?: AudioTestimonial | null
  onClose: () => void
  onCreated: () => void
}) {
  // A replacement can go on the same employer entry or any free one.
  const choices = replaces ? replacementTargets(replaces, profile, rows) : []
  const [target, setTarget] = useState<TestimonialTarget>(initialTarget)
  const span = target.kind === 'employer' ? target.entry : target.item
  const [d, setD] = useState<RequestDetails>({
    name: '',
    title: '',
    organization: '',
    organizationId: null,
    email: '',
    relationship: 'supervisor',
    periodStart: span.start_year || null,
    periodEnd: span.end_year ?? null,
    context: '',
  })
  const [blocks, setBlocks] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const about = target.kind === 'employer' ? target.entry.organization : target.item.project_name
  const yearInput = 'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400'

  const submit = async () => {
    setBusy(true)
    setBlocks([])
    const outcome = await createRequest({ profile, target, replaces, details: d, orgs: await loadOrgIndex() })
    setBusy(false)
    if (!outcome.ok) return setBlocks(outcome.blocks)
    onCreated()
  }

  return (
    <Modal open onClose={onClose} title={replaces ? 'Replace your testimonial' : 'Request audio testimonial'} wide fullScreenMobile>
      <div className="space-y-3.5">
        {replaces ? (
          <>
            <p className="text-sm text-ink-soft">
              Your testimonial from {replaces.reference_name} stays live until the new one is published.
            </p>
            <label className="block text-sm">
              <span className="font-medium">Employer entry</span>
              <select
                value={target.kind === 'employer' ? target.entry.id : ''}
                onChange={(e) => {
                  const entry = choices.find((w) => w.id === e.target.value)
                  if (entry) {
                    setTarget({ kind: 'employer', entry })
                    setD((d) => ({ ...d, periodStart: entry.start_year || null, periodEnd: entry.end_year ?? null }))
                  }
                }}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              >
                {choices.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.organization}
                    {w.role ? ` · ${w.role}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            For <strong>{about}</strong>. Ask someone who supervised or contracted you there. These details
            pre-fill their page; they can correct anything before recording.
          </p>
        )}
        <FieldRow>
          <TextField label="Referee's name" value={d.name} onChange={(v) => setD({ ...d, name: v })} placeholder="Dr. Amina Bello" />
          <TextField label="Their current job title" value={d.title} onChange={(v) => setD({ ...d, title: v })} placeholder="Lead Economist" />
        </FieldRow>
        <OrgPicker
          label="Their current organization"
          value={d.organization}
          orgId={d.organizationId}
          onChange={(organization, organizationId) => setD({ ...d, organization, organizationId })}
        />
        <TextField
          label="Their institutional email"
          type="email"
          value={d.email}
          onChange={(v) => setD({ ...d, email: v })}
          placeholder="a.bello@worldbank.org"
          hint="Their work address at a recognised organization. Personal addresses (Gmail etc.) and shared mailboxes can't be used."
        />
        <div>
          <p className="mb-1.5 text-sm font-medium">How did you work together?</p>
          <Segmented<TestimonialRelationship>
            label="Relationship"
            value={d.relationship}
            onChange={(relationship) => setD({ ...d, relationship })}
            options={[
              { value: 'supervisor', label: 'They supervised me' },
              { value: 'client', label: 'They were my client' },
            ]}
          />
        </div>
        <FieldRow>
          <label className="block text-sm">
            <span className="font-medium">From (year)</span>
            <input type="number" min={1970} max={2035} value={d.periodStart ?? ''} onChange={(e) => setD({ ...d, periodStart: e.target.value ? +e.target.value : null })} className={yearInput} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">To (year)</span>
            <input type="number" min={1970} max={2035} value={d.periodEnd ?? ''} onChange={(e) => setD({ ...d, periodEnd: e.target.value ? +e.target.value : null })} className={yearInput} />
            <span className="mt-0.5 block text-xs text-ink-faint">Blank = still working together</span>
          </label>
        </FieldRow>
        <TextArea
          label="What you worked on (optional)"
          rows={2}
          value={d.context}
          onChange={(v) => setD({ ...d, context: v })}
          placeholder="Endline evaluation of the Sahel resilience programme"
        />
        {blocks.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {blocks.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Check and create link'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
