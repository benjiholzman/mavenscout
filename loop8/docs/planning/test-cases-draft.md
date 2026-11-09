# Draft: harder ranking test cases

| | |
|---|---|
| Status | Draft for team review |
| Phase | P1 |
| Task | Harder ranking test cases |
| Owner | Loop8 engineering |
| Date | 2026-11-04 |
| Sources | Ranking brief, `docs/expertise-list-draft.md`, `scripts/ranking-baseline.ts` |

**Status: draft for team review.** Nothing here has been added to the seed data or
`docs/samples/expectations.json` yet.

## Why

The brief: the placeholder scores 14/14 because the synthetic profiles and the five ToRs were written
together, in the same vocabulary. Real consultants describe their work in their own words. These
cases describe relevant work **without** the item names or their aliases, so keyword matching misses
them and a real engine has something to beat.

## Rules for writing them

1. Avoid every name **and alias** of the target items in `docs/expertise-list-draft.md`. Some of the
   brief's own examples are aliases already: "household surveys" (Survey Design) and
   "cash transfers" (Social Protection). Exact aliases would let the placeholder pass.
2. Do not tag the target items. Tag only unrelated items, so tag coverage cannot carry the profile.
3. Mark each profile `is_demo`, fictional people only (brief).
4. Add profiles in `scripts/demo-seed/profiles/*.mjs` and rebuild with `npm run demo:build`. Never
   edit the generated SQL (customer `CLAUDE.md`).
5. Each new case should **fail on the placeholder** when first added. A case the placeholder already
   passes does not test the engine.

## Proposed cases

| # | ToR | Check type | Expect | Profile in one line | Words to avoid |
|---|---|---|---|---|---|
| 1 | tor-01 (nutrition endline) | `vocabulary_mismatch` | top10 | Led four rounds of a longitudinal household panel measuring child height and weight for a maternal health programme; trained enumerators and ran the anthropometric quality checks | nutrition, survey design, household surveys, fieldwork, sampling, impact evaluation |
| 2 | tor-01 | `vocabulary_mismatch` | top10 | Designed the eligibility scoring and targeting for a government's poverty-targeted transfer scheme, then evaluated its effect on child growth with a comparison group | social protection, safety nets, cash transfers, impact evaluation, RCT, quasi-experimental |
| 3 | tor-03 (refugee livelihoods) | `vocabulary_mismatch` | top10 | Ran a coaching and productive-asset programme for families who fled the conflict, now settled in host towns; studied which home businesses lasted | refugees, livelihoods, graduation approach, forced displacement, IDPs |
| 4 | tor-05 (e-procurement) | `vocabulary_mismatch` | top10 | Moved a ministry's tendering online: bidder registration, electronic bid opening, publishing contract awards; a case study that never names the sector | procurement, e-procurement, e-government, GovTech, digital public services |
| 5 | tor-01 | `decoy` (keyword stuffing) | not_top10 | Early-career profile whose bio lists "nutrition, impact evaluation, survey design, statistical analysis" as interests, with no work that shows them | (uses the words on purpose) |
| 6 | any ToR | `volume_variant` (new) | variant not above original | Same profile scored twice: 3 on-topic portfolio items, then those 3 plus 7 off-topic ones. The 10-item version must not rank higher (brief, "Relevance, not volume") | n/a |
| 7 | new short ToR | extraction check (new) | location not suggested | "The programme covers Nigeria; the consultant may be home-based" must not suggest Nigeria as a location | n/a |

Cases 1 to 5 run with the existing harness: `top10` and `not_top10` expectations work for any check
type, and a `decoy` type is already treated as a negative case (`scripts/ranking-baseline.ts`).

Cases 6 and 7 need harness changes:

1. **Case 6:** a new in-memory variant in `scripts/ranking-baseline.ts`, like the existing
   `tier_order` variant, that adds seven off-topic portfolio items to one profile and compares ranks.
   It cannot be a seed profile, since a duplicate person would distort every other ranking.
2. **Case 7:** a way to state locations that must **not** be extracted (for example
   `expected_not_extracted` in `expectations.json`), read by the extraction recall check.

## Open points

1. Exact ToR for case 2: tor-01 (its expected extraction already includes Social Protection) or a
   new short ToR.
2. Whether the customer wants to review the new profiles before they enter the shared demo data,
   since every demo profile shows in the directory.
3. Harness changes for cases 6 and 7 touch the customer's script; agree the approach first.
