# MavenScout — Profiles, Verification & Membership Spec

**Status:** Decided product model, October 22, 2026. Build spec for the next branches. **Supersedes PRD §7.3 (onboarding), §7.5 (Video Q&As), §7.6 (Audio Testimonials), §7.8 (tiers), §7.14 (taxonomy selection), §7.19 (firm vs individual) and §7.20 (verification)** wherever they conflict, plus the matching rows of the PRD Decisions table. The ranking model stays as in `docs/MavenScout-match-rework.md`, with the changes in §11 below.
**Owner:** Benji

---

## 0. Summary

- **Hiring managers are free.** Consultants pay to be listed. Two membership levels: **Member** and **Featured Member**.
- **Everyone listed is verified:** identity, most recent employer, most recent degree, every certification. There is no "Verified" badge, because everyone has it.
- **Audio testimonials:** required for Featured Members, optional for Members (amended October 23, 2026; config `TESTIMONIAL_REQUIRED`). Every Featured Member, and many Members, has at least one from a referee whose identity is confirmed through their institutional email. Testimonials are MavenScout's strongest trust signal on top of verification, and the referee flow doubles as the main way hiring managers discover the site. "Has audio testimonial" is a filter, and in ranking a priority at any strength (Nice to have / Important / Must have; match rework §3).
- **Individuals only.** Firm listings are hidden behind a setting; firms take part as hiring organizations.
- **Reputation is left to hiring managers** (their own interviews and reference checks). MavenScout verifies claims; it does not judge quality.
- **Featured Member** buys richer content and browse placement, never ranking position.

---

## 1. Who can be listed

- **Individual experts only.** Anyone listed must hold a degree; there are no exceptions in v1.
- **Firms: hidden, not deleted.** Add a setting `FIRMS_ENABLED = false` (app config, not per-profile). When false:
  - firm profiles are excluded from the directory, search, ranking and sitemaps;
  - the Type filter, the Type requirement row and firm-only UI (years in business, firm onboarding path) are hidden;
  - firm code, schema columns and data stay in place so firm listings can return later.
- **Firms of any size can sign up as hiring organizations** (§9).

---

## 2. Membership levels

### 2.1 Same for everyone

- Paid membership (prices and trials are commercial settings, §12).
- Full verification (§3).
- Audio testimonials attached to employer entries (§4): optional for Members, at least 1 required for Featured Members (§2.2).
- Expertise: 3 Core / 5 Strong / up to 10 Working knowledge, from one list (§6).
- Identical flip-card faces: front, expertise, 3 portfolio faces, plus the Match face when ranked.
- Ranking is merit-only; membership level never affects rank.
- A small "Listed on MavenScout" footer on every public personal site, including custom domains.

### 2.2 Differences

| | Member | Featured Member |
|---|---|---|
| Price | Base membership fee | Higher fee |
| Portfolio items | Exactly 3 | 3 to 10 |
| Audio testimonials | Optional: up to 1, on an employer entry | Required: at least 1 on an employer entry. One per entry, on any employer entry or portfolio item |
| Video Q&As | None | All 5 standard questions, required |
| Video Q&A tab on profile | No | Yes |
| Social/account links | 2 | 5 |
| Custom domain for personal site | No | Yes |
| Placement while browsing (no ranking active) | Normal | Shown first |
| Card treatment | Standard | "Featured" badge + gold border |
| Effect on AI ranking | None | None |
| Activation | Listed once verified | Needs a published employer testimonial to be listed (or, for a listed Member, to switch to Featured); lists as a Member until all 5 videos are in, then Featured status (and the higher fee) start |

- Rename throughout the UI: "Standard" → **Member**, "Premium" → **Featured Member**. Internal field names (`is_premium`) may stay.
- **Removed:** the general "Tell us about yourself" intro video (all tiers), the Video Intro flip-card face, the separate Audio Testimonials tab, the "Verified" badge, the "Verified only" filter, and the Premium evidence-upload application.
- **Browse placement:** Featured Members appear first in the default (unranked) directory view. Shuffle within each group so the same Featured profiles don't always lead.
- **Directory filter added:** "Has video Q&As" (effectively Featured Members). It works as a filter / Required row only, never as a Nice to have or Important preference, so payment never adds points to a score.

---

## 3. Verification (everyone)

### 3.1 What is checked

