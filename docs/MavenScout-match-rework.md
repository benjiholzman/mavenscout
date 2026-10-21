# MavenScout — Match Rework Spec (Branch 1)

**Status:** Build spec for the `match-rework` branch (revision 2 — ranking is a mode of the directory, not a separate page). **Supersedes PRD §7.7** and the AI-match rows of the PRD Decisions table wherever they conflict. Everything not mentioned here stays as the PRD describes.
**Owner:** Benji · **Date:** October 2026

---

## 0. Read this first

**What this branch does:** replaces the "Rank by Job Description" modal and its sliders with a single requirements model. Ranking happens inside the directory: a panel opens beside the grid, and the grid itself becomes the ranked list. Filters and preferences become one grid with four levels (No preference / Slight / Strong / Must-have). Must-haves are hard pre-filters applied *before* scoring. Everything else adjusts a fit score additively, so every point in the final score can be explained.

**Ground rules:**
- Read `src/lib/matching/`, `run.ts`, the current JD modal, and the ranked-results UI before changing anything. Keep the engine isolated in `src/lib/matching/` — the UI must only touch it through the contract in §6.
- Placeholder logic (extraction and scoring) stays **clearly labeled as placeholder** in code comments and in the UI, exactly as today. Loop8 replaces it.
- All tunable numbers (points, cap, band thresholds) live in **one config file** (`src/lib/matching/config.ts`), commented as tunable.
- The directory **filter bar stays.** When a ranking is active it is a view of the must-have rows — one shared state, not two (see §2.1).
- Mobile (375px) is a first-class target — verify every new surface there.
- **Out of scope for this branch** (Branch 2, later): Mapbox location, UN M49 regions, canonical language list + proficiency, map view. This branch uses the existing free-text `location` and `languages` fields and the existing dynamic filter options. Structure the location and language rows so Branch 2 can swap their value pickers without touching scoring.

---

## 1. Summary of changes

| Removed | Added |
|---|---|
| "Rank by Job Description" modal | A **ranking panel** that opens beside the directory grid; the grid itself becomes the ranked list ("ranking mode") |
| Merit sliders (Demonstrated Experience, Domain Expertise, Technical Skills) | A fixed **Fit** score (holistic fit to the JD — not adjustable) |
| Five 0–5 preference sliders | A **requirements grid** with four levels per row |
| Hiring-organization field in the JD step | Org name lives inside the Organizational History row |
| Filters and ranking as separate state that can drift apart | Filter bar and must-have rows are **one shared state**; must-haves pre-filter before scoring |
| Expanding "Why this score?" box above each card | Fixed rank strip + "Match" flip face + "About this result" modal |
| Weighted-average total | **Additive** total: Fit + preference adjustments (capped) |
| `Best Match` as one sort option among others | While ranking mode is on, order is always rank order (sort dropdown locked); the ranking is held in the URL |

**Unchanged:** login gating (ranking requires a hiring-manager account), ranking persistence semantics (ranking inside an opening persists; ad-hoc ranking is transient unless saved to an opening), "Save ranking to opening…", openings showing their persisted ranking.

---

## 2. User flow

**Entry points**
- Directory → "Rank by Job Description" → opens the **ranking panel** beside the grid. The current filters are already must-have rows (shared state, §2.1); the search term stays as a pool constraint.
- Opening → "Rank candidates" → opens the directory in ranking mode linked to that opening (`/?opening=:id&rank=1`), keeping today's opening linkage: the run saves to that opening, and the banner says "Ranking for: <opening name>". If the opening already has a persisted ranking, load its JD, requirements, and results.
- The old `/match` route redirects to `/?rank=1` (panel open).

**Step 1 — Job description**
- Textarea, **max 15,000 characters, min 200**, live counter (e.g. "3,412 / 15,000").
- Hint text: *"Paste the scope of work and qualifications sections. You can paste the full ToR — we'll pull out what matters."*
- Paste only (no file upload this branch). Future note in code: docx/PDF upload should **fill this textarea** so the manager sees and can trim extracted text.
- Button: **"Read job description"** → calls `extractRequirements` (§4) and fills the grid. After extraction, collapse the textarea to a 3-line preview with "Edit".

