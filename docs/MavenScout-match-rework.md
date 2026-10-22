# MavenScout — Match Rework Spec (Branch 1)

**Status:** Build spec for the `match-rework` branch (revision 3 — ranking is a mode of the directory, worked in a right-hand drawer; rows exist only when added; extraction suggests rather than applies). **Supersedes PRD §7.7** and the AI-match rows of the PRD Decisions table wherever they conflict. Everything not mentioned here stays as the PRD describes.
**Owner:** Benji · **Date:** October 2026

---

## 0. Read this first

**What this branch does:** replaces the "Rank by Job Description" modal and its sliders with a single requirements model. Ranking happens inside the directory: a drawer slides in from the right, and the grid itself becomes the ranked list. Filters and preferences become one grid of rows, each at one of three levels — **Nice to have / Important / Required** (internally `slight` / `strong` / `must`). A row only exists once it's added; no row means no preference. Required rows are hard pre-filters applied *before* scoring. Everything else adjusts a fit score additively, so every point in the final score can be explained.

**Ground rules:**
- Keep the engine isolated in `src/lib/matching/` — the UI must only touch it through the contract in §6. (As built: the engine is `extract.ts`, `fit.ts`, `adjustments.ts`, `score.ts`, `narrative.ts`; persistence is `persist.ts`; display rounding is `display.ts`; the requirements grid / filter-bar state and the Required pre-filter live app-side in `src/lib/requirements/`.)
- Placeholder logic (extraction and scoring) stays **clearly labeled as placeholder** in code comments and in the UI, exactly as today. Loop8 replaces it.
- All tunable numbers (points, cap, band thresholds) live in **one config file** (`src/lib/matching/config.ts`), commented as tunable.
- The directory **filter bar stays.** It is the view of the Required rows — one shared state, not two (see §2.1).
- Mobile (375px) is a first-class target — verify every new surface there.
- **Out of scope for this branch** (Branch 2, later): Mapbox location, UN M49 regions, canonical language list + proficiency, map view. This branch uses the existing free-text `location` and `languages` fields and the existing dynamic filter options. Structure the location and language rows so Branch 2 can swap their value pickers without touching scoring.

---

## 1. Summary of changes

| Removed | Added |
|---|---|
| "Rank by Job Description" modal | A **ranking drawer** that slides in from the right over the directory; the grid itself becomes the ranked list ("ranking mode") |
| Merit sliders (Demonstrated Experience, Domain Expertise, Technical Skills) | A fixed **Fit** score (holistic fit to the JD — not adjustable) |
| Five 0–5 preference sliders | A **requirements grid**: rows are added as needed, each Nice to have / Important / Required |
| Hiring-organization field in the JD step | Org name lives inside the Organizational History row |
| Filters and ranking as separate state that can drift apart | Filter bar and Required rows are **one shared state**; Required rows pre-filter before scoring |
| Expanding "Why this score?" box above each card | Fixed rank strip + "Match" flip face + "About this result" modal |
| Weighted-average total | **Additive** total: Fit + preference adjustments (capped) |
| `Best Match` as one sort option among others | While ranking mode is on, order is always rank order (sort dropdown locked); the ranking is held in the URL |

**Unchanged:** login gating (ranking requires a hiring-manager account), ranking persistence semantics (ranking inside an opening persists; ad-hoc ranking is transient unless saved to an opening), "Save ranking to opening…", openings showing their persisted ranking.

---

## 2. User flow

Managers see three levels — **Nice to have**, **Important**, **Required** — stored as `slight`, `strong`, `must`. This spec uses the manager-facing names; "Required row" and "must-have" mean the same thing.

**Entry points**
- Directory → "Rank by Job Description" → opens the **ranking drawer** (§8). Filters already set in the filter bar are already Required rows (shared state, §2.1); the search term stays as a pool constraint.
- Opening → "Rank candidates" → opens the directory in ranking mode linked to that opening (`/?opening=:id&rank=1`), keeping today's opening linkage: the run saves to that opening, and the banner says "Ranking for: <opening name>". If the opening already has a persisted ranking, load its JD, requirements, and results.
- The old `/match` route redirects to `/?rank=1` (drawer open).