| Item | Rule | How | Label shown |
|---|---|---|---|
| Name + photo | Required | ID + selfie check through a provider (e.g. Stripe Identity or Persona). MavenScout stores only the result, never the ID document. Profile photo must match | Confirmed |
| Most recent employer | Required (current or previous). Self-employed → most recent client or contracting organization | Referee with a matching institutional email (§4.6); or an employment letter/contract; or a public document naming them | Confirmed, or Document reviewed |
| Most recent degree | Required; no degree = no listing | Degree-verification service where one exists; otherwise certificate upload checked for format, dates and consistency | Confirmed, or Document reviewed |
| Certifications | **Every** certification listed | Public registry where one exists (e.g. PMI, CFA, PRINCE2 register); otherwise certificate upload. Unverifiable certifications can't be listed | Confirmed, or Document reviewed |
| Bio | Not verified as a whole | AI flags specific claims that contradict verified items or look implausible; admin can ask for edits | — |
| Everything else | Self-reported | — | Unmarked |

- **Label meanings:** *Confirmed* = checked with an independent source. *Document reviewed* = evidence examined and found genuine-looking, not confirmed with the source. Unmarked = self-reported. A one-line legend explains this on profiles.
- **Process:** an AI agent does the first pass (searches public records, checks registries, reads documents, flags inconsistencies) and writes a short report; a human admin decides. The AI never rejects anyone on its own, and a thin web footprint is not a red flag.
- **Editing a checked item removes its mark** until it is re-checked.
- **Documents are deleted after review.** Keep only the audit record: what was checked, how, by whom, when.
- **Not in v1:** reputation screening. MavenScout does not judge whether someone is a good worker.

### 3.2 What managers are told

One clear statement in the directory header, the About page and the manager sign-up: *"Every expert on MavenScout has had their identity, most recent employer, most recent degree and certifications checked. Every Featured Member, and many Members, also has an audio testimonial on record from someone they worked with."* (While testimonials were required for everyone it ended "…and has been vouched for on record by someone they worked with"; the wording follows `TESTIMONIAL_REQUIRED`, in `src/lib/testimonials/copy.ts`.) Plus a short "What verification means" explainer covering the labels and the fact that consultants choose their referees.

### 3.3 Build scope

The ID/selfie provider and the AI review are **placeholders in this build** (clearly labelled, like the matching engine). Build the admin review queue, the per-item labels, the evidence upload UI (storage stays stubbed per the existing security flag), the delete-after-review behaviour, and label removal on edit. The real provider integration belongs to the developer hardening pass.

---

## 4. Audio testimonials

### 4.1 Rules

- **Featured Members need at least 1** to be listed, attached to an **employer entry** (current or previous employer), never only to a portfolio item. The requirement follows the level chosen, so a Featured Member still recording Video Q&As already needs it, and a listed Member publishes one before switching to Featured.
- **Members:** optional, at most 1, on an employer entry. A Member is listed without one and can remove theirs freely. After one exists, "Add audio testimonial" on other entries shows an upgrade prompt ("Add more testimonials as a Featured Member").
- **Featured Members:** one per entry, on any employer entry or portfolio item.
- **Audio required.** No written-reference exception in v1.
- **Referee:** someone who supervised or contracted the consultant. Ideally within the last 5 years (guidance, not a hard rule).
- **Transcripts are never used in ranking.**

### 4.2 The request (consultant side)