**Step 2 — Review requirements (the grid, §3)**
- Rows come from two sources:
  - **From the JD** (extraction) — tagged "from JD".
  - **From the filter bar** — every active filter already *is* a Must-have row (§2.1), tagged "from filters". The search term shows as a pool chip ("Search: 'climate'") that also constrains the pool.
  - If extraction suggests a row that already exists as a must-have, keep the must-have.
- **Live count**, debounced: *"23 candidates meet your must-haves"*. If 0: disable Run and say which must-have rows to loosen. Under 5: show a gentle warning.

**Step 3 — Run**
- Runs must-have pre-filter → scoring on the survivors → the directory grid re-sorts into rank order and each card gains its rank strip (§7). On mobile, the panel (a full-screen sheet) closes to reveal the results.
- What happens on later changes is in §2.2.

**Guardrails on extraction (important):**
- Extraction **never sets Must-have.** Only carried-over filters arrive as must-haves; any other must-have is a deliberate manager choice.
- Extraction may fill in the organization name on the Org History row, but **leaves its level at No preference.** That row only affects ranking if the manager turns it on.

### 2.1 Shared requirements state

- **One store** (e.g. `src/lib/matching/requirementsStore.ts` or a React context) holds `Requirement[]`, the search term, and the active ranking id. The filter bar and the ranking panel both read and write it. There is no separate copy of filter state.
- **The filter bar is the must-have view.** Each filter-bar control maps to the must-have rows of its kind: Type, Domain Expertise, Skills, Career Level, Work Arrangement, Location, Language, Availability, Verified only.
  - Setting a filter creates or updates a Must-have row.
  - Raising a grid row to Must-have makes it appear in the filter bar.
  - Lowering a row from Must-have to Strong or Slight removes it from the filter bar. The filter bar only ever shows must-haves.
- **Matching semantics are unchanged.** Must-have evaluation reuses the existing filter logic exactly (e.g. selecting a parent category matches its children).
- **Grid-only must-haves** (Org History has no filter-bar control): show a chip at the end of the filter bar — "+1 must-have: Org history" — that opens the panel at that row.
- **Outside ranking mode** the filter bar behaves exactly as today. Slight/Strong rows only exist once the panel is used.

### 2.2 Changes after a run

| Change | Behavior |
|---|---|
| **Tighten** a must-have (add a filter, narrow a selection, add or narrow the search term) | Instant. Hide candidates who now fail; ranks renumber. No re-run. |
| **Loosen** a must-have (remove a filter, widen a selection, Clear All) | Newly eligible candidates are unscored. Show *"N more candidates now qualify — Score them."* Score only the newcomers (`rankPool` on that subset), merge, and re-rank. Code comment for Loop8: if the engine normalizes scores across the pool, this becomes a full re-run. |
| Change a Slight/Strong row, add or remove a preference row, or edit the JD | Show *"Requirements changed — Re-run ranking."* Do **not** auto re-run. |

- **URL state:** ranking mode lives in the URL as `/?ranking=<job_description_id>` (plus `opening=:id` when linked). Reload and back restore the ranked view. Ad-hoc rankings keep today's behavior: a `job_descriptions` row with `opening_id` null, unlisted and transient unless saved to an opening.
- **While ranking mode is active:** the Premium-first float is suspended; the sort dropdown shows "Ranked by match" and is disabled.
- **Clear** (in the ranking banner) exits ranking mode: the JD, preference rows, and ranking are dropped; active filters stay as plain filters. **Clear All** (in the filter bar) clears must-haves only and counts as loosening.

---

## 3. The requirements grid

Each row: label · value picker · level control · source tag (from JD / from filters / added) · remove (×, for addable rows).
Level control: segmented control **No preference / Slight / Strong / Must-have**. On mobile, the same control full-width under the row label.