**Step 1 — Job description**
- Textarea, **max 15,000 characters, min 200**, live counter (e.g. "3,412 / 15,000").
- Hint text: *"Paste the scope of work and qualifications sections. You can paste the full ToR — we'll pull out what matters."*
- Paste only (no file upload this branch). Future note in code: docx/PDF upload should **fill this textarea** so the manager sees and can trim extracted text.
- Button: **"Read job description"** → calls `extractRequirements` (§4). After extraction, collapse the textarea to a 3-line preview with "Edit".

**Step 2 — Review requirements**
- **Extraction suggests; it doesn't apply.** After reading, a **"Found in your JD"** box lists suggestion chips grouped as Expertise / Skills / Locations / Languages, each with its mention count (e.g. "Climate Adaptation (3×)") and a **+**, plus an **"Add all"** link. An added suggestion becomes a row at **Nice to have**, tagged "from JD". Nothing is added to the grid automatically.
- The only rows that arrive on their own are **filters the manager already set**, which are Required rows tagged "from filters".
- A suggestion that's already in the grid — in any row, at any level — shows as added (✓). A location or language suggestion goes to that kind's **preference row** (joining it, which keeps its level, or creating it at Nice to have); it **never widens a Required row**. So with Required: French set as a filter, adding the English suggestion creates "Language · Nice to have · English" alongside it. Expertise/skill suggestions respect the 10-row cap.
- The search term shows as a pool chip ("Search: 'climate'") that also constrains the pool.
- **Live count**, debounced: *"23 candidates meet everything marked Required"*. If 0: disable Run and say which Required rows to loosen (and how many each would admit). Under 5: show a gentle warning.

**Step 3 — Run**
- Runs the Required pre-filter → scoring on the survivors → the drawer closes and the directory grid re-sorts into rank order, each card gaining its rank strip (§7). **Edit requirements** reopens the drawer.
- What happens on later changes is in §2.2.

**Guardrails on extraction (important):**
- Extraction **never suggests Required.** Only carried-over filters arrive as Required; any other Required row is a deliberate manager choice.
- Extraction may report a hiring organization; it is only ever a suggestion. Org History is added by the manager on purpose (§3.1).

### 2.1 Shared requirements state

- **One store** (`src/lib/requirements/store.ts`) holds `Requirement[]` and the search term; the active ranking id lives in the URL. The filter bar and the ranking drawer both read and write it. There is no separate copy of filter state.
- **Rows only exist when added** — from a JD suggestion, an add chip in the grid (§3), or a filter. Removing a row (×) means no preference. There is no "No preference" level.
- **Multi-value kinds can have two rows.** Location, Language, Type, Career level and Work arrangement allow **one Required row and one separate preference row** (Nice to have or Important) of the same kind — e.g. Required: French plus Nice to have: English. Availability, Verified and Org history have at most one row.
- **The filter bar is the Required view.** Each filter-bar control maps to the Required rows of its kind: Type, Domain Expertise, Skills, Career Level, Work Arrangement, Location, Language, Availability, Verified only.
  - Setting a filter creates that kind's Required row, tagged "from filters", or updates it. For a multi-value kind, any preference row of that kind is a separate row and is left as is. (Availability and Verified, which have one row at most, turn that row Required.)
  - Raising a grid row to Required makes it appear in the filter bar. If a multi-value kind already has a Required row, raising its preference row merges its values into the Required row — the manager is explicitly making them required.
  - Lowering a row from Required to Important or Nice to have keeps the row but removes it from the filter bar. If a multi-value kind already has a preference row, the lowered values merge into it at the chosen level. Clearing a filter deletes its Required row (a preference row of that kind stays).
