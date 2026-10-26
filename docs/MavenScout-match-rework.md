# MavenScout — Match Rework Spec (Branch 1)

**Status:** Build spec for the `match-rework` branch, **revision 4** (October 2026), updated to match the build. Ranking is a mode of the directory ("Find an Expert"), set up in the two-step **"Set your priorities" modal**, which replaced the right-hand drawer of revision 3. Step 1 is the priorities, step 2 an optional job description. **Supersedes PRD §7.7** and the AI-match rows of the PRD Decisions table wherever they conflict. Everything not mentioned here stays as the PRD describes.
**Owner:** Benji · **Date:** October 2026

> **Revision 4 in short:** the drawer is now a centered modal (§8). The requirements grid is now eight **priority areas** with a shared strength control and a "Your priorities" panel (§3). The levels are **Nice to have / Important / Must have**; "Required" in older text means Must have. Preferences are worth **1 / 3 points**, at 2.5% of the score per point, up to 20% (§5.3). New partial credits cover nearby expertise, career level, employers and location. Video Q&As and audio testimonials are now ordinary priorities. Ranked cards get a **rank header**, which replaces the rank strip and the "Match" flip face (§7). The Verified row and the "Found in your JD" chips are gone.

---

## 0. Read this first

**What this branch does:** it replaces the old "Rank by Job Description" modal and its sliders with a single requirements model. Ranking happens inside the directory: **Rank candidates** opens the "Set your priorities" modal, and when the manager sees their matches, the grid itself becomes the ranked list. Filters and priorities are one set of rows, each at one of three strengths: **Nice to have / Important / Must have** (internally `slight` / `strong` / `must`). A row exists only once it's added; no row means no preference. Must have rows are hard pre-filters, applied *before* scoring. Everything else is weighed against a fit score: preferences carry 2.5% of the score per point, up to 20% (§5.3). Every point in the final score can be explained.