### 3.1 Always-present rows (default: No preference)

| Row | Value picker | Must-have allowed? | Met / partial / not met |
|---|---|---|---|
| **Organizational history** | Org name (text; prefill from `hiring_managers.organization`, editable) + scope: *Currently at* / *Ever at* / *Ever at, or at a peer org*. When peer scope is chosen, show an editable **peer organizations** chip list (empty in placeholder; manager can add names; helper text: "The real engine will suggest peers"). Keep the existing ethics note: off by default because it can entrench who-you-know hiring. | **Yes** | *Currently at* = a `work_history` entry matching the org with `end_year` null. *Ever at* = any matching entry. *Peer* = any entry matching a listed peer org → **partial** (same org = met). Placeholder name matching: case-insensitive, normalized contains. |
| **Location** | Select from the existing dynamic location options (multi-select) | Yes | Placeholder: case-insensitive substring ("Kenya" matches "Nairobi, Kenya"). |
| **Language** | Select from the existing dynamic language options (multi-select; "speaks any of") | Yes | Candidate lists the language. |
| **Type** | Individual / Small Firm / Large Firm (multi-select, same as filter) | Yes | `consultant_type` in selection. |
| **Availability** | Engagement type (Part-time / Full-time / Either) + "available by [month]" | Yes | Reuse the existing availability-filter logic. Available within one month after the target → **partial**. |
| **Career level** | Early / Mid / Senior (multi-select) | Yes | Individuals only. **Firms are "not applicable"** — never excluded by this row, never adjusted. |
| **Verified** | (no value) | Yes | `verification_status = 'verified'`. |
| **Work arrangement** | Remote / On-site / Hybrid (multi-select) | Yes | Any overlap with `work_types`. |

### 3.2 Addable rows (from JD or "+ Add expertise" / "+ Add skill")

| Row | Value picker | Must-have allowed? | Met / partial / not met |
|---|---|---|---|
| **Domain expertise** | Taxonomy picker (category or item) | Yes, with warning | See §3.3 |
| **Technical skill** | Taxonomy picker (category or item) | Yes, with warning | See §3.3 |