- **Matching semantics are unchanged.** Required-row evaluation reuses the existing filter logic exactly (e.g. selecting a parent category matches its children). Several Required expertise (or skill) rows mean "any of", like several selections in one filter dropdown; different kinds combine with AND. Career level never excludes firms (they're not applicable).
- **Grid-only Required rows** (Org History has no filter-bar control): show a chip at the end of the filter bar — "+1 required: Org history" — that opens the drawer at that row.
- **Outside ranking mode** the filter bar behaves exactly as today. Nice to have / Important rows only exist once the drawer is used.

### 2.2 Changes after a run

| Change | Behavior |
|---|---|
| **Tighten** a Required row (add a filter, narrow a selection, add or narrow the search term) | Instant. Hide candidates who now fail; ranks renumber. No re-run. The change is written back to the run (no re-scoring), so a reload keeps it. |
| **Loosen** a Required row (remove a filter, widen a selection, Clear All) | Newly eligible candidates are unscored and hidden. Show *"N more candidates now qualify — Score them."* Score only the newcomers (`rankPool` on that subset), merge, and re-rank. Code comment for Loop8: if the engine normalizes scores across the pool, this becomes a full re-run. |
| Change a Nice to have / Important row, add or remove such a row, or edit the JD | Show *"Requirements changed — Re-run ranking."* Do **not** auto re-run. |

- **Unsaved edits survive navigation.** Nice to have / Important and JD edits made after a run aren't scored until a re-run, and the stored ranking stays exactly as scored. They're kept as a per-tab draft (sessionStorage, keyed by ranking id), so leaving and returning — Back from a profile, a reload — restores them along with the Re-run prompt. Re-run or Clear discards the draft; undoing the edits discards it too. (Required-row changes don't need this: they're written back to the run immediately.)
- **URL state:** ranking mode lives in the URL as `/?ranking=<job_description_id>` (plus `opening=:id` when linked, and `q` / `qm` for the search term). Reload and back restore the ranked view. Ad-hoc rankings are a `job_descriptions` row with `opening_id` null — unlisted, and replaced by the manager's next ad-hoc run unless saved to an opening.
- **While ranking mode is active:** the Premium-first float is suspended; the sort dropdown shows "Ranked by match" and is disabled.
- **Clear** (in the ranking banner) exits ranking mode: the JD, preference rows, and ranking are dropped; Required rows stay as plain filters. **Clear All** (in the filter bar) deletes Required rows only (and the search term, as today) and counts as loosening.

---

## 3. The requirements grid

Each row: label · value picker · level control · source tag (from JD / from filters / added) · remove (×). Every row can be removed.
Level control: segmented control **Nice to have / Important / Required** — no "No preference" segment, because removing the row means that. Full width under the row label at every size.

The grid has two sections:
- **Expertise & skills** — rows from JD suggestions or "+ Expertise" / "+ Skill" (taxonomy picker). Several rows allowed.
- **Other requirements** — **starts empty**, with one add chip per kind, in this order: **+ Location, + Language, + Availability, + Org history, + Type, + Career level, + Work arrangement, + Verified**. Adding one creates that row at Nice to have; × removes it.
  - Multi-value kinds (Location, Language, Type, Career level, Work arrangement) can have **one Required row and one preference row**; a kind's Required row is listed first. While a kind has only a Required row (e.g. from a filter), its chip reads "+ Language preference" and adds the preference row; the chip disappears once the preference row exists.
  - Availability, Verified and Org history have at most one row; their chip disappears while the row exists.

Rows added by the manager start at **Nice to have**.

### 3.1 Other requirements (single-instance rows, added via chips)

| Row | Value picker | Required allowed? | Met / partial / not met |
|---|---|---|---|
| **Organizational history** | Org name (text; prefilled from `hiring_managers.organization` when the row is added, editable) + scope: *Currently at* / *Ever at* / *Ever at, or at a peer org*. When peer scope is chosen, show an editable **peer organizations** chip list (empty in placeholder; manager can add names; helper text: "The real engine will suggest peers"). Ethics note on the row: add it deliberately, because it can entrench who-you-know hiring. | **Yes** | *Currently at* = a `work_history` entry matching the org with `end_year` null. *Ever at* = any matching entry. *Peer* = any entry matching a listed peer org → **partial** (same org = met). Placeholder name matching: case-insensitive, normalized whole-word contains. |
| **Location** | Select from the existing dynamic location options (multi-select) | Yes | Uses the filter's location matching (a country matches every city in it; a city matches itself). |
| **Language** | Select from the existing dynamic language options (multi-select; "speaks any of") | Yes | Candidate lists the language. |
| **Type** | Individual / Small Firm / Large Firm (multi-select, same as filter) | Yes | `consultant_type` in selection. |
| **Availability** | Engagement type (Part-time / Full-time / Either) + "available by [month]" | Yes | Reuse the existing availability-filter logic. Available within one month after the target → **partial**. |
| **Career level** | Early / Mid / Senior (multi-select) | Yes | Individuals only. **Firms are "not applicable"** — never excluded by this row, never adjusted. |
| **Verified** | (no value) | Yes | `verification_status = 'verified'`. |
| **Work arrangement** | Remote / On-site / Hybrid (multi-select) | Yes | Any overlap with `work_types`. |

A row without a value yet (e.g. Location with no places picked) constrains and scores nothing, and says so.

### 3.2 Expertise & skill rows (from JD suggestions or "+ Expertise" / "+ Skill")

| Row | Value picker | Required allowed? | Met / partial / not met |
|---|---|---|---|
| **Domain expertise** | Taxonomy picker (category or item) | Yes, with warning | See §3.3 |
| **Technical skill** | Taxonomy picker (category or item) | Yes, with warning | See §3.3 |

Cap expertise + skill rows at **10 combined**.
Required is allowed on these rows because the filter bar's Domain Expertise and Skills filters are Required rows (§2.1). When a manager sets Required on one of these rows, show an inline note: *"Candidates can tag only 6 items, so Required may exclude qualified people who didn't tag it. Consider Important."* Required evaluation here uses the existing filter logic (tags only); the text-evidence credit in §3.3 applies only to Nice to have / Important.

### 3.3 Expertise / skill matching (placeholder; credit multipliers in config)

Requested **item** (e.g. "WASH"):
- Tagged as that item, primary → **met** (×1.0)
- Tagged as that item, secondary → **met** (×0.75)
- Tagged only the parent category → **partial** (×0.5)
- Not tagged, but the term appears in bio / portfolio / accreditation text → **partial** (×0.5). This demonstrates the principle that the real engine credits evidence beyond tags.
- Otherwise → not met

Requested **category**: tagged the category or any of its items → met (primary ×1.0 / secondary ×0.75); text evidence only → partial (×0.5).

---

## 4. Extraction — `extractRequirements` (placeholder)

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

Everything here is a **suggestion** shown in the "Found in your JD" box (§2); `mentions` is the count on each chip. Added suggestions become Nice to have rows regardless of `suggested`, which only informs the placeholder Fit (§5.2).

Placeholder behavior: case-insensitive whole-word match of taxonomy item and category names in the JD text (`strong` if the term appears 2+ times, else `slight`); match known location and language options; `hiring_organization` is null. Cap output at 10 expertise + skill suggestions, highest-frequency first.

**Contract requirement for Loop8 (write as a code comment):** the JD is read **once**, here. Scoring receives the extracted requirements plus the stored JD reference — it must not re-send the full JD text per candidate. This keeps a 15,000-character JD from multiplying cost across hundreds of candidates.

Persist the extraction output with the job description (§6.3).

---

## 5. Scoring model

### 5.1 Pipeline
1. **Pool** = approved + active profiles, narrowed by pool chips (search term) and, inside an opening, today's opening pool semantics.
2. **Required-row (must-have) pre-filter** as a database query (or as close to it as the current code allows; today it runs in the browser on the loaded pool, in `src/lib/requirements/mustHaves.ts`). Candidates failing any Required row are **not scored**. Required rows add no points.
3. **Score** each survivor: `total = clamp(fit + Σ adjustments, 0, 100)`.
4. **Rank**, then **band**.

### 5.2 Fit (0–100)
The engine's holistic fit to the JD: demonstrated experience (bio, portfolio, accreditations, video/audio transcripts) plus tags. **Not adjustable by the manager.**
Placeholder: reuse today's computation, internally blending the old Demonstrated Experience / Domain / Skills components at the old 5/3/3 ratio. Labeled placeholder. Tune the placeholder so a profile that is clearly on-topic for the JD lands **≥ 70** — real calibration is Loop8's job, but the demo should not cluster everyone in the 40s.

### 5.3 Adjustments (constants in config)
For every Nice to have or Important row with a value (Required rows add no points; they already filtered the pool):

| Level | Met | Partial | Not met | Not applicable |
|---|---|---|---|---|
| Nice to have (`slight`) | +3 | +3 × credit | 0 | 0 |
| Important (`strong`) | +8 | +8 × credit | 0 | 0 |

- `credit` = the multiplier from §3.3 or 0.5 for other partials (peer org, near-miss availability).
- **Total positive adjustment cap: +20.** Preferences reorder close candidates; they cannot lift a weak fit past a strong one by more than 20 points. When the cap bites, show it in the breakdown ("Preference bonus capped at +20").
- **Rounding:** compute in floats; store and display the total and Fit rounded. Displayed adjustment points use **largest-remainder rounding** (floor every value, then give the leftover whole points to the values with the largest fractional parts) so they always sum **exactly** to (displayed total − displayed Fit) — e.g. three +2.25 partials with total − Fit = 7 show as +3, +2, +2. When the +20 cap (or the 100 ceiling) applies, the rows are rounded to their uncapped sum and a cap row (and, if needed, a 100-ceiling row) brings the build-up to exactly (total − Fit). The middle number of "Fit 72 + 10 = 82" is that sum, never a separately derived value.

### 5.4 Bands (thresholds in config)
- **80–100:** Strong match
- **65–79:** Good match
- **50–64:** Partial match
- **< 50:** Weak match

### 5.5 Ordering
- Sort by total score, descending.
- **Tie-break:** higher Fit → more recent `availability_updated_at` → profile id (deterministic).
- **Premium never affects ranked order.** The directory's Premium-first float does **not** apply while ranking mode is active. Paid placement inside a merit ranking would undermine trust in the scores.
- Every ranked result shows its rank number (this replaces the PRD's "top 15 prominent" rule).

---

## 6. Contract and persistence

### 6.1 Types (`src/lib/matching/types.ts`)

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
  points: number;                // signed, after credit, before cap
  detail: string;                // e.g. "Tagged as secondary expertise"; org: "Same org" / "Peer org: ADB"
}

interface MatchResult {
  profile_id: string;
  rank: number;
  total_score: number;           // 0–100, after cap and clamp
  band: 'strong' | 'good' | 'partial' | 'weak';
  fit_score: number;             // 0–100
  adjustments: Adjustment[];
  adjustments_capped: boolean;
  must_haves_passed: { requirement_id: string; label: string }[];
  narrative: string;             // ~100 words, PLACEHOLDER template
}

// Engine entry points (placeholder now, Loop8 later):
extractRequirements(jdText, ctx): Promise<ExtractedRequirements>;
rankPool(jobDescriptionId, requirements: Requirement[], pool: Profile[]): Promise<MatchResult[]>;
```

### 6.2 Narrative (placeholder)
Template must be **grounded in the actual numbers** and never contradict them. Reference the band, the Fit score, the largest positive adjustment (with its displayed, largest-remainder points), and the most important unmet Important row (if any). Do not call a preference "the strongest signal" relative to the profile's evidence — the current template does this and should be removed.

### 6.3 Migration — `supabase/005_match_rework.sql`
(Numbered 005 because `004_portfolio_org_and_logos.sql` already existed. `000_schema.sql` carries the same columns for fresh projects.)
- `job_descriptions`: add `requirements jsonb`, `extracted jsonb`; keep `hiring_organization` and `weights` nullable for legacy rows (new code stops writing them).
- `match_results`: add `rank int`, `band text`, `fit_score int`, `adjustments jsonb`, `adjustments_capped bool`, `must_haves_passed jsonb`; keep `sub_scores` nullable for legacy rows.
- Re-create the seeded Sahel opening's persisted ranking under the new model (or delete it and document how to re-run it). As built: 005 deletes pre-rework rankings; the Sahel ranking was re-created through the UI from `docs/samples/sahel-me-tor.txt` (steps in `DEVELOPER-HANDOFF.md`).
- Add `005` to the run order in `DEVELOPER-HANDOFF.md` and anywhere else the order is listed.

---

## 7. Results display

### 7.1 Card rank strip
- A slim, **fixed-height** strip integrated into the top of the card frame (one card, not a separate box above it): **"#1 · 82 · Strong match"** + an **"About this result"** link.
- Never expands. Card heights stay uniform across the grid.
- Openings and `/shortlists/:token` show candidates as list rows, not flip cards, so each row carries a compact form of the same strip ("#4 · 95 · Strong match · About this result") in place of the old score badge and "Why this score?" box. The rank shown there is the candidate's rank in the saved run.

### 7.2 "Match" flip face
- Inserted as **face 2** (right after Front), in the directory while ranking mode is on. (Openings and shared shortlists have no flip cards; their rows get the strip and the "About this result" modal — §7.1.)
- Contents, top to bottom:
  - Fit score bar with its value.
  - Adjustment list, each with an outcome icon (✓ met / ◐ partial / ✗ not met / – n/a), label, and points (e.g. "+8").
  - Required line: "Meets all 3 Required rows" (omit if none).
  - Equation line: **"Fit 72 + 10 = 82"** (note the cap if it applied). The middle number is the sum of the displayed adjustments plus any cap row (largest-remainder rounding, §5.3), so it always adds up.
- Must fit the face without scrolling at desktop and 375px. If there are more than 6 adjustments, show the 6 largest by |points| and "+N more" → opens the modal.

### 7.3 "About this result" modal
- Header: name, rank, score, band.
- **Score build-up table:** Fit row, one row per adjustment (outcome, detail, points), cap row if applied, total.
- Required rows met (✓ list).
- Narrative (~100 words, labeled placeholder).
- Collapsible **"How scoring works"**: Fit is the engine's judgment of fit to the JD; preferences add up to +20; must-haves exclude before scoring; tie-break rule; Premium does not affect rank; placeholder notice.
- Mobile: full-screen sheet.

### 7.4 Results header banner
Keep the current banner: "Ranked N candidates against your JD · placeholder scorer" · **Save ranking to opening…** · **Clear**. Add:
- "N excluded by Required rows".
- An **Edit requirements** button that reopens the drawer.
- When linked to an opening: "Ranking for: <opening name>", and hide Save (the run saves automatically).

**Clear** behaves as described in §2.2.

---

## 8. Ranking mode layout (directory)

**Desktop**
- **Ranking drawer** slides in from the right edge: full viewport height, **~480px** wide, overlaying the card grid with a light scrim. Clicking the scrim or pressing **Esc** closes it without losing anything (the JD, suggestions and rows live outside the drawer).
- The drawer's **header** (title, linked opening, close) and **footer** (live count + Run) stay pinned; the content between them — JD step, "Found in your JD", requirements grid — scrolls.
- The card grid stays at **3 columns at all times**; there is no 2-column state.
- **After Run** the drawer closes and the ranked grid shows; the banner's **Edit requirements** reopens it.

**Mobile**
- The drawer is a full-screen sheet with numbered steps (job description → review requirements → run). Run closes the sheet and shows ranked cards in one column.
- A sticky **Edit requirements** button shows while ranked.
- The filter-bar modals (including Availability) keep working and stay in sync with the sheet — both read the same store.

---

## 9. Docs to update on this branch
- Add a note at the top of PRD §7.7: *"Superseded by `docs/MavenScout-match-rework.md`."* Don't rewrite §7.7 itself.
- Update the Loop8 section of `DEVELOPER-HANDOFF.md` to point at §4 and §6 of this spec as the new contract.
- PRD §6 (Information Architecture): note that `/match` now redirects into directory ranking mode.

---

## 10. Acceptance criteria

- [ ] Directory "Rank by Job Description" opens the ranking drawer from the right (~480px, full height, light scrim); Esc or a click outside closes it without losing state; header and footer stay pinned while the content scrolls; the grid stays at 3 columns.
- [ ] Rows exist only when added: the grid starts empty apart from filters already set, which appear as Required rows tagged "from filters"; "Other requirements" offers add chips (+ Location, + Language, + Availability, + Org history, + Type, + Career level, + Work arrangement, + Verified); × removes any row; the search term shows as a pool chip.
- [ ] Location, Language, Type, Career level and Work arrangement allow one Required row plus one separate preference row (e.g. Required: French, Nice to have: English); a filter only ever edits the Required row; level changes that would create a second Required or preference row of a kind merge into the existing one.
- [ ] The level control has three segments — Nice to have / Important / Required — and no "No preference".
- [ ] Filter bar and Required rows are one state: setting a filter creates a Required row; raising a row to Required adds it to the filter bar; lowering it below Required removes it from the filter bar but keeps the row; clearing a filter deletes its Required row; grid-only Required rows (Org History) show as a filter-bar chip.
- [ ] "Read job description" shows a "Found in your JD" box of suggestion chips with mention counts, each with +, and an "Add all" link; nothing is added automatically; added suggestions become Nice to have rows tagged "from JD"; extraction never suggests Required; location/language suggestions for a kind with a Required row add to (or create) that kind's preference row and never widen the Required row.
- [ ] After a run: tightening a Required row hides failing candidates instantly with no re-run and persists the change; loosening one offers to score only the newly eligible candidates; changing a Nice to have / Important row or the JD shows a Re-run prompt, and those unsaved edits survive leaving and returning (per-tab draft) without changing the stored ranking.
- [ ] Ranking mode is held in the URL; reload and back restore the ranked view; Clear exits ranking mode and keeps Required rows as filters.
- [ ] While ranked: Premium-first float suspended; sort dropdown locked to "Ranked by match"; Run closes the drawer and Edit requirements reopens it.
- [ ] `/match` redirects to `/?rank=1`.
- [ ] JD textarea enforces 200–15,000 characters with a live counter.
- [ ] Org History supports Currently at / Ever at / Ever at or peer, with an editable peer list, and allows Required.
- [ ] Expertise and skill rows allow Required with the inline warning; max 10 combined.
- [ ] Live count updates as rows change; Run is disabled at 0.
- [ ] Candidates failing any Required row are excluded before scoring; the banner shows how many were excluded.
- [ ] Total = Fit + adjustments, positive adjustments capped at +20, clamped 0–100; all constants live in `config.ts`.
- [ ] Displayed adjustments use largest-remainder rounding and sum exactly to (displayed total − displayed Fit), with cap / 100-ceiling rows when they apply.
- [ ] Bands display per thresholds; ties break by Fit, then availability freshness, then id; Premium does not affect ranked order.
- [ ] Each ranked card has a fixed-height rank strip, a "Match" face 2 with the equation line, and an "About this result" modal with the full build-up table; card heights stay uniform.
- [ ] Narrative references actual numbers and never contradicts them.
- [ ] Ranking inside an opening persists (JD, extraction, requirements, results) and reloads; ad-hoc ranking remains transient unless saved.
- [ ] `005_match_rework.sql` runs cleanly on the existing database; the seeded Sahel ranking works under the new model.
- [ ] Placeholder extraction and scoring are clearly labeled in code and UI.
- [ ] Every new surface works at 375px: ranking sheet, level controls, suggestion chips, live count, Run, match face, modal (as full-screen sheet), and filter-bar ↔ sheet sync.