**Ground rules:**
- Keep the engine isolated in `src/lib/matching/`. The UI must only touch it through the contract in §6. (As built: the engine is `extract.ts`, `fit.ts`, `adjustments.ts`, `score.ts` and `narrative.ts`. Persistence is `persist.ts`, and display rounding is `display.ts`. The requirement rows, the priorities modal's areas (`priorities.ts`), the filter-bar state and the Must have pre-filter live app-side in `src/lib/requirements/`.)
- Placeholder logic (extraction and scoring) stays **clearly labeled as placeholder** in code comments and in the UI, exactly as today. Loop8 replaces it.
- All tunable numbers live in **one config file** (`src/lib/matching/config.ts`), commented as tunable. That covers points, the per-point weight and its cap, credits, band thresholds and per-area caps.
- The directory **filter bar stays.** It is the view of the Must have rows: one shared state, not two (see §2.1).
- Mobile (375px) is a first-class target. Verify every new surface there.
- **Out of scope for this branch** (Branch 2, later): Mapbox location, UN M49 regions and the map view. (The canonical language list with proficiency was built since; see profiles-membership §13.) Structure the location row so Branch 2 can swap its value picker without touching scoring.

---

## 1. Summary of changes

| Removed | Added |
|---|---|
| "Rank by Job Description" modal; later, the right-hand ranking drawer | The **"Set your priorities" modal**: step 1 priorities, step 2 optional JD (§8). The grid itself becomes the ranked list ("ranking mode") |
| Merit sliders (Demonstrated Experience, Domain Expertise, Technical Skills) | A fixed **Fit** score (holistic fit to the JD, not adjustable) |
| Five 0–5 preference sliders | **Priority areas**: rows are added by picking values, each Nice to have / Important / Must have (§3) |
| Hiring-organization field in the JD step | Organizations live in the Employers area |
| Filters and ranking as separate state that can drift apart | Filter bar and Must have rows are **one shared state**; Must haves pre-filter before scoring |
| Expanding "Why this score?" box above each card | A **rank header** on each ranked card with an inline breakdown, plus the "About this result" modal (§7) |
| Weighted-average total | Fit plus preferences weighted by their points: `(1 − w) × Fit + 100 × w × earned ÷ possible`, `w = min(possible × 2.5, 20) / 100` (§5.3) |
| `Best Match` as one sort option among others | While ranking mode is on, order is always rank order (sort dropdown locked); the ranking is held in the URL |

**Unchanged:** login gating (ranking requires a hiring-manager account), ranking persistence semantics (ranking inside an opening persists; ad-hoc ranking is transient unless saved to an opening), "Save ranking" to an opening, and openings showing their persisted ranking.

---

## 2. User flow

Managers see three strengths: **Nice to have**, **Important** and **Must have**, stored as `slight`, `strong` and `must`. "Must have row", "Required row" (older text, and some code comments) and "must-have" all mean the same thing.

**Entry points**
- Find an Expert → **Rank candidates** (sparkle icon) → opens the priorities modal at step 1 (§8). While ranked, the button reads **Edit ranking**, with a count of the priorities set. Filters already set in the filter bar are already Must have rows (shared state, §2.1). The search term stays as a pool constraint.
- Opening → "Rank candidates" → opens the directory in ranking mode linked to that opening (`/?opening=:id&rank=1`), keeping today's opening linkage. The run saves to that opening, and the results line says "Ranking for: <opening name>". If the opening already has a persisted ranking, its JD, requirements and results load.
- The old `/match` route redirects to `/?rank=1` (modal open).

**Step 1 — Set your priorities**
- Eight areas (§3). Picking a value creates a row at **Important**; nothing ever defaults to Must have.
- "Your priorities" lists every row grouped by strength. Drag a row to change its strength, or click it to edit. On phones this list is the Summary tab.
- Edits go to a **draft** copy of the requirements, taken when the modal opens. Nothing reaches the directory until a run. Closing with changes asks "Discard your priorities?". Removing or clearing a row can be undone from a toast.
- **Live pool preview** in the footer, debounced: how many experts meet every Must have. At 0 the run is disabled, and the preview says which Must have to relax and what that would admit. Under 5 it shows a gentle warning.
- **See my matches** commits the draft and runs a priorities-only ranking (§11). **Match to a Job Description** ("Add a JD" on phones) goes to step 2.

**Step 2 — Job description (optional)**
- Textarea, **max 15,000 characters, min 200**, live counter (e.g. "3,412 / 15,000").
- Hint text: *"Paste the scope of work and qualifications sections. You can paste the full ToR — we'll pull out what matters."*
- Paste only (no file upload on this branch). Future note in code: docx/PDF upload should **fill this textarea**, so the manager sees and can trim the extracted text.
- **Read job description** → calls `extractRequirements` (§4). Afterwards, the textarea collapses to a short preview with "Edit".
- **Extraction pre-fills; it never decides.** The locations and languages the JD states are added to the priorities at **Nice to have**, marked "from JD", with a **Clear suggestions** action. Expertise is not pre-filled (pending a decision on double counting with Fit); it informs the placeholder Fit only. Extraction never sets Must have.
- **See your matches** commits the draft and runs a JD ranking. **Back to priorities** returns to step 1.

**After a run**, the modal closes and the directory grid re-sorts into rank order, each card gaining its rank header (§7). **Edit ranking** reopens the modal. What happens on later changes is in §2.2.

**Guardrails on extraction (important):**
- Extraction **never suggests Must have.** Only carried-over filters arrive as Must haves; any other Must have row is a deliberate manager choice.
- Extraction may report a hiring organization; it is only ever a suggestion. Employers are added by the manager on purpose (§3).

### 2.1 Shared requirements state

- **One store** (`src/lib/requirements/store.ts`) holds `Requirement[]` and the search term; the active ranking id lives in the URL. The filter bar and the priorities modal both read and write it (the modal through its draft, committed on a run). There is no separate copy of filter state.
- **Rows only exist when added**: from a pick in the modal, a JD pre-fill or a filter. Removing a row means no preference. There is no "No preference" level.
- **One row per item where items carry their own strength.** Each expertise item, language and employer is its own row at its own strength (e.g. Must have: French, Nice to have: English). Several Must haves within one area still mean "any of", as the filters do; different areas combine with AND. Career level, location, work arrangement and availability have one row each.
- **The filter bar is the Must have view.** Each filter-bar control maps to that kind's Must have rows: Expertise, Location, Employers, Language, Career Level, Work Arrangement, Availability, plus the **Featured only** (`video_qna`) and **Audio testimonials only** (`audio_testimonial`) toggles. (Type is hidden while firm listings are off.)
  - Setting a filter creates or updates that kind's Must have rows, tagged "from filters". A preference row of the same kind is left as is.
  - Raising a row to Must have makes it appear in the filter bar. Lowering it to Important or Nice to have keeps the row but removes it from the filter bar. Clearing a filter deletes its Must have rows; preference rows stay.
- **Matching semantics are unchanged.** Must have evaluation reuses the existing filter logic exactly (e.g. a country matches every city in it). Career level never excludes firms (it doesn't apply to them).
- **Must haves the filter bar can't show** (an employer row at Now or Before, or one counting peers) appear as a chip at the end of the filter bar, "+1 Must have: Employer: <name>", which opens the modal at that row. The Employers filter itself is the "Either" scope.
- **Outside ranking mode** the filter bar behaves exactly as today. Nice to have / Important rows only exist once the modal is used.

### 2.2 Changes after a run

| Change | Behavior |
|---|---|
| **Tighten** a Must have (add a filter, narrow a selection, add or narrow the search term) | Instant. Hide candidates who now fail; ranks renumber. No re-run. The change is written back to the run (no re-scoring), so a reload keeps it. The results line shows "N filtered out by your Must haves". |
| **Loosen** a Must have (remove a filter, widen a selection, Clear All) | Newly eligible candidates are unscored and hidden. Show *"N more experts now meet your Must haves — score them"*. Score only the newcomers (`rankPool` on that subset, or the preferences scorer in a priorities run), merge, and re-rank. Code comment for Loop8: if the engine normalizes scores across the pool, this becomes a full re-run. |
| Change a Nice to have / Important row, add or remove one, or edit the JD | Show a **Re-run** prompt. Do **not** auto re-run. (Committing from the modal always re-runs.) |

- **Unsaved edits survive navigation.** Nice to have / Important and JD edits made after a run aren't scored until a re-run, and the stored ranking stays exactly as scored. They're kept as a per-tab draft (sessionStorage, keyed by ranking id), so leaving and returning (Back from a profile, a reload) restores them along with the Re-run prompt. Re-run or Clear discards the draft, and so does undoing the edits. (Must have changes don't need this: they're written back to the run immediately.)
- **URL state:** ranking mode lives in the URL as `/?ranking=<job_description_id>` (plus `opening=:id` when linked, and `q` / `qm` for the search term). Reload and back restore the ranked view. Ad-hoc rankings are a `job_descriptions` row with `opening_id` null: unlisted, and replaced by the manager's next ad-hoc run unless saved to an opening.
- **While ranking mode is active:** the Featured-first float is suspended; the sort dropdown shows "Ranked by match" and is disabled.
- **Clear ranking** (on the results line) exits ranking mode: the JD, preference rows and ranking are dropped; Must have rows stay as plain filters. **Clear All** (in the filter bar) deletes Must have rows only (and the search term, as today) and counts as loosening.

---

## 3. The priority areas

Step 1 of the modal lists eight areas, in this order. Each area has a picker, and each pick has the shared **strength control**: Nice to have | Important | ⏷ Must have, always ordered low → high. Must have sits apart behind a divider with a funnel icon, because it's a filter rather than a weight. New picks start at **Important**. Every area can be cleared.

| Area | Picker | Rows | Met / partial / not met |
|---|---|---|---|
| **Expertise** | Unified expertise list; up to **5** items | One per item | §3.3. Same expertise group, not the item → **partial** (×0.3). |
| **Career level** | Early / Mid / Senior; choose one | One | Level matches → met; one step away → **partial** (×0.4). Individuals only: **firms are "not applicable"**, never excluded, never adjusted. |
| **Languages** | Canonical language list; up to **3**, each with a minimum level (Working or above / Fluent) | One per language | Speaks it at the minimum level or above (Fluent counts as Working). Asked for Fluent, speaks it at Working → **partial** (×0.5). |
| **Employers** | Canonical organizations; up to **3**, each **Now / Before / Either**, plus "Also count <peer group>" (e.g. other UN agencies) | One per employer | *Now* = a matching `work_history` entry with `end_year` null; *Before* = a past entry; *Either* = any. A peer of the same organization type → **partial** (×0.6). A Must have employer that counts peers admits them. Ethics note in the area: add it deliberately, because it can entrench who-you-know hiring. |
| **Location** | One place: a continent, region, country or city | One | The filter's location matching (a country matches every city in it). In the parent area → **partial** (×0.5); same continent → **partial** (×0.2). |
| **Availability** | The availability filter's controls (§3.1) | One | The availability-filter logic. Available within one month after the target → **partial** (×0.5). |
| **Work arrangement** | Remote / On-site / Hybrid; choose one | One | Any overlap with `work_types`. |
| **Profile media** | Tick Video Q&As and/or an audio testimonial | One each | Has Video Q&As (a Featured Member) / has an audio testimonial on record. **Owner's decision:** these are ordinary priorities, overriding profiles-membership §2.2's filter-only rule. |

A row without a value yet scores and constrains nothing, and says so. Type (Individual / Small Firm / Large Firm) is still a requirement kind, but it has no area while firm listings are hidden (`FIRMS_ENABLED`). The **Verified** row is gone: everyone listed is verified (profiles-membership §2.2).

The **Summary** view shows everything set in three columns, low → high, plus the areas still at no preference. Drag a row between columns to change its strength, or click it to edit.

### 3.1 Availability controls

The filter-bar Availability modal and the priorities modal's Availability area are one control (`AvailabilityControls.tsx`):
- **Track toggle:** Part time | Full time. With neither picked, either track counts; picking the active one again goes back to either.
- **Shortcuts:** *Available now for next month*, *… for next 3 months*, *… for next 6 months*, and *Available now (open-ended)*. "Next N months" means available now and still available N months from today; "open-ended" means available now with no end date. Clicking the active shortcut turns it off.
- **Custom:** a start date and an optional end date (date pickers). Available by the start date and still available on the end date.
- Timed choices count only availability updated in the last 90 days (`AVAILABILITY_FRESH_DAYS`). Experts already available match any later start.
- The directory no longer has a separate "Available now" toggle.
- Rankings saved with the older choices ("Within 1 / 3 months", "By a month", month ranges) still load and score; they just can't be picked any more.

### 3.2 Expertise Must haves

Must have is allowed on expertise because the filter bar's Expertise filter is the Must have view (§2.1). Must have evaluation here uses the existing filter logic (tags only); the text-evidence credit in §3.3 applies only to Nice to have / Important. Several Must have expertise rows are OR within an item's kind (sector / theme / method) and AND across kinds, counting Core + Strong unless the manager includes Working knowledge.

### 3.3 Expertise matching (placeholder; credit multipliers in config)

Expertise and skills are one list with no category tags (profiles-membership §6, §11), so there are no skill rows and no parent-tag credit. For a requested item:
- Tagged Core → **met** (×1.0)
- Tagged Strong → **met** (×0.75)
- Tagged Working knowledge → **partial** (×0.4)
- Not tagged, but the term appears in bio / portfolio / accreditation text → **partial** (×0.4). This shows the principle that the real engine credits evidence beyond tags.
- Tagged only another item in the same expertise group → **partial** (×0.3)
- Otherwise → not met

A row takes the best of these credits. See `src/lib/expertise.ts`.

---

## 4. Extraction — `extractRequirements` (placeholder)

> **As built (data-foundations):** `ExtractedRequirements` is `{ expertise, locations, languages, hiring_organization }`: one list of expertise items (`{ name, suggested, mentions }`, no `skills`, no `level`). The placeholder matches each item's name, the old names it absorbed and its aliases (acronyms as written; single generic words skipped).

```ts
// PLACEHOLDER — Loop8 replaces with real JD understanding.
extractRequirements(jdText: string, ctx: { taxonomy, locationOptions, languageOptions })
  : Promise<ExtractedRequirements>

interface ExtractedRequirements {
  expertise: { name: string; level: 'category' | 'item'; suggested: 'slight' | 'strong'; mentions: number }[];
  skills:    { name: string; level: 'category' | 'item'; suggested: 'slight' | 'strong'; mentions: number }[];
  locations: { value: string; mentions: number }[];
  languages: { value: string; mentions: number }[];
  hiring_organization: string | null; // a suggestion only
}
```

Everything here is a **suggestion**. "Read job description" (step 2 of the priorities modal) pre-fills the stated locations and languages into the priorities at Nice to have, marked "from JD", with a "Clear suggestions" action; never Must have. Expertise items are not pre-filled (pending a decision on double counting with Fit); they inform the placeholder Fit only (§5.2), through `suggested`.

Placeholder behavior: case-insensitive whole-word match of taxonomy item and category names in the JD text (`strong` if the term appears 2+ times, else `slight`); match known location and language options; `hiring_organization` is null. Cap output at 10 expertise + skill suggestions, highest-frequency first.

**Contract requirement for Loop8 (write as a code comment):** the JD is read **once**, here. Scoring receives the extracted requirements plus the stored JD reference — it must not re-send the full JD text per candidate. This keeps a 15,000-character JD from multiplying cost across hundreds of candidates.

**Contract rule for Loop8 — Fit vs. priorities:** Fit judges capability for the work only. It must not score the practical conditions handled by priorities: location, language proficiency, availability, career level, work arrangement and organizational history (employer names never score in Fit). When a JD states them, extraction routes them to priorities (pre-filled at Nice to have, never Must have). Exception: a language or place that is itself the expertise (e.g. translation, deep country knowledge) counts as substance. Fit may value experience working in a region, but not where the candidate is based. (profiles-membership §11.)

Persist the extraction output with the job description (§6.3).

---

## 5. Scoring model

### 5.1 Pipeline
1. **Pool** = approved + active profiles, narrowed by pool chips (search term) and, inside an opening, today's opening pool semantics.
2. **Must have pre-filter** as a database query (or as close to it as the current code allows; today it runs in the browser on the loaded pool, in `src/lib/requirements/mustHaves.ts`). Candidates failing any Must have are **not scored**. Must have rows add no points.
3. **Score** each survivor: `total = (1 − w) × fit + 100 × w × (earned ÷ possible)`, `w = min(possible × 2.5, 20) / 100` (§5.3).
4. **Rank**, then **band**.

### 5.2 Fit (0–100)
The engine's holistic fit to the JD: demonstrated experience (bio, portfolio, accreditations, video/audio transcripts) plus tags. **Not adjustable by the manager.**
Placeholder: reuse today's computation, internally blending the old Demonstrated Experience / Domain / Skills components at the old 5/3/3 ratio. Labeled placeholder. Tune the placeholder so a profile that is clearly on-topic for the JD lands **≥ 70** — real calibration is Loop8's job, but the demo should not cluster everyone in the 40s.


### 5.3 Preferences and the total (constants in config)
Every Nice to have or Important row with a value is judged for each candidate. (Must have rows add no points: they already filtered the pool.) Each row is worth a number of **points**, which is both what it earns when met and what it adds to the points possible. The modal describes them as "counts 1×" and "counts 3×".

| Strength | Points (`PREFERENCE_POINTS`) | Met earns | Partial earns | Not met | Not applicable |
|---|---|---|---|---|---|
| Nice to have (`slight`) | 1 | 1 | 1 × credit | 0 | not counted |
| Important (`strong`) | 3 | 3 | 3 × credit | 0 | not counted |

- `credit` (`CREDIT` in config) is the partial multiplier for that kind. Expertise: Working 0.4, text evidence 0.4, same group 0.3 (§3.3). Career level one step away: 0.4. Peer organization: 0.6. Location in the parent area: 0.5; same continent: 0.2. Other partials (near-miss availability, Working instead of Fluent): 0.5.
- **earned** = Σ points earned; **possible** = Σ points of the rows that apply. Not-applicable rows (career level for a firm) count toward neither, so a candidate is never marked down for a row that can't apply to them.
- **In a JD run, preferences carry 2.5% of the score per point, up to 20%:**
  - `w = min(possible × PREFERENCE_PERCENT_PER_POINT, PREFERENCE_CAP_POINTS) / 100`, with `PREFERENCE_PERCENT_PER_POINT = 2.5` and `PREFERENCE_CAP_POINTS = 20`;
  - `total = (1 − w) × Fit + 100 × w × (earned ÷ possible)`;
  - no applicable preference rows → `w = 0` → `total = Fit`.
  One Nice to have row is worth 2.5% of the score and one Important row 7.5%. Preferences reach 20% at 8 points possible; beyond that, more rows share the same 20% rather than stacking. So preferences reorder close candidates but can never move a total by more than 20 points. The total is always within 0–100, so there is no cap row and no clamp. (This replaced the original additive rule, `clamp(Fit + min(Σ adjustments, +20), 0, 100)`, which tied most top candidates at 100; see `docs/samples/ranking-baseline.md`. Revision 3 used 3 / 8 points at 1% per point.)
- `w`, earned and possible are stored with each result (`match_results.scoring`), so a saved run shows the same build-up even if the config changes. **Runs saved under the old 3 / 8 points** keep their stored scores, and their build-up shows the rows on the old scale.
- **Display and rounding:** Fit is computed in floats and stored/displayed rounded. The total is computed from the **displayed** Fit and rounded, so the shown equation reproduces exactly (ties still break on the unrounded Fit, §5.5).
  - **Rows are never converted to score points.** Each preference row shows its own points earned of points possible ("3 of 3 pts", "1.2 of 3 pts", "not counted" for not applicable), so the rows visibly sum to the subtotal's points.
  - The conversion to score points appears **once**, at the preferences subtotal: "Preferences 5.5 of 8 pts → +14".
  - Exact rounding lives only at the subtotal and total level: Fit part = `round((1 − w) × Fit)`; preference part = total − Fit part (always between 0 and `100 × w`); Fit part + preference part = total.
  - Example: Fit 80, one Important row met (3 of 3 pts) and one Nice to have row not met (0 of 1 pt) → possible 4, w = 0.10 → "Fit 80 × 0.90 → 72 · preferences 3 of 4 pts → +8 · Total 80".

### 5.4 Bands (thresholds in config)
- **80–100:** Strong match
- **65–79:** Good match
- **50–64:** Partial match
- **< 50:** Weak match


### 5.5 Ordering
- Sort by total score, descending.
- **Tie-break:** higher Fit → more recent `availability_updated_at` → profile id (deterministic).
- **Membership never affects ranked order.** The directory's Featured-first float does **not** apply while ranking mode is active; paid placement inside a merit ranking would undermine trust in the scores. (Video Q&As can still be a priority the manager sets, §3: that's the manager's choice of what matters, not paid placement.)
- Every ranked result shows its rank number (this replaces the PRD's "top 15 prominent" rule).

---

## 6. Contract and persistence

### 6.1 Types (`src/lib/matching/types.ts`)

> **As built (revision 4):** `RequirementKind` is `'expertise' | 'org_history' | 'location' | 'language' | 'type' | 'availability' | 'career_level' | 'video_qna' | 'audio_testimonial' | 'work_arrangement'`: no `'skill'` and no `'verified'`. Org history's value is `{ org, org_id?, also?, scope: 'current' | 'past' | 'ever', includePeers?, peers }` (older `'ever_or_peer'` rows read as `'ever'` with peers counted). Availability's value is the `AvailabilityFilter` from `lib/filters.ts` (§3.1). Also from data-foundations: an expertise row's value is `{ name, includeWorking? }` and a language row's is `{ values, min? }` (`'working'` | `'fluent'`). Rows saved earlier are read through `upgradeLegacyRequirements` in `src/lib/expertise.ts`. Fit no longer reads transcripts (profiles-membership §11).

```ts
type Level = 'slight' | 'strong' | 'must'; // Nice to have / Important / Required — no 'none': a row exists only once added
type RequirementKind =
  | 'expertise' | 'skill' | 'org_history' | 'location' | 'language'
  | 'type' | 'availability' | 'career_level' | 'verified' | 'work_arrangement';

interface Requirement {
  id: string;
  kind: RequirementKind;
  level: Level;
  source: 'jd' | 'filter' | 'manual';
  value: RequirementValue; // discriminated by kind — e.g.
  // org_history: { org: string; scope: 'current' | 'ever' | 'ever_or_peer'; peers: string[] }
  // availability: { engagement: 'part_time' | 'full_time' | 'either'; by: string /* YYYY-MM */ }
  // expertise/skill: { name: string; level: 'category' | 'item' }
}

interface Adjustment {
  requirement_id: string;
  label: string;                 // e.g. "Based in Kenya"
  level: 'slight' | 'strong';      // Nice to have / Important
  outcome: 'met' | 'partial' | 'not_met' | 'not_applicable';
  points: number;                // earned: points × credit when met/partial, else 0
  detail: string;                // e.g. "Tagged as secondary expertise"; org: "Same org" / "Peer org: ADB"
}

interface MatchResult {
  profile_id: string;
  rank: number;
  total_score: number;           // 0–100: round((1 − w) × fit_score + 100 × w × earned ÷ possible)
  band: 'strong' | 'good' | 'partial' | 'weak';
  fit_score: number;             // 0–100
  adjustments: Adjustment[];
  scoring: { weight: number; earned: number; possible: number }; // §5.3; w = weight
  must_haves_passed: { requirement_id: string; label: string }[];
  narrative: string;             // ~100 words, PLACEHOLDER template
}

// Engine entry points (placeholder now, Loop8 later):
extractRequirements(jdText, ctx): Promise<ExtractedRequirements>;
rankPool(jobDescriptionId, requirements: Requirement[], pool: Profile[]): Promise<MatchResult[]>;
```

### 6.2 Narrative (placeholder)
Template must be **grounded in the actual numbers** and never contradict them. Reference the band, the Fit score and its weight, what the preferences earned and the score points that converts to (as on screen), the best-met preference row by its own points ("8 of 8 pts" — never credit an individual row with score points), and the most important unmet Important row (if any). Do not call a preference "the strongest signal" relative to the profile's evidence — the current template does this and should be removed.

### 6.3 Migration — `supabase/005_match_rework.sql`
(Numbered 005 because `004_portfolio_org_and_logos.sql` already existed. `000_schema.sql` carries the same columns for fresh projects.)
- `job_descriptions`: add `requirements jsonb`, `extracted jsonb`; keep `hiring_organization` and `weights` nullable for legacy rows (new code stops writing them).
- `match_results`: add `rank int`, `band text`, `fit_score int`, `adjustments jsonb`, `adjustments_capped bool`, `must_haves_passed jsonb`; keep `sub_scores` nullable for legacy rows.
- Re-create the seeded Sahel opening's persisted ranking under the new model (or delete it and document how to re-run it). As built: 005 deletes pre-rework rankings; the Sahel ranking was re-created through the UI from `docs/samples/sahel-me-tor.txt` (steps in `DEVELOPER-HANDOFF.md`).
- Add `005` to the run order in `DEVELOPER-HANDOFF.md` and anywhere else the order is listed.

### 6.4 Migration — `supabase/008_score_normalization.sql`
- `match_results`: add `scoring jsonb` (`{weight, earned, possible}`, §5.3); `adjustments_capped` stays as a legacy column, no longer written.
- Deletes ranking runs scored under the old additive formula (results without `scoring`); they can't be shown in the new build-up. Re-create the Sahel ranking through the UI (steps in `DEVELOPER-HANDOFF.md`).

---

## 7. Results display

### 7.1 Card rank header
- Each ranked card gains a **fixed-height header** built into the top of the card frame (`RankHeader.tsx`): the rank, the match %, a progress bar and **"4 of 6 met ▾"**. A JD run also shows its band beside the %.
- "x of y met ▾" opens the **breakdown inside the card**: one line per priority with ✓ / ~ / –, its strength (three small bars) and the points it earned ("Required" for Must haves). The breakdown links to **About this result**.
- The header never changes the card's height, so cards stay uniform across the grid.
- The old rank strip and the "Match" flip face are gone. The flip card's faces are the same as outside ranking: Front → Expertise → portfolio items.
- Openings and `/shortlists/:token` show candidates as list rows, not flip cards. Each row carries a compact strip ("#4 · 95 · Strong match · About this result"), where the rank is the candidate's rank in the saved run.

### 7.2 "About this result" modal
- Header: name, rank, score, band.
- **Score build-up table:** a Fit row ("Fit 80 × 0.90" → 72); one row per preference (outcome, detail, its own "x of y pts", never score points); a preferences subtotal ("Preferences 3 of 4 pts →" +8, "worth 10% of the score"); and the total with the equation line. The score column (Fit part, subtotal, total) adds up exactly.
- Must haves met (✓ list).
- Narrative (~100 words, labeled placeholder).
- Collapsible **"How scoring works"**: Fit is the engine's judgment of fit to the JD; preferences carry 2.5% per point, up to 20% of the score (earned ÷ possible; not-applicable rows don't count; no preferences → total = Fit); Must haves exclude before scoring; the tie-break rule; membership does not affect rank; placeholder notice.
- Mobile: full-screen sheet.

### 7.3 Results line
The old banner is now a line between the filter bar and the grid:
- "N experts ranked by your job description and priorities" (or "… by your priorities"), plus "· N filtered out by your Must haves".
- **Clear ranking** and **Save ranking** (to an opening) on the right, beside the locked sort dropdown.
- When linked to an opening: "Ranking for: <opening name>" above it, and no Save (the run saves automatically).
- Below it when needed: the newcomers prompt and the Re-run prompt (§2.2).
- The header button reads **Edit ranking** while ranked.

**Clear ranking** behaves as described in §2.2.

---

## 8. Ranking mode layout (directory)

**Desktop**
- **"Set your priorities"** is a centered modal over a dimmed page: up to **1140px** wide and **min(780px, viewport − 48px)** tall. Esc or the close button closes it; with unsaved changes it asks before discarding the draft (§2).
- Step 1 has three columns: the eight areas down the left, the open area's picker in the middle, and "Your priorities" on the right, grouped by strength. A Summary tab shows everything at once.
- Step 2 is the JD step in a single centered column.
- The header (title, linked opening, close) and the footer (live pool preview and the step's buttons) stay pinned while the content scrolls.
- The card grid stays at **3 columns at all times**.
- **After a run** the modal closes and the ranked grid shows; **Edit ranking** reopens it.

**Mobile**
- The modal is a full-screen sheet. The areas become a scrolling strip of tabs, and "Your priorities" lives on the Summary tab. The JD button reads "Add a JD".
- A run closes the sheet and shows ranked cards in one column.
- A sticky **Edit ranking** button shows at the bottom while ranked.
- The filter-bar modals (including Availability) keep working and stay in sync, because they read the same store.

---

## 9. Docs to update on this branch
- Add a note at the top of PRD §7.7: *"Superseded by `docs/MavenScout-match-rework.md`."* Don't rewrite §7.7 itself.
- Update the Loop8 section of `DEVELOPER-HANDOFF.md` to point at §4 and §6 of this spec as the new contract.
- PRD §6 (Information Architecture): note that `/match` now redirects into directory ranking mode.

---

## 10. Acceptance criteria

- [ ] **Rank candidates** opens the "Set your priorities" modal (centered, up to 1140px; full-screen sheet on phones). Esc or close leaves without losing committed state, and asks before discarding draft changes. Header and footer stay pinned while the content scrolls; the grid stays at 3 columns.
- [ ] Step 1 shows the eight areas (Expertise, Career level, Languages, Employers, Location, Availability, Work arrangement, Profile media) with per-area caps (5 expertise, 3 languages, 3 employers; one career level, location and work arrangement). New picks start at Important; nothing defaults to Must have.
- [ ] The strength control has three segments, Nice to have / Important / Must have, with Must have set apart; there is no "No preference".
- [ ] "Your priorities" (and the Summary tab) groups rows by strength; dragging a row changes its strength; removing or clearing can be undone from a toast.
- [ ] Filter bar and Must have rows are one state: setting a filter creates Must have rows; raising a row to Must have adds it to the filter bar; lowering it keeps the row but removes it from the filter bar; clearing a filter deletes its Must have rows; employer Must haves the filter can't show appear as a filter-bar chip that opens the modal at that row.
- [ ] Languages and employers are one row per item, each at its own strength; several Must haves in one area mean "any of".
- [ ] Employers support Now / Before / Either and "Also count <peer group>"; peers earn partial credit, and a Must have that counts peers admits them.
- [ ] The Availability area and the filter's Availability modal share one control: Part time / Full time toggle, four "Available now…" shortcuts, and custom start/end dates.
- [ ] Video Q&As and audio testimonials can be set at any strength in Profile media.
- [ ] "See my matches" runs a priorities ranking; "Match to a Job Description" → paste → "Read job description" pre-fills stated locations and languages at Nice to have ("from JD", with Clear suggestions) and never sets Must have; "See your matches" runs a JD ranking.
- [ ] Live pool preview updates as the draft changes; at 0 the run is disabled and it names the Must have to relax.
- [ ] After a run: tightening a Must have hides failing candidates instantly with no re-run and persists the change; loosening one offers to score only the newly eligible candidates; changing a Nice to have / Important row or the JD shows a Re-run prompt, and those unsaved edits survive leaving and returning (per-tab draft) without changing the stored ranking.
- [ ] Ranking mode is held in the URL; reload and back restore the ranked view; Clear ranking exits ranking mode and keeps Must haves as filters.
- [ ] While ranked: Featured-first float suspended; sort dropdown locked to "Ranked by match"; the header button reads Edit ranking.
- [ ] `/match` redirects to `/?rank=1`.
- [ ] JD textarea enforces 200–15,000 characters with a live counter.
- [ ] Expertise Must haves use the filter logic (tags only).
- [ ] Candidates failing any Must have are excluded before scoring; the results line shows how many were filtered out.
- [ ] Total = (1 − w) × Fit + 100 × w × (earned ÷ possible), w = min(possible × 2.5, 20) / 100; no applicable preference rows → total = Fit; not-applicable rows count toward neither earned nor possible; no cap row and no clamp. `PREFERENCE_POINTS` (1 / 3), `PREFERENCE_PERCENT_PER_POINT` and `PREFERENCE_CAP_POINTS` live in `config.ts`; `w`, earned and possible are stored in `match_results.scoring`.
- [ ] A single Nice to have row moves any total by at most about 2.5 points; a single Important row by at most about 7.5.
- [ ] Partial credits follow `CREDIT` in config (same expertise group, adjacent career level, peer organization, nearby location, near-miss availability, Working instead of Fluent).
- [ ] Preference rows show their own points, never score points, in the card breakdown, in the About table and in the narrative; the conversion appears once, at the subtotal. The score column adds up exactly: Fit part = round((1 − w) × Fit), preference part = total − Fit part.
- [ ] Runs saved under the old 3 / 8 points keep their stored scores and show their rows on that scale.
- [ ] `008_score_normalization.sql` runs cleanly and is safe to re-run; the Sahel ranking is re-created under the new formula.
- [ ] Bands display per thresholds; ties break by Fit, then availability freshness, then id; membership does not affect ranked order.
- [ ] Each ranked card has a fixed-height rank header with match %, progress bar and an inline "x of y met" breakdown; card heights stay uniform; "About this result" shows the full build-up.
- [ ] Narrative references actual numbers and never contradicts them.
- [ ] Ranking inside an opening persists (JD, extraction, requirements, results) and reloads; ad-hoc ranking remains transient unless saved.
- [ ] `005_match_rework.sql` runs cleanly on the existing database; the seeded Sahel ranking works under the new model.
- [ ] Placeholder extraction and scoring are clearly labeled in code and UI.
- [ ] Every new surface works at 375px: the priorities sheet, area strip, strength controls, Summary, live pool preview, rank header and breakdown, About modal (as a full-screen sheet), and filter-bar ↔ modal sync.

---

## 11. Preferences-only ranking (no job description)

A manager can rank without a JD. The JD is step 2 of the priorities modal and is optional: **See my matches** on step 1 runs a priorities-only ranking.

- **When it runs.** A run with an empty JD box is a preferences run. It needs at least one Nice to have or Important row ("Add at least one preference to rank."); Must haves pre-filter the pool as in a JD run. A JD that has been pasted but not read blocks Run ("Read the job description first, or clear it to rank by preferences.") rather than silently becoming a preferences run.
- **Scoring — app-side, never the engine.** With no JD there is no Fit, so neither `extractRequirements` nor `rankPool` is called. `src/lib/matching/preferences.ts` scores the pool with the same preference rows, points and credits as a JD run (`adjustments.ts`, `config.ts`): **total = round(100 × earned ÷ possible)**; a candidate none of whose rows apply scores 0. Not-applicable rows count toward neither earned nor possible.
- **Order.** Exact earned ÷ possible ↓, then more recent `availability_updated_at`, then id. Membership never affects rank.
- **Stored.** `job_descriptions.mode` (`019_ranking_mode.sql`): `'jd'` | `'preferences'`. A preferences run stores `raw_text = ''` and `extracted = NULL`; its `match_results` have `band` and `fit_score` NULL, `scoring` as usual, and a one-line `narrative`. In code it is a `PreferenceMatchResult` (`fit_score: null`); the engine contract (`RankPoolFn → JdMatchResult[]`) is unchanged.
- **Display.** No Fit and no bands. Results line: "N experts ranked by your priorities." Card rank headers show the rank and match % (earned ÷ possible) with "x of y met"; opening rows show "#1 · Meets 23 of 46 preference points (50%)". The card breakdown and About modal show the preference rows and their total only. Instead of the ~100-word narrative, a template line: "Meets 4 of 6 preferences (1 partly); missing: Speaks French fluently, Available by Mar 2027."
- **Saving and switching.** Preferences runs save to openings like any run. Pasting a JD afterwards shows the usual "Requirements changed — Re-run" prompt and the re-run is a normal JD ranking; clearing the JD of a JD run does the reverse. Loosening a Must have scores newcomers in the run's own mode.

Acceptance:
- [ ] Run with no JD and one preference row ranks the pool; with no preference rows Run is disabled with "Add at least one preference to rank."
- [ ] No engine call (`extractRequirements`, `rankPool`) happens for a preferences run.
- [ ] Results line, rank headers, card breakdown and About modal show no Fit and no band.
- [ ] Pasting and reading a JD after a preferences run offers Re-run, which produces a JD ranking.
- [ ] `npm run baseline` output is unchanged (it uses JD runs only).
- [ ] Works at 375px.