Cap expertise + skill rows at **10 combined**.
Must-have is allowed on these rows because the filter bar's Domain Expertise and Skills filters are must-haves (§2.1). When a manager sets Must-have on one of these rows, show an inline note: *"Candidates can tag only 6 items, so this may exclude qualified people who didn't tag it. Consider Strong."* Must-have evaluation here uses the existing filter logic (tags only); the text-evidence credit in §3.3 applies only to Slight/Strong.

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
  expertise: { name: string; level: 'category' | 'item'; suggested: 'slight' | 'strong' }[];
  skills:    { name: string; level: 'category' | 'item'; suggested: 'slight' | 'strong' }[];
  locations: string[];             // suggested at 'slight'
  languages: string[];             // suggested at 'slight'
  hiring_organization: string | null; // fills Org History name only; level stays 'none'
}
```

Placeholder behavior: case-insensitive match of taxonomy item and category names in the JD text (`strong` if the term appears 2+ times, else `slight`); match known location and language options; `hiring_organization` may be null. Cap output at 10 expertise + skill rows, highest-frequency first.

**Contract requirement for Loop8 (write as a code comment):** the JD is read **once**, here. Scoring receives the extracted requirements plus the stored JD reference — it must not re-send the full JD text per candidate. This keeps a 15,000-character JD from multiplying cost across hundreds of candidates.

Persist the extraction output with the job description (§6.3).

---

## 5. Scoring model

### 5.1 Pipeline
1. **Pool** = approved + active profiles, narrowed by pool chips (search term) and, inside an opening, today's opening pool semantics.
2. **Must-have pre-filter** as a database query (or as close to it as the current code allows). Candidates failing any must-have are **not scored**. Must-have rows add no points.
3. **Score** each survivor: `total = clamp(fit + Σ adjustments, 0, 100)`.
4. **Rank**, then **band**.

### 5.2 Fit (0–100)
The engine's holistic fit to the JD: demonstrated experience (bio, portfolio, accreditations, video/audio transcripts) plus tags. **Not adjustable by the manager.**
Placeholder: reuse today's computation, internally blending the old Demonstrated Experience / Domain / Skills components at the old 5/3/3 ratio. Labeled placeholder. Tune the placeholder so a profile that is clearly on-topic for the JD lands **≥ 70** — real calibration is Loop8's job, but the demo should not cluster everyone in the 40s.

### 5.3 Adjustments (constants in config)
For every row at Slight or Strong (not Must-have, not No preference):

| Level | Met | Partial | Not met | Not applicable |
|---|---|---|---|---|
| Slight | +3 | +3 × credit | 0 | 0 |
| Strong | +8 | +8 × credit | 0 | 0 |

- `credit` = the multiplier from §3.3 or 0.5 for other partials (peer org, near-miss availability).
- **Total positive adjustment cap: +20.** Preferences reorder close candidates; they cannot lift a weak fit past a strong one by more than 20 points. When the cap bites, show it in the breakdown ("Preference bonus capped at +20").
- Rounding: compute in floats, round only the displayed total and each displayed adjustment.

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
type Level = 'none' | 'slight' | 'strong' | 'must';
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
  level: 'slight' | 'strong';
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
Template must be **grounded in the actual numbers** and never contradict them. Reference the band, the Fit score, the largest positive adjustment, and the most important unmet Strong preference (if any). Do not call a preference "the strongest signal" relative to the profile's evidence — the current template does this and should be removed.

### 6.3 Migration — `supabase/004_match_rework.sql`
- `job_descriptions`: add `requirements jsonb`, `extracted jsonb`; keep `hiring_organization` and `weights` nullable for legacy rows (new code stops writing them).
- `match_results`: add `rank int`, `band text`, `fit_score int`, `adjustments jsonb`, `adjustments_capped bool`, `must_haves_passed jsonb`; keep `sub_scores` nullable for legacy rows.
- Re-create the seeded Sahel opening's persisted ranking under the new model (or delete it and document how to re-run it).
- Add `004` to the run order in `DEVELOPER-HANDOFF.md` and anywhere else the order is listed.

---

## 7. Results display

### 7.1 Card rank strip
- A slim, **fixed-height** strip integrated into the top of the card frame (one card, not a separate box above it): **"#1 · 82 · Strong match"** + an **"About this result"** link.
- Never expands. Card heights stay uniform across the grid.

### 7.2 "Match" flip face
- Inserted as **face 2** (right after Front), only in ranked contexts (the directory in ranking mode, openings with a ranking, `/shortlists/:token`).
- Contents, top to bottom:
  - Fit score bar with its value.
  - Adjustment list, each with an outcome icon (✓ met / ◐ partial / ✗ not met / – n/a), label, and points (e.g. "+8").
  - Must-haves line: "Meets all 3 must-haves" (omit if none).
  - Equation line: **"Fit 72 + 10 = 82"** (note the cap if it applied).
- Must fit the face without scrolling at desktop and 375px. If there are more than 6 adjustments, show the 6 largest by |points| and "+N more" → opens the modal.

### 7.3 "About this result" modal
- Header: name, rank, score, band.
- **Score build-up table:** Fit row, one row per adjustment (outcome, detail, points), cap row if applied, total.
- Must-haves passed (✓ list).
- Narrative (~100 words, labeled placeholder).
- Collapsible **"How scoring works"**: Fit is the engine's judgment of fit to the JD; preferences add up to +20; must-haves exclude before scoring; tie-break rule; Premium does not affect rank; placeholder notice.
- Mobile: full-screen sheet.

### 7.4 Results header banner
Keep the current banner: "Ranked N candidates against your JD · placeholder scorer" · **Save ranking to opening…** · **Clear**. Add:
- "N excluded by must-haves".
- An **Edit requirements** button that reopens the panel.
- When linked to an opening: "Ranking for: <opening name>", and hide Save (the run saves automatically).

**Clear** behaves as described in §2.2.

---

## 8. Ranking mode layout (directory)

**Desktop**
- **Ranking panel** (~420px, left of the grid, sticky, scrolls independently): JD textarea / collapsed preview → pool chips → requirements grid → live count → **Run ranking** pinned to the panel's bottom. A close button collapses it; the banner's **Edit requirements** reopens it.
- **Panel open:** the card grid drops to 2 columns. The filter bar stays visible above the grid (it is the must-have view of the same state).
- **Panel closed:** normal 3-column grid, in rank order.
- The panel sits inside the page max-width already in place.

**Mobile**
- The panel is a full-screen sheet with stepped sections (JD → requirements → Run). Run closes the sheet and shows ranked cards in one column.
- A sticky **Edit requirements** button shows while ranked.
- The filter-bar modals (including Availability) keep working and stay in sync with the sheet.

---

## 9. Docs to update on this branch
- Add a note at the top of PRD §7.7: *"Superseded by `docs/MavenScout-match-rework.md`."* Don't rewrite §7.7 itself.
- Update the Loop8 section of `DEVELOPER-HANDOFF.md` to point at §4 and §6 of this spec as the new contract.
- PRD §6 (Information Architecture): note that `/match` now redirects into directory ranking mode.

---

## 10. Acceptance criteria

- [ ] Directory "Rank by Job Description" opens the ranking panel beside the grid; active filters already appear as Must-have rows tagged "from filters"; the search term shows as a pool chip.
- [ ] Filter bar and must-have rows are one state: changing either updates the other; lowering a row below Must-have removes it from the filter bar; grid-only must-haves (Org History) show as a filter-bar chip.
- [ ] After a run: tightening a must-have hides failing candidates instantly with no re-run; loosening one offers to score only the newly eligible candidates; changing a preference or the JD shows a Re-run prompt.
- [ ] Ranking mode is held in the URL; reload and back restore the ranked view; Clear exits ranking mode and keeps active filters.
- [ ] While ranked: Premium-first float suspended; sort dropdown locked to "Ranked by match"; the grid drops to 2 columns with the panel open and returns to 3 when closed.
- [ ] `/match` redirects to `/?rank=1`.
- [ ] JD textarea enforces 200–15,000 characters with a live counter.
- [ ] "Read job description" fills expertise/skill/location/language rows (tagged "from JD"); extraction never sets Must-have; Org History's level stays No preference even when the org name is filled.
- [ ] Org History supports Currently at / Ever at / Ever at or peer, with an editable peer list, and allows Must-have.
- [ ] Expertise and skill rows allow Must-have with the inline warning; max 10 combined.
- [ ] Live must-have count updates as rows change; Run is disabled at 0.
- [ ] Candidates failing any must-have are excluded before scoring; the banner shows how many were excluded.
- [ ] Total = Fit + adjustments, positive adjustments capped at +20, clamped 0–100; all constants live in `config.ts`.
- [ ] Bands display per thresholds; ties break by Fit, then availability freshness, then id; Premium does not affect ranked order.
- [ ] Each ranked card has a fixed-height rank strip, a "Match" face 2 with the equation line, and an "About this result" modal with the full build-up table; card heights stay uniform.
- [ ] Narrative references actual numbers and never contradicts them.
- [ ] Ranking inside an opening persists (JD, extraction, requirements, results) and reloads; ad-hoc ranking remains transient unless saved.
- [ ] `004_match_rework.sql` runs cleanly on the existing database; the seeded Sahel ranking works under the new model.
- [ ] Placeholder extraction and scoring are clearly labeled in code and UI.
- [ ] Every new surface works at 375px: ranking sheet, grid level controls, live count, Run, match face, modal (as full-screen sheet), and filter-bar ↔ sheet sync.