1. On an employer entry, the consultant clicks **Request audio testimonial** and fills in a short form:
   - referee name, current job title and current organization;
   - referee's **institutional email**;
   - relationship (supervisor or client), the period they worked together, and what on (pre-fills the referee's page).
2. **Pre-check** before a link is generated: an automated check (AI + public records: organizational bio, LinkedIn, publications) that this person exists and the details are plausible. Failures go to admin review.
3. MavenScout generates the link. **The consultant sends it personally** (WhatsApp, email, however they like), so it isn't an unexpected email from an unknown sender. Provide a suggested message.
4. The consultant sees status: link created, opened, recorded, published.

### 4.3 The referee page

1. Opens on a phone without an account. Shows: who asked, the pre-filled details, one line on what MavenScout is, and the privacy promises (§4.7).
2. **"Confirm it's me":** a 6-digit code is sent to the institutional email the consultant entered; the referee types it in. Code is single-use, valid ~10 minutes, limited attempts.
3. **Review the details:** the referee edits anything inaccurate and accepts. Accepting is their attestation.
4. **Record:** in-browser recording (P0 now) or upload a voice memo. 2-minute cap. Preview and unlimited retakes. Guidance: three prompts, "notes are fine, in your own words", "please don't share confidential information":
   1. How did you work with [name], and in what role?
   2. What did they deliver, and what difference did it make?
   3. Would you work with them again, and on what kind of assignment?
5. **Submit** (with a consent tick). Audio is saved immediately.
6. **Transcript** appears within seconds. "Looks good" or edit inline (names, acronyms). Optional: if they leave, it publishes as auto-generated. Submission never waits on the transcript.
7. **Thank-you screen:** one-click hiring-manager account (pre-filled; their institutional email is already confirmed) and an opt-in tick box for updates. Without the tick, their email is used only for this testimonial.
8. The page locks after submission.

### 4.4 After submission

- The consultant is notified, listens, and publishes. The required testimonial must be published for the profile to go live.
- **Notice to the referee after publication:** "You recorded a testimonial for [name], now live on MavenScout. If this wasn't you, report it here." Includes a withdraw link.
- **Display:** inline on the employer entry (or portfolio item). Listening requires a free hiring-manager account. Shows the referee's name, current title and organization, relationship, recording date, confirmation line, and transcript. The profile Overview shows a one-line summary (e.g. "3 testimonials from UNICEF, World Bank, IRC").
- **Confirmation line examples:**
  - Domain matches the employer entry: *"Dr. Amina Bello, Lead Economist, World Bank (confirmed via worldbank.org email). Supervised [name], 2021–2023."* → this also confirms the employer.
  - Domain differs: *"Dr. Amina Bello, now Lead Economist, AfDB (confirmed via afdb.org email). Supervised [name] at the World Bank, 2014–2016 (details confirmed by referee)."*

### 4.5 Removing, replacing, withdrawing

- **The required testimonial can only be replaced,** never just removed: the new one must be live before the old one comes down. Only Featured Members have a required one (a Featured Member's only published employer testimonial).
- **Members' testimonials and Featured Members' extra testimonials can be removed freely.**
- **No notification to the referee on removal.** Removal deletes the recording (keep only the audit record).
- **Referee withdrawal:** possible at any time via their link. The consultant is notified; if it was the required testimonial (Featured Members), they get a grace period (e.g. 30 days) to replace it before the profile is unlisted. A Member's withdrawn testimonial just comes off the profile.

### 4.6 Integrity rules

1. **Institutional email only** for referees in v1: the domain must be on the canonical organizations list (§8). "Sign in with LinkedIn" is a possible later fallback if the pilot shows too many referees lack one.
2. **Excluded domains:** any domain the consultant **controls** (their personal website domain, their own company's domain). Colleagues at a shared employer are fine. Small or newly added organizations go to admin review.
3. **Name matches address** (e.g. `a.bello@` for Amina Bello); mismatches go to admin review.
4. **Generic mailboxes blocked:** `info@`, `projects@`, `admin@`, etc.
5. **The consultant's own email is rejected.**
6. **Volume flag:** a referee with more than a handful of testimonials in a year is flagged for review.
7. **Audit trail** per testimonial: code-confirmation time, email, device/network fingerprint, edits to details or transcript.
8. **Zero-tolerance policy,** stated in the membership terms: faked or impersonated testimonials mean permanent removal without refund.
9. **Email authentication** (SPF, DKIM, DMARC) on MavenScout's sending domain, so codes and notices are delivered.

Accepted residual risk: collusion by a real referee. Their verified identity is on record, which is the deterrent.

### 4.7 Privacy promises (shown to referees before recording)

- Only verified hiring managers at recognised organizations can listen; never public, never sold, never used to train AI.
- Streaming only, no download. Listens are logged; recordings carry an inaudible watermark (proposed, see §12).
- Delete or withdraw at any time with one click.
- Recordings are deleted when the consultant leaves MavenScout.

---

## 5. Video Q&As (Featured Members only)

- **All 5 standard questions required** for Featured status. The existing admin-managed question list stays:
  1. A project you're most proud of: your role, and what changed because of it.
  2. Delivering in an unfamiliar country or institutional context.
  3. Communicating difficult findings or setbacks to a client or funder.
  4. Working across cultures, languages, or with local partners.
  5. A methodology you specialise in, and when it's not the right tool.
- 2-minute cap each; in-browser recording or upload.
- **All require a free hiring-manager account to watch.** None are public, and none appear on the personal site.
- Optional transcript for accessibility; **never used in ranking.**
- **Members have no videos.** The intro video is removed for everyone.

---

## 6. Expertise (one list, three tiers)

- **One unified list** of roughly 130–150 distinct items replaces the separate Domain Expertise and Technical Skills taxonomies. Test for overlap: two experts doing the same work should pick the same item.
- **Items only; no tagging of category headers.**
- **Each item has two attributes:**
  - a **browsing group** (e.g. Health & nutrition, Education, Governance, Evaluation & research), shown only as subheadings in the pickers, which have a search box;
  - a hidden **kind**: Sector, Cross-cutting theme, or Method & skill. The kind is used only for the matching rule below; managers never pick it.
- **Tiers (counts are settings, not hard-coded):**
  - **Core expertise:** exactly 3
  - **Strong:** exactly 5
  - **Working knowledge:** 0 to 10
- **Display:** Core as prominent chips and Strong as smaller chips on the flip card; Working knowledge on the full profile only.
- **Filters and Required rows** match Core and Strong only by default. Option: a toggle to include Working knowledge.
- **Multiple Required rows:** OR within a kind, AND across kinds (e.g. Nutrition AND M&E; two sectors = either one). Browsing groups play no part in matching.
- **Preference credit in ranking:** Core ×1.0, Strong ×0.75, Working knowledge ×0.4 (in `config.ts`). An untagged mention of the item in the profile's text earns ×0.4; a row takes the better of its tag credit and its text credit, so a mention never outscores a tag.
- **Migration:** primary → Core, secondary → Strong; category-level tags replaced with specific items.
- The request-a-new-item flow stays.

---

## 7. Profile fields, minimums and maximums

### 7.1 Profile

| Item | Minimum | Maximum |
|---|---|---|
| Bio | 300 characters | 1,500 characters |
| Work history | 1 (most recent, verified) | 10 |
| Education | 1 degree (most recent, verified) | 5 |
| Certifications | 0 | 10, all verified |
| Languages | 1 | 10 |
| Expertise | 3 Core + 5 Strong | + up to 10 Working knowledge |
| Portfolio items | 3 | 3 (Member) / 10 (Featured) |
| Audio testimonials | 0 (Member) / 1 on an employer entry (Featured) | 1 (Member) / one per entry (Featured) |
| Video Q&As | 0 (Member) / 5 (Featured) | 0 / 5 |
| Location, availability | Required | — |

### 7.2 Portfolio item fields

| Field | Rule |
|---|---|
| Title | Required |
| Dates | Start year + end year, or "Ongoing" (years only) |
| Role | Required, free text |
| Organization/client | Required; picked from the canonical organizations list where possible (logo, Sector Experience) |
| Description | Required; max ~1,000 characters |
| Results | Optional; max ~500 characters |
| Images | Up to 3 uploads with optional captions; the first is the cover |
| Web links | Up to 3, each labelled |
| Video link | Up to 1, YouTube or Vimeo (all members) |
| Audio testimonial | Featured only; max 1 per item |

- Schema changes: merge `cover_image` + `images` into one list (first = cover); portfolio video becomes a link field, replacing portfolio-attached video uploads.
- No funder, countries or expertise tags on portfolio items in v1.

---

## 8. Canonical organizations list

One table used everywhere an organization appears:
- **Fields:** name, aliases (e.g. "WB", "IBRD"), web domains, logo (stored in Supabase Storage), type (multilateral, bilateral donor, UN agency, NGO, government, private firm, academic, foundation).
- **Seeded** with ~150–200 organizations covering most of international development; admins add more.
- **Used for:** employer and client pickers (autocomplete), logos and Sector Experience, referee institutional-email checks (§4.6), hiring-manager sign-up (§9), and Org History matching in ranking.
- Organizations not on the list keep free text with a clean monogram fallback.

---

## 9. Hiring-manager accounts

- **Free.** Browsing and filtering stay open without an account; saving, ranking, watching videos and listening to testimonials require one.
- **Sign-up requires an institutional email** whose domain is on the canonical organizations list (any organization type, including firms).
- **Exception request:** for legitimate hirers without one (e.g. small NGOs or ministries using Gmail). Admin-approved, with a fast turnaround target.
- **Referees** get a one-click, pre-filled account after recording (§4.3).

---

## 10. Onboarding sequence (consultant)

Create account → build profile (bio, work history, education, certifications, expertise tiers, portfolio, availability, location, languages) → choose Member or Featured Member → pay → verification (§3) → request testimonial (§4; optional for Members) → listed when verification passes and, for Featured Members, the required testimonial is published. Featured Members record 5 videos; Featured status activates when all are in.

A progress checklist shows what's done and what's waiting (e.g. "Testimonial: waiting for Dr. Bello").

---

## 11. Changes to ranking and the Loop8 contract

- **Fit inputs:** bio, portfolio items, work history, education, certifications and expertise tags. **Not** video or audio transcripts.
- **Fit is capability only:** Fit judges capability for the work only. It must not score the practical conditions handled by priorities: location, language proficiency, availability, career level, work arrangement and organizational history (employer names never score in Fit). When a JD states them, extraction routes them to priorities (pre-filled at Nice to have, never Must have). Exception: a language or place that is itself the expertise (e.g. translation, deep country knowledge) counts as substance. Fit may value experience working in a region, but not where the candidate is based.
- **Relevance, not volume:** Fit judges each candidate's most relevant evidence (e.g. their most relevant portfolio items) the same way for everyone, so more items help only by offering more chances of a close fit. Baseline test to add: the same profile with 3 vs 10 items (7 off-topic) must not rank higher.
- **Expertise:** one list with tiers replaces primary/secondary; Required rows match Core + Strong; preference credits per §6.
- **Firms hidden:** Type filter and Type requirement row hidden while `FIRMS_ENABLED = false`; Career Level no longer needs the firm exemption in practice.
- **"Has video Q&As"** is a filter ("Featured only" in the filter bar), and in ranking a priority at any strength (Nice to have / Important / Must have; match rework §3).
- Membership level never affects rank (unchanged).

---

## 12. Open decisions

1. **Exclusivity:** hard cap (~2,000), founding cohort, or per sector; waitlist; what happens when a slot frees.
2. **Payment timing and refunds** for applicants who fail verification or never get a testimonial; deadline for completing the testimonial (e.g. 60 days).
3. **Prices,** trial offers, annual vs monthly.
4. **Testimonial pilot (before scaling):** 15–20 consultants obtain a testimonial through the flow. Measure completion rate and time, referee hesitation (including voice/deepfake concerns), email delivery, and referee interest in a manager account. Also ask 8–10 managers how much testimonials change who they call.
5. **Transcript-only option** for referees uneasy about publishing their voice (record, publish transcript, delete audio), and audio watermarking: proposed, not yet decided.
6. **Re-verification cadence** (e.g. every 2 years) and testimonial refresh (e.g. after 5 years).
7. **"Contracts as" field:** under the World Bank's 2027 move from STCs to independent contractors, each expert may need to show the company they contract through.
8. **World Bank IC selection process:** confirm how ICs will be selected and documented, so MavenScout is positioned as discovery feeding that process.

---

## 13. Build order

Everything below is built **before** the handoff to Loop8, so their engine is built against the final data model. The handoff point is tagged `loop8-handoff`.

**Deferred until after Loop8:** structured locations (country + city via Mapbox, UN M49 sub-regions) and the map view. Location stays the existing free-text field until then.

1. **Data foundations:** canonical organizations table (§8); canonical language list with Fluent/Working proficiency; unified expertise list with tiers (§6), plus the ranking changes that depend on it (§11: filters, requirement rows, extraction, preference credits, Fit inputs without transcripts, baseline update).
2. **Profiles and membership:** firms hidden (§1), Member/Featured Member (§2), new editor and minimums (§7), portfolio fields, video Q&As for Featured only (§5), removals listed in §2.2.
3. **Testimonial flow** (§4), including in-browser recording, the code check (email delivery mocked in development: code shown on screen), instant transcript, removal/withdrawal.
4. **Hiring-manager accounts** with institutional-email gating (§9), and the **verification** admin queue, labels, AI-review and ID-provider placeholders (§3).
5. **Re-seed demo data** once, at the end: individuals only, testimonials on employer entries, organizations linked, gender-matched photos, tags in the new tier model. Re-run `npm run baseline` and update `expectations.json`.
6. **Handoff to Loop8:** tag `loop8-handoff`; update the Loop8 section of `DEVELOPER-HANDOFF.md`.
