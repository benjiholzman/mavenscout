# MavenScout — Product Requirements Document

**Status:** Draft v2 — for one-shot build via Claude Code + Fable 5
**Owner:** Benjamin Holzman
**Last updated:** July 2026

---

## 1. Overview

MavenScout is a specialized hiring marketplace connecting international development organizations with experienced consultants and firms for short-term, knowledge-based work — the kind of engagement where an organization needs a specific subject-matter expert (e.g., a child mortality specialist in East Africa to author a report for a UN agency), not a generalist freelancer off a skills marketplace like Upwork or Fiverr.

The platform starts with the international development sector and is architected to expand into additional sectors (global health, climate finance, legal, etc.) as standalone curated communities over time — never one sprawling generalist marketplace.

**Core value props:**
- **Hiring managers:** free to use. Filter on must-haves, get an AI-ranked shortlist against a job description, screen candidates via pre-recorded video before ever scheduling a call, and decide as a team.
- **Consultants/firms:** pay a small monthly fee to maintain one profile that (a) lists them in a curated, pre-vetted pool searched by peer institutions, and (b) doubles as a zero-effort personal professional website, optionally reachable at their own domain.

---

## 2. Problem Statement

Hiring managers in international development need niche subject-matter expertise fast, but existing tools weren't built for that:
- Generalist marketplaces (Fiverr, Upwork) are skills-based and attract the wrong candidate pool entirely.
- Job postings drown in volume — increasingly AI-generated — making real candidates hard to find.
- Word-of-mouth hiring keeps recycling the same small contact list and misses excellent people outside a manager's existing network.
- Resumes reveal little about communication style or fit, and scheduling screening calls across time zones adds friction before a manager even knows if a candidate is worth talking to.

MavenScout replaces "post and pray" or "ask around" with a third option: a curated pool of 1,500–3,000 verified experts, each with a track record at one of the sector's most respected organizations, searchable and rankable in minutes.

---

## 3. Goals

1. Let a hiring manager go from "I need an expert" to a ranked shortlist of 2–3 credible candidates in minutes, not days.
2. Make it possible to evaluate communication style and domain fit *before* scheduling a single live call, via Video Q&As and audio references.
3. Give consultants a reason to keep their profile current: it's simultaneously their income lever (get discovered) and their professional identity (their public site).
4. Preserve curation quality as the platform scales — never let it become a generalist, unvetted marketplace.
5. Build the matching feature's scaffolding now (data model, UI, pluggable scoring interface) so the real AI ranking engine — being built separately with Loop8 as an AWS POC — can be dropped in later without a rebuild.

---

## 4. Non-Goals

Explicitly out of scope for this build:

- **Not a full ATS.** No interview scheduling/calendar booking, no multi-stage applicant pipeline tracking, no in-platform messaging inbox, no offer/contract tracking. "Contact" actions send an email introduction; nothing more. The ATS surface is deliberately bounded to a lightweight *collaboration + light outreach-tracking* layer: openings, long/short lists, attributed notes and 0–5 scores, team averages, two tag systems (list + outreach), and a single post-interview note + score per candidate (see 7.4). Everything past "the team has interviewed and can decide" — offers, contracts, onboarding — is off-platform and out of scope.
- **No native mobile app.** Responsive web only.
- **No multi-member firm/team accounts.** A firm is one profile (Individual / Small Firm / Large Firm types), not a team of individually-managed seats.
- **No content-moderation AI.** Profile and testimonial approval is manual (admin review queue) for v1.
- **No real AI matching engine.** The ranking *feature* (UI, inputs, score display) is P0; the actual scoring intelligence is a mocked/stub function behind a clean interface, since Loop8 is building the real engine separately.
- **No automatic sector expansion in v1.** The schema stays sector-agnostic where cheap to do so, but a second sector's taxonomy/UI is out of scope now.
- **No platform localization.** UI text is English-only; consultant-side data (languages spoken, bios) can be multilingual.
- **No production-grade authentication, billing, or media-capture infrastructure in this build.** A developer will implement real Supabase Auth session management, live Stripe billing, and native in-browser video/audio recording afterward. This build scaffolds all three (data model, screens, mocked/URL-based stand-ins) but should not be treated as security-hardened or deployed with real user data or payments.

---

## 5. Personas

| Persona | Description | Account required? |
|---|---|---|
| **Hiring Manager** | Works at an international development org, searching for short-term expertise (role name is `hiring_manager`; avoid the stiff phrase in user-facing copy — see 7.4) | Free account required to save candidates into openings, add notes/scores, share, and run AI matching. Browsing/searching the directory does not require login. |
| **Individual Consultant** | An independent expert building/maintaining a paid profile | Yes — paid subscription |
| **Firm** | A small or large consulting firm listed as a single profile | Yes — paid subscription |
| **Reference** | A former manager/colleague submitting an audio testimonial for a consultant | No account — submits via a shareable, unauthenticated link |
| **Admin** | Platform operator | Open route in this build (see 7.9/7.10) — real access control comes with the developer's auth pass |

---

## 6. Information Architecture

- `/` — Browse/Directory (flip-card grid, filter bar, search)
- `/about` — Explains what MavenScout is, how it works for both hiring managers and consultants/firms, and its benefits (see 7.12)
- `/profile/:handle` — Full profile detail page as seen from the MavenScout directory — includes availability; Video Q&As and Audio Testimonials tabs are login-gated (see 7.2a/7.9a)
- `/site/:handle` — The same profile rendered as a standalone personal professional website — omits availability, the Video Q&As tab, and the Audio Testimonials tab, and hides Favorite/Top Pick actions (see 7.2a). This is the URL a consultant shares externally, and the natural target once custom domain routing is built later.
- `/shortlists/:token` — Shared view of an opening (long list / short list, with each colleague's notes/scores, team averages, and AI match scores — see 7.4)
- `/openings` — Hiring manager's list of their openings + create new (see 7.4, 7.9b)
- `/openings/:id` — A single opening workspace: long/short lists, per-candidate notes/scores/tags, reviewers, post-interview capture (see 7.4)
- `/match` — Job description upload + weighting questionnaire → ranked results (operates on the hiring manager's currently filtered pool; can be launched from the directory or from within an opening)
  > **Note (match rework):** `/match` now redirects to `/?rank=1` — ranking is a mode of the directory (a drawer beside the grid, results held in the URL as `/?ranking=<id>`). See `docs/MavenScout-match-rework.md`.
- `/login`, `/signup` — Mocked-session flows for Hiring Manager vs. Consultant/Firm (see 7.9)
- `/onboarding` — Multi-step consultant/firm profile builder (also edit-profile after launch)
- `/account` — Account settings for both roles (change email/password — UI scaffold, see 7.9b)
- `/billing` — Consultant subscription: tier display, billing history, pause/cancel/resume (UI/logic scaffold, see 7.8/7.9b)
- `/testimonial/:token` — Unauthenticated reference submission page; candidate + optional portfolio item pre-loaded from the token, reference uploads/records audio (see 7.6)
- `/testimonial-info` — Public page explaining the audio-testimonial process to references (see 7.6)
- `/admin` — Approval queue, taxonomy management, subscription/tier overview (open route, see 7.9/7.10)

**Global navigation** (persistent across pages, matching the reference screenshots' pattern): logo/wordmark, Browse (`/`), About (`/about`), and a prominent **"Join MavenScout"** button that routes into the consultant/firm signup flow (`/signup`, then `/onboarding`) — the primary conversion path, styled as a clear call-to-action (matches the "Join Hub" button in the reference screenshots). When logged out, a Login link; when logged in, a **user menu in the top-right** (avatar/name → dropdown) with role-appropriate items (see 7.9b).

---

## 7. Feature Requirements

Priority key: **P0** = must ship in this build. **P1** = build if time allows, don't let it block P0s. **P2** = scaffold data model only; UI/logic comes later.

**Cross-cutting: mobile.** The app must work well on mobile, not just reflow. This is a real requirement, not a nice-to-have — hiring managers and consultants in the international development sector are frequently on phones, often on poor connections in the field. "Works on mobile" specifically means the *hard* interactions are tested at phone width: the flip cards (including in-card video), the filter/availability/JD-ranking modals, the weighting sliders, the image carousel, and the tabbed profile all need to be usable on a narrow screen — not just the directory grid collapsing to one column. Design mobile-first where it's cheap to.

**A note on how prescriptive to be with the rest of this section:** what follows is deliberately specific about *what* the product needs to do — the data model, the scaffolding boundaries (7.5, 7.6, 7.8, 7.9), the tier structure, the platform/website visibility split (7.2a) — because these are actual product decisions, not interaction choices, and guessing wrong on them produces a different product rather than a more creative one. Where a specific UI mechanic, layout, or interaction pattern is described without being tied to an acceptance criterion or an explicit reason, treat it as a default suggestion rather than a hard requirement — the standing examples already in this doc are the search bar's reveal mechanism (7.1), whether the non-video/audio profile content splits into more tabs (7.2), and the entire visual design system (`MavenScout-design.md`). If there's a genuinely better way to achieve the same underlying capability anywhere else, take it — just not by quietly reversing a scaffolding boundary, a data model decision, or anything in Section 12 (Decisions), since those exist on purpose and changing them changes this build's risk profile, not just its polish.

### 7.1 Browse & Discovery (Flip Cards, Filters, Search) — P0

- Responsive grid (1 col mobile / 2 tablet / 3 desktop) of interactive flip cards.
- Each card cycles through up to **seven views**: **Front** (photo/cover, name, headline, location, career level, work type, availability badges, **Sector Experience: 2–3 logos of the candidate's most recent organizations**, sourced from their Work History entries, most-recent-first) → **Domain Expertise** → **Technical Skills** → **Portfolio item 1** (if added) → **Portfolio item 2** (if added) → **Portfolio item 3** (if added) → **Video Intro** (if the candidate has a general intro video). Domain expertise and technical skills are split onto separate faces because each can carry up to 6 pills (see 7.14) — combined they'd overwhelm one face. On each of those two faces, **primary** items are shown first/emphasized and **secondary** items follow, visually distinguished (see 7.14), with a small **self-attested** marker on the face (see 7.14). Pagination dots reflect only the views that exist for that candidate; a persistent action bar (Favorite bookmark, Top Pick star, "View Profile") sits below the flip area and does not animate with the card.
- **The Video Intro face plays in-card**: the general intro video (public, see 7.2a) is playable directly on that face. If in-card iframe/video playback fights the Framer Motion flip animation or breaks the card's fixed dimensions, Fable may fall back to showing a thumbnail + play button on the face that opens a modal player — a broken flip card is worse than a modal. Only the general intro appears here (never the gated Premium Q&A videos).
- Firms use the same card mechanic; a "Large Firm" / "Small Firm" badge (with a defined-threshold tooltip, see 7.19) replaces career level, and "X years in business" replaces the career-level line.
- Verified profiles (see 7.20) show a **Verified badge** on the card front (distinct from the Premium "Featured" gold treatment, though they co-occur). If a consultant has a video response or audio testimonial, show a small indicator icon on the front face so hiring managers know richer material is available before flipping/clicking through.
- **Filter bar:** Type (Individual / Small Firm / Large Firm), Skills, Domain Expertise, Career Level, Work Arrangement, Location. Career Level is individual-only — it disables/greys out when the Type filter is set to firms only (see 7.19). Location and Language filters populate their options dynamically from what's actually in the data (see Section 8), not a fixed list.
- **Search — two modes:** a toggle (radio buttons or similar) lets the hiring manager switch between **Names only** (matches name/headline) and **Full profiles** (also matches headline, detailed_bio, skills, expertise, and portfolio item text). Whether the search input is always visible or reveals on clicking a "Search" button is left to Fable's layout judgment — either works; the mode toggle is the actual requirement.
- **Rank by Job Description:** a clearly separate, prominent action (not folded into the filter bar itself) that opens a modal containing the job description input and weighting questionnaire described in 7.7. It operates on whatever the filter bar + search have currently narrowed the pool down to.
- **Availability filter:** a dedicated **"Availability" button that opens a small modal** rather than inline dropdowns — availability is a compound query (engagement type + timing) that doesn't fit a single dropdown cleanly (see 7.16). The button shows a summary of the active filter (e.g., "Full-time from June") so it isn't hidden. Inside: pick engagement type (part-time / full-time / either) and a start window (month picker or month range).
- "Clear All" appears only when filters are active. Results count sits above the grid.
- **"Verified only" toggle:** a standalone toggle near the filter bar (not in the Type dropdown) that filters to verified profiles only (see 7.20). Off by default. Labeled "Verified," not "Premium," since managers filter on quality, not subscription.
- **Sort — default and options.** Premium profiles always float to the top regardless of sort (a paid benefit, see 7.8); the sort applies within each tier. The **default sort on first load is a randomized order with a per-session seed** — stable while the visitor filters and paginates within a visit, but reshuffled on their next visit. Rationale: for a curated pool, this distributes exposure fairly across candidates over time (nobody is permanently buried the way strict alphabetical or "newest" would bury late-alphabet or early-joining profiles), while a stable per-session seed avoids the disorientation of re-randomizing mid-browse. A **Sort dropdown** lets the visitor override with: Newly Added, Location (A–Z), Career Level, and — after an AI ranking has been run — Best Match (by match score). (This default is a recommendation; a simpler "Newly Added" default is a reasonable alternative if preferred.)
- Premium profiles get a gold border, "Featured" ribbon, and sort first regardless of other sort order (see 7.8).

**Acceptance criteria:**
- [ ] Filters combine with AND logic across categories, OR logic within a multi-select category.
- [ ] Selecting a parent taxonomy category (e.g., "Climate & Environment") matches any profile tagged with any of its child items.
- [ ] Filtering by "Available within 3 months" returns consultants already available now as well as those becoming available within the window.
- [ ] Card flip state resets when filters change (no stale flipped cards in a new result set).
- [ ] Switching search mode (Names only ↔ Full profiles) re-runs the current query term against the new field set without requiring the user to retype it.

### 7.2 Profile Detail Page / Personal Website — P0

- Hero: cover image, photo, name, headline, location, career level for individuals (bracket + year range) or "X years in business" for firms (see 7.19), languages.
- Action buttons: Favorite, Top Pick, Contact Me, Resume/CV download. **Contact Me** opens a modal that relays an email introduction to the candidate — the candidate's raw email address is **never displayed** anywhere (on `/profile` or `/site`); the relay form is the only contact path (no in-platform messaging thread, just the intro email). This keeps addresses unscrapeable while preserving reachability.
- **Tab structure (5 tabs):**
  1. **Overview** — professional summary (detailed_bio); Domain Expertise + Technical Skills (primary emphasized, secondary distinguished, with self-attested marker, see 7.14); Accreditations & Certifications (see 7.15); and an At-a-Glance sidebar or equivalent (availability + freshness date, work type, contracting & work eligibility [logged-in only, see 7.18], personal website, social links).
  2. **Experience** — three distinct sections: **Work History**, **Education**, and **Additional Experience** (see below).
  3. **Portfolio** — Featured Projects: portfolio items, each with project name, role, description, results, up to 3 links, a cover image, and an optional captioned image carousel; each able to embed an attached audio testimonial and, for Premium, an attached Video Q&A inline (see 7.5/7.6).
  4. **Video Q&As** (see 7.5) — required separate tab, tied to the visibility rules in 7.2a.
  5. **Audio Testimonials** (see 7.6) — required separate tab.
  Fable may refine grouping *within* reason, but the Video Q&As and Audio Testimonials tabs must stay distinct (their separation is load-bearing for 7.2a visibility), and the three history sections must be distinct from Portfolio (Portfolio = showcased deliverables; the history sections = timeline roles).

- **The three Experience-tab history sections:**
  - **Work History** — `{organization, role, start_year, end_year (blank = "Present"), logo, optional description}`, up to 10 entries. Each shows its org logo (see 7.11 — no separate "Previous Employers" grid). The card-front Sector Experience logos (7.1) come from the 2–3 most recent Work History orgs.
  - **Education** — `{institution, degree/course, start_year, end_year}`, up to 5 entries; optional institution logo.
  - **Additional Experience** — volunteer work, board/advisory roles, fellowships, affiliations: `{organization, role, start_year, end_year, optional description}`, up to 5 entries. This is *not* Portfolio (which is showcased project deliverables) — it's for timeline roles that aren't paid employment or formal degrees.
  Dates are year-level (no months). Caps are flat across both tiers — basic profile substance shouldn't be tier-gated.

- **Dropped "Response time" from At-a-Glance:** there's no reliable way to measure it without an in-platform messaging system, which is explicitly out of scope (see Non-Goals). Removed rather than shown as a fake or unmeasurable stat.
- **Public + shareable:** every profile is reachable at `mavenscout.com/profile/:handle` without login.
- **Custom domain:** deferred (see Decisions). Data model reserves a `custom_domain` field; no live DNS/domain-API integration is built now.

### 7.2a Visibility: Public Site vs. Platform, and Login-Gating — P0

Profile content renders differently across **three viewer contexts**. Two independent rules stack: a *surface* rule (public personal site vs. the MavenScout platform) and an *auth* rule (logged-in vs. not) on the platform.

| Content | `/site/:handle` (public website, any viewer) | `/profile/:handle` — not logged in | `/profile/:handle` — logged-in hiring manager |
|---|---|---|---|
| Header, bio, portfolio, experience/education, skills | Full | Full | Full |
| Contact Me / Resume | Shown | Shown | Shown |
| **General intro video** (`kind='intro'`) | **Shown** | **Shown** | Shown |
| Availability (At-a-Glance) | **Hidden** | Shown | Shown |
| Contracting & Work Eligibility (7.18) | **Hidden** | **Gated** — sign-up prompt | Shown |
| Video Q&As — 5 Premium standard-question videos | **Hidden** | **Gated** — "create a free account to watch" prompt | Shown |
| Audio Testimonials (tab + portfolio-attached) | **Hidden entirely** | **Gated** — sign-up prompt | Shown |
| Favorite / Top Pick actions | **Hidden** | **Gated** — sign-up prompt | Shown |

Two principles keep this consistent:
- **The general intro video is public** (it's the teaser). The 5 Premium standard-question videos, portfolio-attached videos, and audio testimonials are the gated/richer material.
- **Audio testimonials and the Premium Q&A videos never appear on `/site`**, wherever attached (tab *or* portfolio item) — stripped from the public render. **On the platform, they (and the save actions) require a free account.** Browsing, filtering, search, full profile text/portfolio, and the intro video are open to anyone — the teaser that drives account creation (see 7.9a). The gate is an inviting sign-up prompt, not a hard wall.

This is a fixed rule set by route + auth state, not a per-profile setting a consultant configures (granular per-item visibility is explicitly out of scope for v1 — noted as a possible future enhancement). `/site/:handle` is what a consultant puts on a resume or LinkedIn, and is the natural target for custom-domain routing once that's built later.

### 7.3 Consultant/Firm Onboarding & Profile Editor — P0

- Multi-step form: basic info → consultant type (Individual/Small/Large Firm) → bio & experience → domain expertise & technical skills (select up to 2 primary + 4 secondary each, at category or sub-item level; may request a new item; see 7.14) → accreditations & certifications (see 7.15) → availability (part-time/full-time tracks, each with optional from/until dates; see 7.16) → portfolio items (Premium: optional attached video, see 7.5) → **work history, education, and additional experience entries (work-history orgs support logo lookup, see 7.11)** → Video Q&As (general intro for all tiers; Premium: up to 5 standard-question videos — each upload-or-URL, 2-min cap, optional transcript, see 7.5) → audio testimonials — both request-a-reference (generates tokenised link + email template, optional portfolio-item attachment) and direct upload of an audio file the candidate already has (see 7.6) → personal website + social links (see 7.13) → tier selection — choosing Premium opens the **application** with 1–3 evidence uploads + explanations for verification (see 7.20) → submit for admin review.
- New profiles enter a **pending** state and are not publicly listed until an admin approves them.
- Consultants can edit their profile at any time after approval; edits auto-publish for v1 (admin can still audit).

### 7.4 Openings, Shortlisting, Notes & Team Collaboration — P0

This is the hiring manager's workspace. It replaces the earlier "two global lists" model with **openings** as the central organizing object, while preserving a lightweight quick-save path so the simple case stays simple.

**Terminology note:** "hiring manager account" is the internal role name; user-facing copy should avoid the stiff phrase — prefer something like signing up as an *organization* or *to hire*. (Role stays `hiring_manager` in the data model.)

**Openings (lists):**
- A hiring manager can create named **openings** — each represents a role they're filling, with a custom name, optional description, and optional deadline date. (Model mirrors Kayak "trips" / Airbnb "wishlists": a candidate is saved *into* an opening.)
- An always-present default opening (e.g., "Saved" / "Unsorted") acts as the lightweight quick-save: one tap from a card saves a candidate without forcing them to name an opening first. Named openings are created when a manager wants structure.
- **Two tiers within each opening:** a broader **long list** and a narrower **short list** (these are what "Favorites" and "Top Picks" become — per-opening, not global). Adding a candidate to the short list automatically includes them in the long list; removing from the long list removes from the short list.
- A "clear" affordance (e.g., clear an opening, or clear the default quick-save) keeps the simple fill-then-reset workflow available.

**Per-candidate notes & scores (within an opening):**
- On any candidate in an opening, a hiring manager can add a freeform **note** and a **score out of 5**.
- The 5-point score can be used to rank candidates within the opening.
- Notes and scores are attributed to their author (see collaboration below).

**Two independent tag systems (per candidate, within an opening):**
These are separate axes and never interfere — a candidate can carry one from each at once (e.g., Favorite + Interview scheduled, or Top Pick + Contacted):
- **List tags** — which shortlist tier they're on: **Favorite** (long list) and **Top Pick** (short list). Top Pick implies Favorite (the long/short-list rule above).
- **Outreach tags** — where they are in the manager's outreach process: **Contacted** → **Interview scheduled** → **Interview completed**. That's the full set (this workflow is inverted from a normal ATS — the manager reaches out to candidates, who don't apply to a posting — so the vocabulary tracks the manager's outreach, not an application state). No further pipeline stages.

**Post-interview capture (bounded — see Non-Goals):**
- After an interview, a hiring manager can add a **post-interview note** and a **post-interview score/ranking (0–5)** per candidate, distinct from the pre-outreach score above.
- This is the deliberate limit of MavenScout's ATS surface: status tags + a post-interview note + a post-interview score, and nothing further (no offer tracking, no pipeline automation). The workflow still ends at "the team has interviewed and can decide" — decisions and contracting happen off-platform.

**Sharing & team collaboration (view vs. participate):**
The key distinction is between *viewing* an opening and *participating* in its evaluation — they have different access rules, because unknown actors adding notes/scores would pollute the team's evaluation data:
- **View (read-only):** link-based and frictionless. Anyone with the share link (`/shortlists/:token` → opening-share token) sees the opening — candidates, AI match scores, and existing notes/rankings — with no account required. An **"email this list"** convenience action pre-fills an email containing the link.
- **Participate (add own notes/scores, which feed team averages):** requires being (a) logged into an account and (b) explicitly granted **reviewer** access by the opening owner, via a picker where the owner adds specific people. Open the link logged into a non-granted account and the input controls are disabled — you can view, not contribute.
- Colleagues granted reviewer access add **their own notes and 5-point scores** per candidate; everyone sees all contributors' entries, each **attributed**, plus a **team average score** and resulting **team ranking**.
- The AI match score and its component breakdown (see 7.7) remain visible throughout, alongside the human scores — the two are complementary, never merged.

> **Auth reality for this build:** the *participate* side genuinely depends on real accounts + permission enforcement, which are mocked here (see 7.9). Build the full model — reviewer grants, disabled controls for non-reviewers, attributed notes/scores, team averages — demonstrated with the mocked session and seeded example reviewers. Real per-user identity and the actual permission gate land with the developer's auth pass; the data model carries reviewer grants now so nothing reshapes when that happens. The frictionless read-only *view* path works fully in this build.

**Acceptance criteria:**
- [ ] A candidate can be quick-saved with one tap without creating a named opening.
- [ ] A manager can create a named opening with name + optional description + optional deadline.
- [ ] Adding to the short list auto-adds to the long list; removing from the long list removes from the short list.
- [ ] A note and a 0–5 score can be attached to a candidate within an opening, and candidates can be ranked by score.
- [ ] The read-only share link opens without an account and shows candidates, AI scores, and existing notes/rankings; "email this list" pre-fills an email with the link.
- [ ] Adding notes/scores via a shared opening requires a granted reviewer (mocked this build); a non-reviewer viewing the link sees disabled input controls.
- [ ] Team average score and team ranking compute across all contributors' scores, with each individual note/score still attributed.
- [ ] The AI match score + component breakdown stays visible alongside human scores wherever a candidate appears in an opening.
- [ ] Revoking a share link immediately 404s the old URL.

### 7.5 Video Q&As — P0 (upload or URL; in-browser recording P1)

Short candidate videos that let hiring managers evaluate communication style before scheduling a call. Rendered as their own tab on the profile page (see 7.2), and the general intro also appears as a flip-card face (see 7.1). **Visibility:** the **general intro video is public** — shown on `/site/:handle` and to anonymous browsers on `/profile/:handle` (it's the teaser). The **5 Premium standard-question videos** are hidden on `/site` and login-gated on `/profile` (anonymous browsers see a "create a free account to watch" prompt). Portfolio-attached Premium videos follow the same gated rule (see 7.9a).

**Standardized questions (so candidates are comparable):** the whole point is that everyone answers the *same* prompts, so a hiring manager can compare like with like.

- **General introduction** — a "Tell us about yourself" video. Available to **both tiers**. One per profile.
- **Standard question set** — **Premium only**: up to **5** videos answering a fixed, admin-managed list of common questions. Seed the list with these five (tuned to international-development consulting):
  1. Walk us through a project you're most proud of — what was your specific role, and what changed because of your work?
  2. Tell us about a time you had to deliver in an unfamiliar country or institutional context. How did you get up to speed?
  3. How do you communicate difficult findings or setbacks to a client or funder?
  4. Describe how you've navigated working across cultures, languages, or with local partners.
  5. What's a methodology or approach you specialize in — and when is it *not* the right tool?
- **Portfolio videos** — **Premium only**: one video attachable to a specific portfolio item (parallel to portfolio-attached audio testimonials, 7.6). Embeds on that portfolio item (subject to the same visibility rules — gated on `/profile`, stripped on `/site`).

**Input & constraints (all video types):**
- Per video, the candidate can **upload a file** to Supabase Storage **or paste a URL** (YouTube, Loom, direct link). Long-term intent is site-hosted uploads; URL stays available for those hosting elsewhere.
- **Hard 2-minute limit on every video** — the system must reject anything longer (client-side duration check before save, same mechanism as the 2-min audio cap).
- **Optional transcript** (plain text) per video, submitted by the candidate; surfaced in an expandable/pop-up interface (left to Fable). Feeds the Demonstrated Experience match component (7.7) and aids accessibility.
- Native in-browser recording (MediaRecorder) is a P1 fast-follow; upload-or-URL is P0.

> **Note on the intro video:** the general introduction is **public** — it shows on `/site`, to anonymous platform browsers, and as a flip-card face (7.1), acting as the teaser that makes the gated Premium Q&A videos more compelling. Only the 5 Premium standard-question videos and portfolio-attached videos are login-gated.

### 7.6 Audio Testimonials — P0 (real audio upload; in-browser recording P1)

Audio testimonials are short spoken references from a candidate's former managers/colleagues. They appear in the Audio Testimonials tab (shown on `/profile/:handle`, hidden on `/site/:handle`, per 7.2a), and a testimonial attached to a specific portfolio item **also** embeds on that portfolio item (see 7.2). Hiring managers listen to them in-app via an audio player.

A testimonial can be attached to **either the candidate in general, or a specific portfolio item** ("the client I did this exact project for, talking about it") — a reference tied to a concrete deliverable is more credible than a generic one.

**Two submission paths, both writing to the same `audio_testimonials` table + Supabase Storage bucket:**

*Path 1 — Reference-direct (tokenised link):*
- From the profile editor, the candidate generates an audio-testimonial **request**: they optionally pick one of their own portfolio items to attach it to (portfolio-item picker lives here, candidate-side — the request is implicitly about themselves, so there's no candidate picker), then get a unique tokenised link and a **pre-written email template** to send the reference.
- The link opens `/testimonial/:token` — an unauthenticated page with the candidate (and, if chosen, the portfolio item) **pre-loaded from the token**, so the reference confirms nothing and can't misattribute. The reference records (P1) or uploads (P0) an audio file and submits.
- **Security note:** this is an unauthenticated upload endpoint. Safe to scaffold, but the developer must harden it before real deployment — validate the token, cap file type/size server-side, rate-limit. Flagged so it isn't mistaken for a hardened path.

*Path 2 — Candidate-upload (authenticated):*
- A reference simply emails the candidate an audio file however they like; the candidate uploads it themselves from the profile editor and attaches it to themselves or a portfolio item. This path is fully authenticated and is the lower-friction option.
- Trade-off worth stating plainly: when the candidate uploads, the testimonial is *fully* self-managed — verification is effectively none, not merely weak. Acceptable given the self-attested posture already chosen (see Decisions), but a conscious choice, not a drift.

**Audio Testimonial info page** (linked from the email template and the submission page): a short public page explaining what MavenScout is, why the audio reference is being requested, and the submission guidelines, so a reference receiving a cold link has credible context.

**Parameters (applied on both paths):**
- 2-minute maximum length (enforced client-side on upload/record).
- Guideline that the reference should **introduce themselves at the start** (name, org, relationship to the candidate) — a prompt/instruction, not machine-enforced.
- Reference details captured alongside the audio: **name, organization, job title, relationship to the candidate, the date given (month/year), and an optional verification link** — a URL to a page confirming the reference is who they claim (their bio on their institution's website, a LinkedIn, etc.). The verification link is important: since testimonials are self-managed, letting a hiring manager click through to the referee's real institutional profile is a meaningful credibility check and lets them learn more about who's vouching.
- An **optional transcript** (plain text) can accompany each testimonial, submitted by whoever uploads (reference on the tokenised page, or candidate on direct upload). Surfaced in an expandable/pop-up interface (left to Fable). Transcripts feed the Demonstrated Experience match component (see 7.7) and aid accessibility.

**Where this lives in the editor:** the candidate's profile-edit section has a dedicated area to (a) upload an audio file directly and (b) generate a tokenised request link + email template to send a reference — both paths described above, in one place.

**Approval:** submitted testimonials land as pending; the candidate chooses which to publish to their profile; admin retains moderation/removal power (can audit and take down). This replaces the earlier "admin approves every testimonial" step so admin isn't a bottleneck on a self-attested feature, while preserving oversight.

**Acceptance criteria:**
- [ ] A candidate can generate a request (with optional portfolio-item attachment) that produces a tokenised link + email template.
- [ ] `/testimonial/:token` pre-loads the correct candidate (and portfolio item, if set) and accepts an audio upload to Supabase Storage.
- [ ] A candidate can also upload an audio file directly from their editor and attach it to themselves or a portfolio item.
- [ ] Uploads over 2 minutes are rejected client-side.
- [ ] Every testimonial appears in the Audio Testimonials tab; portfolio-attached ones additionally embed on their portfolio item.
- [ ] Hiring managers can play testimonials in-app, see the reference's name/org/title/relationship/date, and follow the verification link when provided; the candidate controls which are published; admin can remove any.

### 7.7 AI Matching — Scaffold (P0 UI/data model, mocked scoring logic)

> **Superseded by `docs/MavenScout-match-rework.md`.** That spec replaces this section — and the AI-match rows of the Decisions table — wherever they conflict. This section is kept as written for history.

This is the feature Loop8 is building the real engine for. Fable builds the full user-facing flow with a clearly isolated, swappable scoring function.

**Flow:**
1. Hiring manager narrows the pool with the filter bar + search on hard must-haves (location, language, availability, consultant type, etc.). Encouraged but not required before ranking. Because location/language/availability are typically pass/fail must-haves, handling them here as filters keeps the score focused on continuous merit factors (see "Scoring components" below).
2. **"Rank by Job Description"** (the prominent modal action from 7.1) accepts a **pasted** job description / Terms of Reference, **plus a separate "hiring organization" field** — the org the opening is for, which the Organizational History preference matches against (see below). (Paste only for JD text this build — no Word/PDF upload; file parsing adds real complexity while the scoring engine is still a placeholder.)
3. An **optional but encouraged importance step** using **5-stop sliders** (matching the 0–5 human scores used elsewhere in the app). Three merit components are always on; five preference components are off by default and can be added to sway the ranking. See the component/weight table below. Skipping the step entirely uses the default weights.
4. Results re-render as ranked flip cards, sorted by overall **Match Score (0–100)**, with the **top 15** getting a prominently displayed score. Each card shows the score, an expandable **component breakdown**, and a short AI-written narrative (see below).

**Persistence (where a ranking lives):** a ranking run is tied to the opening it was run for (via `job_descriptions.opening_id`). This means:
- **Ranking from within an opening** → the JD text, hiring org, weights, and every candidate's score/sub-scores/narrative are saved *to that opening*. A hiring manager who logs out and returns days later opens the opening and the last ranking is right there — no re-upload. They can **re-run** (e.g., after changing the filtered pool or adjusting weights), which replaces the opening's saved ranking, but re-running is a choice, not a requirement.
- **Ad-hoc ranking from the directory** (not inside an opening) → transient. Results display for the session but aren't persisted unless the manager **saves the ranking to an opening** (new or existing). This keeps stray one-off rankings from accumulating while making it a single action to keep one that matters.
- An opening therefore becomes the durable record of "this role, the JD I ranked against, and how candidates scored" — reinforcing openings as the workspace's organizing object (see 7.4).

**Scoring components — two classes.** The design deliberately separates *merit* (evidence of how well a candidate fits the work, always scored) from *preferences* (contextual factors the manager may or may not care about, off unless added). This resolves a real weighting flaw: near-binary factors like location (right city → easy 10/10) would otherwise inflate past continuous merit factors like domain fit (partial matches → naturally 6–7/10) under equal weighting. Keeping preferences off-by-default means they only sway the ranking when the manager deliberately opts in.

| Component | Class | Default slider (of 5) | Source |
|---|---|---|---|
| **Demonstrated Experience** | Merit — always on | 5 (freely adjustable up/down) | Combined free-text evidence: portfolio descriptions + detailed_bio + audio-testimonial transcripts + video-response transcripts, matched against the JD. This is the app's richest signal of *actual demonstrated capability*, as distinct from self-asserted tags — hence the highest default weight. |
| **Domain Expertise** | Merit — always on | 3 | Structured `expertise` tags vs. JD. Primary tags weigh more than secondary; a leaf-level (sub-item) tag matching the JD's specific need scores higher than a broad parent-category tag (see 7.14) |
| **Technical Skills** | Merit — always on | 3 | Structured `skills` tags vs. JD. Same primary/secondary and leaf-vs-parent weighting as Domain Expertise (see 7.14) |
| **Organizational History** | Preference — off by default | 2 when added | Candidate's `work_history` orgs vs. the JD-form hiring organization. **Tiered:** same organization → full; peer-group organization (e.g., World Bank ↔ UNDP, both large multilaterals) → partial; no overlap → none. |
| **Location** | Preference — off by default | 2 when added | Profile `location` vs. required (captures "X preferred but not required" that the hard filter can't) |
| **Language** | Preference — off by default | 2 when added | `languages` vs. required (captures "French is a plus") |
| **Availability** | Preference — off by default | 2 when added | Availability fit vs. needed window |
| **Type (Firm vs. Individual)** | Preference — off by default | 2 when added | `consultant_type` vs. the manager's stated lean |

**On the scale:** what matters mathematically is the *ratio* between component weights, not the scale's ceiling — 5/3/3 makes Demonstrated Experience ~1.67× each of the other merit components regardless of whether the scale tops out at 5 or 10. 5-stop chosen for UI consistency with the human 0–5 scores.

**On Organizational History (ethics note):** rewarding "worked where the hiring manager works" can entrench who-you-know hiring and disadvantage strong candidates from outside the usual institutions — which cuts against MavenScout's own pitch of surfacing people beyond your existing network. Making it a preference that's *off by default* (a manager must consciously add it) is the guardrail: it can't silently tilt every ranking. The tiered same/peer/none structure is speced now; the placeholder implements same-org-only, and Loop8's engine fills in the peer-group reasoning (which it's better placed to do from org names than a hardcoded list would be).

**AI-written narrative:** for each ranked candidate, the tool produces ~100 words explaining why they're a good match and where they may fall short. In this build this is placeholder/templated text generated from the component sub-scores (clearly labeled as such in code); the real generated narrative comes with Loop8's engine.

**Scaffolding requirement:** implement scoring as a single, clearly named function/API route (e.g., `computeMatchScore(profile, jobDescription, hiringOrg, weights)`) returning a deterministic placeholder, structured so it can be swapped for a real Loop8 API call later without touching the UI layer. The weights object (which components are on + each slider value), the component/sub-score/narrative return shape, and the tiered org-history structure are the stable contract Loop8 inherits. A percentile-normalization approach (scoring each component relative to the candidate pool so differently-distributed factors are comparable) is noted as an engine-side option for Loop8, not required of the placeholder.

**Acceptance criteria:**
- [ ] The JD modal captures both JD text and a separate hiring-organization field.
- [ ] Matching operates only on the currently filtered/searched result set, not the entire directory.
- [ ] The three merit components are always on (Demonstrated Experience default 5, Domain/Skills default 3); the five preferences are off until added, defaulting to 2 when added.
- [ ] Skipping the importance step uses those defaults; every active component contributes a visible sub-score in the breakdown.
- [ ] Organizational History uses the same/peer/none tiering in its return shape (placeholder may compute same-org only, clearly labeled).
- [ ] The top 15 results show a prominent match score; scores and sub-scores are stored, not just displayed transiently.
- [ ] A ranking run inside an opening persists (JD + weights + scores/narratives) and reappears when the manager returns to that opening after logging out; re-running replaces it. An ad-hoc directory ranking is transient unless explicitly saved to an opening.
- [ ] Each ranked candidate shows the ~100-word match narrative.
- [ ] The mock scoring logic and templated narrative are clearly commented/labeled as placeholders in code.

### 7.8 Subscriptions & Payments — Scaffolding only (P0 data model + UI, no live billing)

**How this normally works, for reference:** a real implementation uses Stripe Checkout to collect payment, and a webhook endpoint updates a `subscription_status` field in Supabase whenever Stripe reports a payment succeeding, failing, or a subscription canceling — the app never touches a credit card directly, it just reacts to that status field.

**For this build**, your developer will wire the real Stripe integration. Fable builds:
- The `/billing` page showing the two tiers — **Standard and Premium** — with their feature differences, and a "Subscribe" button that is present but non-functional (clearly labeled, e.g., a disabled/"Coming soon" state) rather than wired to real Stripe Checkout.
- The `subscription_status` and `is_premium` fields fully wired into the rest of the app's logic — profile publication gating, Featured badge, priority sort, and content limits should all work correctly, driven by a value an admin sets manually (via the admin panel or directly in Supabase) rather than a real payment event.

**Tier feature matrix:**

| | Standard | Premium |
|---|---|---|
| Video Q&A — general intro (upload or URL) | 1 | 1 |
| Video Q&A — standard-question videos | — | up to 5 |
| Video Q&A — attached to a portfolio item | — | 1 per portfolio item |
| Audio testimonials | 1 | 10 |
| Portfolio items (total on profile) | 3 | 10 |
| Portfolio items shown on flip card | 3 | 3 |
| Social / account links | 2 | 5 |
| Verified badge (passed vetting) | — | ✓ |
| Custom domain on profile page | — | ✓ |
| Featured badge + gold border + priority sort | — | ✓ |

Notes: the flip card shows up to 3 portfolio items for *both* tiers (Premium simply has more on the full profile) — keeps the card layout consistent. Every video is capped at 2 minutes (7.5). The general intro video is available to both tiers; the 5 standard-question videos and portfolio-attached videos are Premium-only. The personal-website field (name + URL, see 7.13) is available to both tiers and is separate from the tier-capped social/account links. Custom domain is a Premium entitlement, but live domain *connection* remains deferred infrastructure (see Decisions) — Premium reserves the capability; wiring it is a later pass.

This means the *product logic* around tiers is fully real and testable; only actual payment collection is stubbed.

### 7.9 Authentication & Roles — Scaffolding only (P0 data model + UI, mocked session)

**How this normally works, for reference:** Supabase Auth issues a session when someone signs up or logs in, and the app (and its Row Level Security policies) check that session to know who's making a request and what they're allowed to see or change.

**For this build**, your developer will wire real Supabase Auth (signup, login, password reset, session persistence, RLS enforcement). Fable builds:
- Signup/login screens for both Hiring Manager and Consultant/Firm, present and styled, but backed by a **mocked session** — e.g., a simple "logged in as [Demo Hiring Manager]" / "[Demo Consultant]" dev-only state, no real password check — so every account-gated feature (openings, shortlisting, notes/scores, sharing, JD matching, profile editing, billing page) can be built and demoed end-to-end.
- **Dev role switcher (required for testability).** Because auth is mocked, Fable must build a **dev-only control that instantly switches the current identity** between: **logged out**, **demo hiring manager**, **demo consultant**, and **demo admin**. This lets the product owner test every state — gated features locking/unlocking, the right user menu, `/admin` access, the two profile-view contexts — **without any real usernames or passwords**. Surface it somewhere obvious in dev (e.g., a small floating switcher or an entry in the user menu). The login/signup screens still exist as styled UI, but this switcher is the actual mechanism for moving between states. It should be trivially removable/disable-able for the developer's real-auth pass.
- `user_id` foreign keys stay in the schema exactly as designed, so wiring real auth later is a matter of replacing the mocked session — no data model changes needed.
- **`/admin` is an open, unprotected route in this build** — there is no real role check keeping non-admins out. Fine for local development and demoing; flag clearly to your developer that this needs real access control before any public deployment.

### 7.9a What Requires a Hiring-Manager Account — P0

Browsing is deliberately open to drive sign-ups; the richer tools require a (free) hiring-manager account. Anonymous visitors **can**: browse the directory, use all filters, use both search modes, view full profile pages (header, bio, portfolio, experience/education, skills) and `/site` pages, and **watch the general intro video** (7.5). They **cannot** (each shows an inviting sign-up prompt, not a hard wall):
- Watch the 5 Premium standard-question videos or portfolio-attached videos, or listen to Audio Testimonials (7.5, 7.6)
- See a candidate's Contracting & Work Eligibility note (7.18)
- Mark Favorites / Top Picks or save candidates into openings (7.4)
- Create or manage openings, or add reviewers (7.4)
- Run the AI ranking / "Rank by Job Description" (7.7)

Enforcement depends on real auth (mocked this build, see 7.9) — Fable builds the gates and prompts against the mocked session so the flow is demoable; the real gate lands with the developer's auth pass.

### 7.9b Account Management — P0 (UI scaffold; real operations wired later)

Both account types get the usual trappings of a logged-in account, reached from a **user menu in the top-right** of the global nav (avatar/name → dropdown).

**Consultant/Firm menu:** My Profile (edit — the 7.3 editor), Account Settings (change email/password), Billing (`/billing` — current tier, billing history, pause / cancel / resume subscription), Log out.

**Hiring Manager menu:** My Openings (`/openings` — list + create), Account Settings (change email/password), Log out. (Hiring managers are free — no billing menu.)

**Buildability in this build:**
- User menu, settings pages, openings list, and billing/history screens are **fully built as UI**.
- Operations that need real auth or Stripe (actual password change, real billing history, real payment on subscribe) are **stubbed/mocked** — screens present and navigable, clearly non-functional where they'd hit a real external service, for the developer to wire.
- **Pause/cancel/resume** may drive the `subscription_status` field directly for demo realism (e.g., cancel → `canceled` → profile unpublishes; resume → `active` → republishes), since that field already gates visibility — but real Stripe synchronization is the developer's job. `subscription_status` includes a `paused` value for this.

### 7.10 Admin Tools — P0 (open route, see 7.9)

- Review queue: approve/reject newly submitted or edited profiles, with three outcomes — rejected / approved-Standard / verified-Premium (see 7.20); review the attached verification evidence when present.
- Moderation: audit and remove any audio testimonial (candidates self-publish; admin has takedown power — see 7.6).
- Taxonomy management: add/edit/reorder `taxonomy_categories` and `taxonomy_items` (domain expertise, technical skills, and work arrangement — see Section 8), and review/approve/reject candidate-submitted `taxonomy_requests` (7.14) — on approval, add the real taxonomy row.
- Tier overview: manually set `subscription_status` / `is_premium` per profile (stands in for real billing events — see 7.8).
- Manage the standard Video Q&A question list (the 5 Premium standard questions) (see 7.5).

### 7.11 Employer Logo Lookup (Brandfetch) — P1 (manual URL fallback is P0)

When a consultant adds a Work History entry, they should be able to get a real organization logo without hunting one down themselves. [Brandfetch](https://brandfetch.com) is a good fit: its Logo API serves logo images by domain for free (fair-use limit of 500,000 requests/month, no attribution required), and its Brand Search API resolves a typed organization name to a domain/logo match (`GET api.brandfetch.io/v2/search/{name}?c={CLIENT_ID}`) — which matters here since a consultant types "World Bank," not "worldbank.org."

**For this build:**
- The `logo_url` field on each Work History entry (and optionally Education entries) (see Section 8) is a plain text URL — provider-agnostic. Fable builds a simple **manual paste-a-URL** input for it in the onboarding/profile-editor flow. This is the P0 path.
- Live Brandfetch integration (type an org name → autocomplete via Brand Search API → confirm a match → write the resulting Brandfetch CDN URL into `logo_url`) is a clearly-scoped P1 fast-follow, not required for this build. Because `logo_url` is just a URL, adding this later doesn't touch the schema at all.
- A free Brandfetch account and client ID would be needed before wiring the live version — not required to start this build.

### 7.12 About Page — P0

A single page at `/about` explaining the platform to a first-time visitor in either persona:
- What MavenScout is and the problem it solves (adapt directly from Section 2's Problem Statement and the "how it works" framing already written for mavenscout.com — no need to draft this copy from scratch).
- How it works for **hiring managers**: browse/filter a curated pool, screen via video and audio before a live call, rank against a job description, decide as a team.
- How it works for **consultants/firms**: one profile that's also a professional website, discoverable across peer organizations, a small monthly fee to stay listed.
- Clear calls-to-action at the end: "Join MavenScout" (routes to `/signup` → onboarding) and a way back to Browse (`/`).

### 7.13 Personal Website & Social/Account Links — P0

**Personal website** (both tiers): a candidate can add their own site as a **name + URL pair**. The profile displays the **name** as the hyperlink text, not the raw URL. The name field **defaults to "Personal website"** but is editable — useful for firms or individuals whose site has an actual brand name.

**Social / account links** (tier-capped: 2 for Standard, 5 for Premium — see 7.8): a candidate adds links to professional/social accounts, each chosen from a fixed platform list plus "Other":
- Suggested platform list (~10): X/Twitter, LinkedIn, ResearchGate, Google Scholar, GitHub, ORCID, Medium/Blog, YouTube, Instagram, Facebook — plus **Other** (free-form label).
- **URL validation matches the selected platform:** e.g., an "X/Twitter" link must be on `x.com`/`twitter.com`, "LinkedIn" on `linkedin.com`, etc. "Other" is validated only as a well-formed URL. Validation should be lenient about legitimate variations (country subdomains, `www`, trailing paths) so it doesn't reject valid links.
- **Icons via Lucide** where available. Note: several platforms here (ResearchGate, ORCID, Google Scholar) have **no Lucide icon** — Fable should fall back to a generic Lucide `link`/`globe` icon or a small custom icon set for those rather than assuming every platform has one.
- Displayed as an icon row on the profile; shown on both `/profile/:handle` and `/site/:handle` (they're part of the professional identity, not platform-internal data).

### 7.14 Domain Expertise & Technical Skills — Selection Model — P0

How candidates tag themselves against the taxonomy (see Section 8), refined to preserve curation quality — an expert who tags everything looks like a generalist, which defeats the platform's purpose.

**Primary vs. secondary, with caps.** For **each** of the two taxonomies (Domain Expertise and Technical Skills), a candidate selects:
- up to **2 primary** items — their core areas (the cap forces the honest "what are you *really*?" signal)
- up to **4 secondary** items — additional competencies
So at most 6 per taxonomy, 12 total. On the profile and the flip-card faces (7.1), primary items are shown first and emphasized; secondary follow, visually distinguished (e.g., lighter/smaller pills or a "Also:" grouping — exact treatment Fable's call).

**Self-attested marker.** Domain expertise and technical skills are self-reported by the candidate. Wherever they're displayed — flip-card faces (7.1) and the profile — show a small **"self-attested"** (or "self-reported") marker so hiring managers understand these are candidate claims, not verified data. This matters for the trust positioning. (Headline, bio, location, and availability are obviously self-provided and need no such marker — the marker is only on the tag-based claims and accreditations, 7.15.)

**Tag at either level — category or sub-item.** A candidate may select a first-tier **category** (e.g., "Climate & Environment") to signal *broad/generalist competency in that area*, OR a second-tier **sub-item** (e.g., "WASH") to signal *specific depth*. Both are valid and serve different candidates (a firm may be broadly strong; an individual may be a narrow specialist).

**How a category-level tag behaves in search/match (deliberate):** a parent-category tag means "broad/generalist in this area" and is treated as **its own distinct, broader signal** — it does **not** auto-expand to mean the candidate matches every specific sub-item. So a hiring manager filtering for the specific sub-item "WASH" will *not* surface a candidate who only tagged the parent "Climate & Environment" (specific search shouldn't return vague generalists). This is the opposite direction from the *filter-bar* parent behavior in 7.1 (where a manager *selecting* a parent expands to match its children) — the asymmetry is intentional: a manager choosing broad wants everything under it; a manager choosing narrow wants genuine specialists. For the AI matcher (7.7), a leaf-level tag matching the JD's specific need scores higher than a parent-level tag; parent tags are a weaker/broader signal.

**Requesting new taxonomy items.** A candidate can **request a new item** be added (funnels to the admin taxonomy queue, 7.10, for approval before it appears). This lets the taxonomy evolve from real demand while keeping it curated and consistent. There is **no free-text "Other"** field — free-text would fragment the controlled vocabulary ("WASH" vs "Wash" vs "water & sanitation") and break clean filtering; the request-and-approve flow meets the same need without that cost.

### 7.15 Accreditations & Certifications — P0

A dedicated profile section for formal credentials (relevant for knowledge-work hiring — PMPs, PhDs, professional licenses, M&E certifications, etc.). Each entry: `{name, issuing_organization, year (nullable), credential_id_or_url (nullable)}`. Shown on both `/profile/:handle` and `/site/:handle` (part of professional identity). Also strengthens the Demonstrated Experience match signal (7.7). Displayed as a simple list/section on the profile; not a flip-card face. Carries the same **"self-attested"** marker as expertise/skills (7.14) — it matters most here, since an unverified claimed credential is weightier than a claimed skill; the marker keeps that honest without the platform having to verify.

### 7.16 Availability — P0

Deliberately kept low-effort so candidates actually keep it current — a stale availability field is worse than none (a manager who trusts it gets bad information). **No calendar.**

**Two independent tracks** — part-time and full-time — because a candidate is often part-time-available in some periods and full-time in others. Each track has a status (`available_now` / `available_from` / `unavailable`) plus an optional **from** date and an optional **until** date (see data model). This captures temporal *shape* without a grid: e.g., "Part-time: available now through March 2026" and "Full-time: available from April 2026." A candidate who doesn't care about future windows just sets "available now" or "unavailable" and moves on — it degrades gracefully.

**Display:**
- Card front + profile: compact PT / FT badges, color-coded (green = now, amber = future/window, grey = unavailable), showing the relevant dates.
- Profile shows a **"Availability last updated [date]"** cue (from `availability_updated_at`) so a hiring manager can judge freshness. This is the honesty mechanism — it lets managers weight stale availability appropriately rather than the platform pretending all availability is current. (A proactive "still accurate?" refresh nudge to candidates is noted as a possible later feature, not built now.)
- Availability is **hidden on `/site/:handle`** (7.2a) — it's platform-facing, not something a candidate wants on their public website.

**Filter (modal, see 7.1):** an "Availability" button opens a small modal asking two things — engagement type (part-time / full-time / either) and a start window (a month picker; multi-select months or a from→to range). Matching a track means: its status is available (now or from a date within the requested window) and, if it has an `until`, the window overlaps. Kept to those two questions — resist duration-precision the self-reported data can't reliably support. The button surfaces the active filter as a summary label.

**Acceptance criteria:**
- [ ] A candidate can set each track independently to available-now / available-from-date / unavailable, with an optional until-date.
- [ ] Editing availability updates `availability_updated_at`, and the profile shows that date.
- [ ] The availability filter modal returns candidates whose chosen track is available within the requested engagement type and start window.

### 7.17 Async Video Response Requests — P1 (below the P0 core; scaffolded, notification stubbed)

A high-value differentiator: a hiring manager can send an opening's JD to **up to 3 candidates** and ask each for a short async video answering a fixed prompt — *"Why do you want this role, and why do you believe you'd excel in it?"* — max **5 minutes**. This enables asynchronous interviewing across time zones: a globally distributed team hiring fast for a short-term assignment can screen tailored responses without scheduling live calls. It's distinct from the standing Video Q&As (7.5), which are generic and profile-level — these are JD-specific, time-bound, and requested.

**Priority note:** this is genuinely valuable but is **not** part of the P0 core, and it leans on the two things this build mocks (auth + outbound email/notifications). Build it if session time allows; it's the natural thing to defer if the core (directory, profiles, openings, matching, media) is eating the budget. Don't let it block P0 work.

**Flow (scaffolded):**
- From within an opening, the manager selects up to 3 candidates and sends the request (the opening's JD travels with it).
- Each candidate gets a request tied to that opening + JD. **The notification to the candidate (email with the JD and a submission link) is stubbed** — the request record is created and visible in-app, but real outbound email is the developer's later job, consistent with the rest of the build (see 7.9). For demoing, the candidate-side request can surface in a candidate's logged-in view directly.
- The candidate views the JD and submits a video response (upload or URL, 5-min cap, same media handling as 7.5 — real Supabase Storage upload).
- The manager sees submitted responses within the opening, alongside that candidate's other material and scores.

**Data model — new table `video_response_requests`:** `id (uuid, pk)`, `opening_id (fk)`, `job_description_id (fk, nullable)` — the JD sent, `profile_id (fk)` — the candidate asked, `requested_by (fk → hiring_managers)`, `prompt (text)` — defaults to the standard "why this role" prompt, `status ('sent'|'submitted'|'declined')`, `video_url (text, nullable)` / `video_path (text, nullable)` — the submitted response, `duration_seconds (int, nullable)` — enforces the 5-min cap, `created_at`, `submitted_at (nullable)`. Cap of 3 outstanding requests per opening enforced in app logic.

**Acceptance criteria:**
- [ ] A manager can select up to 3 candidates in an opening and create requests carrying the JD (real outbound email stubbed).
- [ ] A candidate can view the request + JD and submit a ≤5-minute video (upload or URL) to Storage.
- [ ] Submitted responses appear in the opening alongside the candidate's other material.

### 7.18 Contracting & Work Eligibility — P0

A free-text field capturing how a candidate can legally be engaged. For **individuals**: right-to-work / visa-sponsorship status *and* the legal vehicle they can be contracted through (LLC, sole proprietorship, umbrella company, etc.) — many consultants can be hired either as an individual or via their own registered entity, and a manager needs to know which. For **firms**: registration, where they're incorporated, and the contracting entity. Free-text (not a filter) because a boolean can't capture "right to work in the EU, would need US sponsorship, can invoice via my UK Ltd" — the reality is too varied. ~300 character cap.

- **Logged-in-only visibility:** hidden on `/site/:handle`, gated behind login on `/profile/:handle` (see 7.2a/7.9a) — sensitive, platform-facing, not public-website material.
- **Not scored by the AI matcher.** Parsing this free-text reliably enough to move a score would produce confident-but-wrong results; it's a hard human-judgment constraint, displayed prominently for a logged-in manager to read and weigh. (Loop8 could revisit later; out of scope for the score now.)
- Displayed in the profile's At-a-Glance / Overview area for logged-in managers.

### 7.20 Verification & Quality Vetting — P0 (evidence storage stubbed — see security note)

The marketplace's core promise is a *trusted, vetted* pool — but the classic adverse-selection risk (the least-qualified are often the most eager to join) means curation is essential. This is handled as a **badge + tiered approval**, not a hard exclusion gate (which would filter for pedigree over quality and exclude excellent non-institutionally-credentialed experts — a real quality miss and a values problem in a localization-focused sector).

**Three approval outcomes** (admin decides on every submitted profile):
- **Rejected** — not listed at all.
- **Approved (Standard)** — listed, admin-confirmed as a legitimate professional, but *not* verified. `verification_status = 'unverified'`.
- **Verified (Premium)** — passed evidence-based vetting of genuine industry experience; gets the **"Verified" badge**, plus all Premium features and featured placement. `verification_status = 'verified'`.

**Verification is coupled to Premium in product logic, but separate in the schema.** To become Premium, a candidate **applies** (not merely pays) — the application includes an evidence step; passing the admin vetting grants Premium (features + featured placement) *and* the Verified badge. Keeping `verification_status` and `is_premium` as separate fields (see data model) preserves the option to later decouple (let free-tier candidates earn verification) or harden into a join-gate, as a logic change rather than a schema migration.

**Evidence step:** in the premium application, the candidate provides **1 evidence item (expandable to 3)**, each = a file upload + a free-text explanation. Evidence can be anything demonstrating prominent-industry experience (an employment letter, a payslip, an email screenshot, etc.) — the admin makes a **judgment call**, not a mechanical top-N-institution checklist (no contentious ranked list to author/defend). The `verification_status` moves to `'pending'` on submission, then `'verified'` or back to `'unverified'` on admin decision.

> **⚠ Security — the most sensitive data in the app.** Evidence files are personal *and financial* documents (payslips, employment letters). Collecting/storing them carries real data-protection weight (retention, access control, breach liability, GDPR-type obligations). For this scaffolded build, Fable builds the upload UI + data model, but **actual secure storage must be stubbed and flagged hard for the developer's security pass** — a one-shot scaffold must not be the thing genuinely persisting people's payslips. Treat this as a louder version of the unauthenticated-testimonial security flag (7.6).

**Hiring-manager filter:** a **standalone "Verified only" toggle** near the filter bar (not folded into the Type dropdown — it's a quality gate, not an attribute). Labeled "Verified," not "Premium," because managers think in quality terms, not the candidate's subscription. Off by default (shows all approved profiles); on shows verified-only.

**Verified badge** displays on flip cards and the profile (distinct from the Premium "Featured" gold treatment, though in practice they co-occur). On `/site/:handle` the badge may show (it's a credential, part of professional identity) — Fable's call.

**Acceptance criteria:**
- [ ] Admin can set a submitted profile to rejected / approved-standard / verified.
- [ ] A premium application includes 1–3 evidence uploads with per-item explanations; submitting sets `verification_status='pending'`.
- [ ] Verified profiles show the badge on cards and profile; the "Verified only" toggle filters to them.
- [ ] Evidence storage is clearly stubbed/flagged as sensitive, not production-persisted.

### 7.19 Firm vs. Individual Profiles — P0

Firms and individuals share one profile type (not a separate entity), but some sections don't apply to a firm and are **conditionally hidden by `consultant_type`** — a rendering rule, not a divergent data model:

| Section / field | Individual | Firm (Small / Large) |
|---|---|---|
| Education (7.2) | Shown | **Hidden** (a firm has no degrees) |
| Work History (7.2) | Shown | **Hidden** (Portfolio is the firm's track record) |
| Additional Experience (7.2) | Shown | Shown (optional — founding, partnerships, notable engagements) |
| Career level | Shown (bracket + years) | **Hidden** |
| Year founded → "X years in business" | Hidden | Shown |
| Everything else (headline, expertise, skills, portfolio, accreditations, availability, contracting/eligibility, website, socials, video, audio) | Shown | Shown |

- **No dedicated "previous clients" section** — Portfolio (showcased deliverables) already covers a firm's track record; a separate clients section would duplicate it.
- **Small vs. Large firm** is a self-attested split with a **defined threshold: a Small Firm is 15 or fewer people; Large Firm is more than 15.** Show an **info tooltip/pop-up** stating this definition wherever the firm-type selector or badge appears, so the label carries real meaning rather than being an arbitrary self-assessment.
- **Type filter (7.1):** the hard Individual / Small Firm / Large Firm filter stays (some managers want only individuals, or a firm's bench depth) — distinct from the *soft* firm-vs-individual preference in the matcher (7.7).
- **Career Level filter behavior:** career level is individual-only, so when a manager filters to **firms only**, the Career Level filter **disables/greys out** (an honest "doesn't apply to firms" signal, not silently ignored). No separate "years in business" filter — years-in-business is a weak quality signal (a young firm can be senior people), so it's shown on the profile but not filterable, to avoid misleading filtering.

---

## 8. Data Model (Supabase)

### `taxonomy_categories`
`id (uuid, pk)`, `type ('domain_expertise' | 'technical_skills' | 'work_arrangement')`, `name`, `sort_order`

### `taxonomy_items`
`id (uuid, pk)`, `category_id (fk)`, `name`, `sort_order`

### `taxonomy_requests`
`id (uuid, pk)`, `profile_id (fk)` — who requested it, `type ('domain_expertise'|'technical_skills')`, `proposed_name (text)`, `proposed_parent (text, nullable)` — suggested parent category if it's a sub-item, `status ('pending'|'approved'|'rejected')`, `created_at`. Candidate-submitted requests for new taxonomy items; admin approves/rejects in the taxonomy queue (7.10, 7.14). On approval, admin adds the real `taxonomy_categories`/`taxonomy_items` row.

Three types, not five. `domain_expertise` and `technical_skills` keep their two-tier hierarchy; `work_arrangement` is a flat 3-item list (Remote/On-site/Hybrid) — genuinely fixed, confirmed by real profile data.

**Location and Language are deliberately *not* in this taxonomy structure** — see the `profiles` table below. They stay as free-text fields, with filter dropdown options derived dynamically from what's actually in the data (`SELECT DISTINCT location FROM profiles`, etc.) rather than a pre-curated list. Domain Expertise and Technical Skills are meant to be closed, curated categories — that's core to the product's value prop. Cities and languages are not: the 15 real seeded profiles already use 6 cities and 7 languages that a hand-picked "world cities"/"world languages" list missed (Lagos, Abuja, Beirut, Amman, Dhaka, Lima; Hausa, Yoruba, Igbo, Twi, Bengali, Filipino, Thai). A fixed list here would block legitimate signups from anywhere not already on it.

**Domain Expertise** (hierarchical — parent category → sub-items):
- Gender & Social Inclusion → Gender Mainstreaming, Gender-Based Violence, Disability Inclusion, Indigenous Peoples, Gender Budgeting
- Climate & Environment → Climate Adaptation, Climate Mitigation, Biodiversity, Renewable Energy, Circular Economy, Water Management, WASH
- Governance & Institutional → Anti-Corruption, Public Procurement, Justice Reform, Citizen Engagement, Digital Governance
- Human Development → Primary Education, Tertiary Education, Health Systems, Social Protection, Nutrition
- Agriculture & Food → Agribusiness, Food Security, Rural Development, Irrigation Systems, Sustainable Farming
- Infrastructure & Transport → Urban Transport, Road Safety, Logistics & Supply Chain, Energy Efficiency, Public-Private Partnerships
- Private Sector Development → SME Support, Trade & Competitiveness, Financial Inclusion, Investment Climate, Innovation Ecosystems
- Fragility, Conflict & Violence → Peacebuilding, Humanitarian Aid, Refugee Support, Post-Conflict Reconstruction, Social Cohesion

**Technical Skills** (hierarchical):
- Writing & Editorial → Technical Writing, Policy Briefs, Ghostwriting, Copywriting, Academic Editing
- Graphic Design & Creative → Infographics, Brand Identity, Publication Layout, Motion Graphics, Photography
- Technical & Data → GIS Mapping, Data Science, Statistical Analysis, Python/R, Financial Modeling
- Strategic & Operations → Project Management, Monitoring & Evaluation, Change Management, Stakeholder Facilitation
- Language & Translation → Translation, Interpretation, Localization, Transcreation, Subtitling
- Training & Capacity Building → Curriculum Design, Workshop Facilitation, E-Learning Development, Training of Trainers, Mentoring
- Research & Analysis → Qualitative Research, Survey Design, Impact Evaluation, Market Research, Policy Analysis
- Digital & IT Services → Web Development, Database Management, Cybersecurity, Cloud Architecture, Mobile App Development
- Communications & Advocacy → Media Relations, Social Media, Advocacy Campaigns, Speechwriting, Public Outreach

> **Note:** every domain expertise and technical skills value above has now been cross-checked against actual usage across all 15 real seeded profiles — full coverage, no gaps, including WASH and the Communications & Advocacy category. Confirmed as the correct canonical list; see `001_seed_taxonomy.sql`.

**Work Arrangements** (flat list): Remote, On-site, Hybrid

This taxonomy is sector-specific by design; keep the table structure sector-agnostic (a future sector gets its own rows, not a schema change) even though only international development is seeded now.

### `profiles`
`id (uuid, pk)`, `user_id (fk → auth.users, nullable — see 7.9 on mocked sessions)`, `consultant_type ('Individual'|'Small Firm'|'Large Firm')`, `handle (unique, for public URL)`, `name`, `headline`, `location (text, free-form)`, `career_level ('early_career'|'mid_career'|'senior')` — **individuals only**; three brackets displayed with their year ranges: Early Career (0–5 years), Mid-Career (5–15), Senior (15+); single-select, drives the Career Level filter and card/hero display (see 7.1). Null for firms. ("Retiree" is deliberately not a level — it's a status, not seniority; a retired 25-year veteran is just Senior.), `year_founded (int, nullable)` — **firms only**; the app computes "X years in business" for display (see 7.19). Firms and individuals never show both — `consultant_type` decides which of career_level / year_founded appears, `contracting_work_eligibility (text, nullable)` — free-text (~300 char cap), **logged-in-only** visibility (hidden on `/site`, gated on `/profile`, see 7.9a/7.18). For individuals: right-to-work / visa-sponsorship needs *and* the legal vehicle they can be contracted through (LLC, sole proprietorship, umbrella company, etc.). For firms: registration / incorporation / contracting entity. Not a scoring component — displayed for managers to read and judge, `work_types (text[])`, `part_time_availability (jsonb)` and `full_time_availability (jsonb)` — two independent tracks, each `{status ('available_now'|'available_from'|'unavailable'), from (date, nullable), until (date, nullable)}`; `from` is the start of the window (set for `available_from`), `until` is an optional end, so a track can express "available now through March" or "full-time from April" (see 7.16), `availability_updated_at (timestamptz)` — set whenever the candidate edits either track; surfaced to hiring managers as a "last updated" freshness cue (see 7.16), `photo_url`, `cover_image_url`, `headline (text)` — the short one-liner shown on the card front and profile hero; ~120 character cap (see 7.1); the pipe-separated `X | Y | Z` convention reads well but isn't enforced, `detailed_bio (text)` — the full multi-paragraph professional summary on the profile page, `expertise (jsonb)` — domain expertise tags, array of `{name, tier ('primary'|'secondary'), level ('category'|'item')}`, max 2 primary + 4 secondary (see 7.14); `name` holds the taxonomy category or item name, `level` records whether it's a broad parent-category tag or a specific sub-item, `skills (jsonb)` — technical skills, same shape and caps as `expertise`, `accreditations (jsonb)` — array of `{name, issuing_organization, year, credential_id_or_url}` (see 7.15), `languages (text[], free-form)`, `work_history (jsonb)` — array of `{organization, role, start_year (int), end_year (int, nullable = "Present"), logo_url (nullable), description (nullable)}`, max 10 entries; `logo_url` powers both the Work History display and the card-front Sector Experience logos (2–3 most-recent orgs, see 7.1) — see 7.11 on how logos get populated, `education_history (jsonb)` — array of `{institution, degree_or_course, start_year (int), end_year (int, nullable), logo_url (nullable)}`, max 5 entries, `additional_experience (jsonb)` — volunteer work, board/advisory roles, fellowships, affiliations (not paid jobs or degrees; distinct from Portfolio, which is showcased deliverables); array of `{organization, role, start_year (int), end_year (int, nullable), description (nullable)}`, max 5 entries, `website_name (text, nullable, default 'Personal website')` and `website_url (text, nullable)` — personal website shown as name-hyperlink (see 7.13), `social_links (jsonb)` — array of `{platform, label, url}`, count enforced by tier (see 7.8, 7.13), `is_premium (bool, default false)` — drives the Standard/Premium distinction (see 7.8); coupled in logic to verification (see 7.20) but kept as a separate field, `verification_status ('unverified'|'pending'|'verified', default 'unverified')` — the Verified badge + quality filter (see 7.20); separate from `is_premium` on purpose (preserves decouple/harden options), `custom_domain (text, nullable, reserved)`, `subscription_status ('active'|'past_due'|'canceled'|'paused'|'none')`, `approval_status ('pending'|'approved'|'rejected')`, `created_at`, `updated_at`

> **Note:** the original schema draft had a separate `sector_experience (text[])` field for card-front logos and a standalone "Previous Employers" grid. Both are now folded into `work_history` — one structure covers the Work History display, the card-front Sector Experience logos, and the Organizational History match sub-score (7.7), rather than keeping organization data in two places that could drift out of sync.

### `portfolio_items`
`id (uuid, pk)`, `profile_id (fk)`, `project_name (text)`, `role (text)`, `description (text)`, `results (text, nullable)` — outcomes/impact ("what changed because of your work"), `cover_image (text)` — primary image, `images (jsonb)` — optional additional images for a carousel, array of `{url, caption}` (caption optional per image), `links (jsonb)` — up to 3, array of `{label, url}`, `sort_order (int)`
> The `cover_image` is what shows on the flip-card portfolio faces (7.1) and as the item's lead image; `images` drives a carousel on the full profile. A Premium portfolio-attached video (7.5) references this item via `video_responses.portfolio_item_id`, and a portfolio-attached audio testimonial (7.6) via `audio_testimonials.portfolio_item_id`.

### `verification_evidence`
`id (uuid, pk)`, `profile_id (fk)`, `file_path (text)` — Supabase Storage path (**sensitive — storage stubbed/flagged, see 7.20 security note**), `explanation (text)`, `created_at`. 1–3 rows per profile, submitted with a premium application; admin reviews and sets `profiles.verification_status`.
`id (uuid, pk)`, `question_text`, `sort_order`, `active (bool)` — admin-managed. Holds the **5 Premium standard Video Q&A questions** (see 7.5). The general intro is not stored here (it's `kind='intro'` with a fixed UI label).

### `video_responses`
`id (uuid, pk)`, `profile_id (fk)`, `kind ('intro'|'question'|'portfolio')`, `question_id (fk → interview_questions, nullable)` — set when `kind='question'`, `portfolio_item_id (fk, nullable)` — set when `kind='portfolio'`, `video_url (text, nullable)` — set when the candidate pastes a URL, `video_path (text, nullable)` — set when the candidate uploads a file to Storage (exactly one of url/path is populated), `transcript (text, nullable)` — optional, feeds Demonstrated Experience matching (see 7.5, 7.7), `duration_seconds (int)` — enforces the 2-min cap, `created_at`
> `kind='intro'` (all tiers, one per profile) and `kind='portfolio'` (Premium) carry no `question_id`; the intro's label is fixed in the UI ("Tell us about yourself") rather than stored as a question row. `kind='question'` videos are Premium and reference the standard-question list below.

### `audio_testimonials`
`id (uuid, pk)`, `profile_id (fk)`, `portfolio_item_id (fk, nullable)` — if set, the testimonial is about that specific project and also embeds on it (see 7.6); if null, it's a general testimonial, `reference_name`, `reference_org`, `reference_title (text)` — the reference's job title at that org, `relationship`, `reference_date (date)` — month + year the reference was given (day can be set to 1), `verification_url (text, nullable)` — link to a page verifying the reference is who they claim (e.g. their bio on their institution's site); lets managers learn more about and sanity-check the referee, `audio_path (text)` — Supabase Storage path (real upload this build, see 7.6), `transcript (text, nullable)` — optional, submitted by whoever uploads; feeds Demonstrated Experience matching (see 7.6, 7.7), `duration_seconds (int)` — used to enforce the 2-min cap, `source ('reference_direct'|'candidate_upload')`, `submission_token (unique, nullable)` — set for the reference-direct path, `status ('pending'|'published'|'removed')` — candidate publishes; admin can remove, `created_at`

> **Storage:** this feature needs Supabase Storage buckets for **audio and video** (both support real uploads now — see 7.5, 7.6). The audio reference-direct submission path writes from an unauthenticated context via the tokenised page — see the security note in 7.6; that bucket's access policy needs the developer's attention before real deployment.

### `hiring_managers`
`id (uuid, pk)`, `user_id (fk → auth.users, nullable — see 7.9)`, `name`, `organization`, `created_at`

### `openings`
`id (uuid, pk)`, `hiring_manager_id (fk)`, `name`, `description (nullable)`, `deadline (date, nullable)`, `is_default (bool)` — the always-present quick-save opening (see 7.4), `created_at`

### `opening_entries`
`id (uuid, pk)`, `opening_id (fk)`, `profile_id (fk)`, `list_tag ('favorite'|'top_pick')` — short_list/top_pick implies long_list/favorite membership (enforced in app logic), `outreach_tag ('contacted'|'interview_scheduled'|'interview_completed', nullable)` — independent of list_tag (see 7.4), `post_interview_note (text, nullable)`, `post_interview_score (int 0–5, nullable)` — bounded ATS surface (see 7.4/Non-Goals), `added_at`

### `candidate_notes_scores`
`id (uuid, pk)`, `opening_entry_id (fk)`, `author_id (fk → hiring_managers)` — attributes the note/score to a specific person for team collaboration (7.4), `note (text, nullable)`, `score (int 0–5, nullable)`, `created_at`, `updated_at`
> One row per (candidate-in-opening, author). Team average and team ranking are computed by aggregating `score` across all authors for a given `opening_entry_id`.

### `opening_shares`
`id (uuid, pk)`, `opening_id (fk)`, `share_token (unique)`, `created_at`, `revoked_at (nullable)` — the read-only *view* link, no account needed (see 7.4)

### `opening_reviewers`
`id (uuid, pk)`, `opening_id (fk)`, `reviewer_id (fk → hiring_managers)`, `granted_at` — explicit grants for the *participate* permission (add own notes/scores). Enforcement depends on real auth (mocked this build); the table carries the grants now so nothing reshapes when auth lands (see 7.4, 7.9).

### `job_descriptions`
`id (uuid, pk)`, `hiring_manager_id (fk)`, `opening_id (fk, nullable)` — the opening this ranking is saved to; null = a transient ad-hoc directory ranking not (yet) saved to an opening (see 7.7). Persisted rankings reappear when the manager returns to the opening, `raw_text`, `hiring_organization (text, nullable)` — the org the opening is for, matched against by the Organizational History component (see 7.7), `weights (jsonb)` — which components are active + each 0–5 slider value (see 7.7), `created_at`

### `match_results`
`id (uuid, pk)`, `job_description_id (fk)`, `profile_id (fk)`, `total_score (int)`, `sub_scores (jsonb)` — one entry per scoring component (7.7), `narrative (text)` — the ~100-word match explanation, `created_at`

**RLS notes:** public read on `profiles` (approved + active only), `portfolio_items`, `taxonomy_*`, `video_responses`, published `audio_testimonials`. The audio Storage bucket and the unauthenticated tokenised insert path for `audio_testimonials` need explicit, carefully-scoped policies (see 7.6 security note). Write access scoped to the owning `user_id` or `admin` role. Given auth is mocked in this build (see 7.9), RLS policies can still be written as designed, but will need re-verification once real Supabase Auth sessions replace the mocked one.

---

## 9. Design & Branding

Brand constraints are intentionally light for this build: use the MavenScout cyan (`#0C8C9F`) as the primary accent color, and the provided logo/wordmark SVG assets exactly as given. Beyond that, Fable has creative freedom on typography, secondary palette, and layout — **the app does not need to visually match mavenscout.com**, which was a quick placeholder site and may be redesigned later. See the companion `MavenScout-design.md` for the full brief.

---

## 10. Tech Stack & Environment

| Layer | Choice |
|---|---|
| Framework | React + TypeScript, Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion (flip card + transitions) |
| Icons | Lucide React |
| Routing | React Router |
| Database | Supabase (Postgres) |
| Auth | Scaffolded/mocked in this build (see 7.9) — real Supabase Auth wired later by developer |
| File storage | Supabase Storage — real audio-testimonial and Video Q&A uploads (upload-or-URL); see 7.5, 7.6 |
| Payments | Scaffolded UI/tier-logic only (see 7.8) — real Stripe wired later by developer |

**Environment variables needed before the build starts:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Have the Supabase project and GitHub repo created before starting the Claude Code session (GitHub repo already done). No Stripe account is needed for this round, given payments are UI/logic scaffolding only.

---

## 11. Recommended Build Order (for the Claude Code / Fable session)

1. Project scaffold, brand constraints (cyan + logo assets), routing shell, Supabase schema + RLS. Taxonomy and profile seed data are already prepared as ready-to-run SQL — `001_seed_taxonomy.sql` and `002_seed_profiles.sql` in this repo — Fable should create tables matching this PRD's schema first, then run these two files rather than generating its own seed data.
2. Directory browse page: flip cards (including Sector Experience logos on the front face), filter bar, two-mode search, sort. Global navigation (logo, Browse, About, Login, "Join MavenScout" CTA) and the About page (7.12) are natural to build alongside this, since they're page chrome most other pages depend on.
3. Profile detail page with its main-content + Video Q&As + Audio Testimonials tabs at `/profile/:handle` (video/audio login-gated), plus the reduced `/site/:handle` public-website view (see 7.2a).
4. Mocked auth (both roles) + consultant onboarding/profile editor (including work history / education / additional experience with the manual logo-URL field) + admin approval queue (open route).
5. Openings (with the default quick-save opening), long/short-list shortlisting, per-candidate notes + 0–5 scores, attributed team collaboration with averages/rankings, and link-based sharing + "email this list" (against the mocked session).
6. Video Q&As (general intro all tiers; 5 Premium standard-question videos; Premium portfolio videos — upload-or-URL, 2-min cap, optional transcript). Audio testimonials: candidate-side request generator (tokenised link + email template + portfolio-item picker), the `/testimonial/:token` reference page and `/testimonial-info` page, real Supabase Storage upload (in-browser record is P1), candidate-upload path, publish/moderation, and embedding portfolio-attached testimonials on their portfolio item.
7. Billing page UI + tier logic (Standard/Premium gating, content limits, Featured badge/priority sort) driven by an admin-settable field.
8. AI matching scaffold: the "Rank by Job Description" modal, weighting questionnaire, mocked scoring, ranked results UI.

With auth, billing, and media capture all scaffolded rather than fully built, this is a substantially lower-risk one-shot than the original full-scope version — the matching UI (step 8) is now the most novel/complex remaining piece.

---

## 12. Decisions

| Question | Decision |
|---|---|
| Subscription tier structure | Two tiers — Standard and Premium — with the original feature-limit split (see 7.8) |
| Hiring manager account requirement | Account-optional browsing; account required to save/share/run matching |
| Audio testimonial verification | Self-attested, no verification step in v1 |
| Custom domain connection | Deferred — field reserved, no live DNS/domain-API integration |
| Firm structure | Single profile per firm, no multi-seat team accounts |
| Contact flow | Email-only intro, no in-platform messaging |
| Auth & billing implementation | Scaffolded/mocked in this build; developer wires real Supabase Auth + Stripe afterward (see 7.8, 7.9) |
| Audio testimonial upload | Real Supabase Storage upload for v1; in-browser recording is P1 (see 7.6) |
| Audio testimonial submission | Two paths — reference-direct via tokenised link, and candidate direct upload (see 7.6) |
| Audio testimonial attachment | Attachable to the candidate generally or to a specific portfolio item (embeds on the item) (see 7.6) |
| Audio testimonial parameters | 2-min cap (enforced), reference introduces themselves at the start (guideline) (see 7.6) |
| Audio testimonial approval | Candidate self-publishes; admin has takedown/moderation (see 7.6) |
| Location & Language taxonomy | Free-text on `profiles`, filter options derived dynamically — not curated taxonomy rows (see Section 8) |
| Video/Audio tab visibility | Shown on `/profile/:handle`, hidden entirely on `/site/:handle` (see 7.2a) |
| Employer logos | Sourced via Brandfetch eventually (7.11); manual URL paste is the P0 path |
| Lists model | Openings (named, with optional description + deadline) are the organizing object, with an always-present default quick-save opening; long list / short list are two tiers *within* each opening — replacing global Favorites/Top Picks (see 7.4) |
| Short list ⊆ long list | Adding to the short list auto-includes in the long list (see 7.4) |
| Notes & human scores | Per-candidate freeform note + 0–5 score, attributed per author, with team averages and team ranking (see 7.4) |
| Sharing mechanism | View = open read-only link (no account) + "email this list"; Participate (add notes/scores) = logged-in + owner-granted reviewer. Participate enforcement depends on real auth, mocked this build (see 7.4) |
| Tag systems | Two independent axes per candidate: list tags (Favorite/Top Pick) and outreach tags (Contacted/Interview scheduled/Interview completed) (see 7.4) |
| Post-interview capture | Bounded ATS surface: post-interview note + 0–5 score + outreach status only; nothing further (see 7.4) |
| AI match — JD input | Paste only (no Word/PDF upload this build) (see 7.7) |
| AI match — components | 3 merit components always on (Demonstrated Experience default 5, Domain/Technical Skills default 3); 5 preferences off by default, default 2 when added — 5-stop sliders throughout (see 7.7) |
| AI match — Demonstrated Experience | New combined component: portfolio + detailed_bio + audio/video transcripts; highest default weight; freely adjustable (see 7.7) |
| AI match — hybrid preferences | Location/Language/Availability act as hard filters, or as soft off-by-default preference components if left unfiltered (see 7.7) |
| AI match — hiring org field | JD modal captures a separate hiring-organization field for Organizational History matching (see 7.7) |
| AI match — Organizational History | Off-by-default preference, tiered same/peer/none; kept modest to avoid entrenching who-you-know hiring; placeholder does same-org only, Loop8 fills peer logic (see 7.7) |
| AI match — firm preference (Type) | One of the five off-by-default preference components, in addition to the hard Type filter (see 7.7) |
| AI match — result depth | Top 15 get a prominent score (see 7.7) |
| AI match — narrative | ~100-word per-candidate match explanation, templated placeholder this build (see 7.7) |
| Video capture input | Upload to Storage OR paste URL (both tiers, count capped); native recording P1 (see 7.5) |
| Video Q&As (naming + structure) | Renamed from "video pre-interviews". General intro (all tiers, **public**) + 5 Premium standard-question videos (gated) + Premium portfolio-attached video; all 2-min cap; attachable to portfolio items like audio (see 7.5) |
| Intro video visibility | **Public** — shown on `/site`, to anonymous browsers, and as a flip-card face; only the Premium Q&A + portfolio videos and audio testimonials are login-gated (see 7.2a) |
| Sixth flip-card face | Video Intro face (if intro exists), plays in-card with a thumbnail→modal fallback if it fights the flip animation (see 7.1) |
| Portfolio item structure | project name, role, description, results, up to 3 links, cover image + optional captioned image carousel; attachable audio + (Premium) video (see 7.2, data model) |
| Video seeding | Licensed stock clips (Pexels/Mixkit) uploaded by Benji to the Supabase video bucket, then wired into the seed — exercises the real upload path; avoids URL rot and likeness issues of random online videos |
| Video/audio login-gating | On `/profile`, Video Q&As + Audio Testimonials require a free hiring-manager account (sign-up prompt when logged out); browsing/filtering/profile text stay open (see 7.2a/7.9a) |
| Account management | User menu top-right; consultant settings + billing (history, pause/cancel/resume); hiring-manager settings + openings; operations needing real auth/Stripe are stubbed (see 7.9b) |
| Default directory sort | Randomized with a per-session seed (stable within a visit, reshuffles next visit), Premium-first on top; sort dropdown to override (Newly Added / Location / Career Level / Best Match) (see 7.1) |
| Granular public/private control | Out of scope for v1 — fixed visibility rules; per-item hide/show noted as a future enhancement (see 7.2a) |
| Expertise/skills selection | Primary/secondary tiers with caps: up to 2 primary + 4 secondary per taxonomy (12 total max); tag at category (broad) or sub-item (specific) level (see 7.14) |
| Category-tag semantics | A parent-category tag = "broad/generalist" — its own distinct signal; does NOT auto-match every sub-item in specific searches (opposite of the filter-bar parent-expand behavior) (see 7.14) |
| New taxonomy items | Candidate request → admin approval flow; no free-text "Other" (protects the controlled vocabulary) (see 7.14) |
| Taxonomy depth | Two tiers retained (category → sub-item); not three |
| Accreditations | New dedicated profile section {name, issuing org, year, credential id/url}; shown on both /profile and /site (see 7.15) |
| Flip-card faces | Up to seven: front, domain expertise, technical skills, up to 3 portfolio, video intro (domain/skills split to fit the pill count) (see 7.1) |
| Availability model | Two tracks (part-time/full-time), each status + optional from + optional until date; no calendar (see 7.16) |
| Availability freshness | `availability_updated_at` shown as "last updated" on the profile; refresh-nudge deferred (see 7.16) |
| Availability filter | Dedicated modal (engagement type + start window), not inline dropdowns (see 7.1/7.16) |
| Sidebar | None — top-right user menu → My Openings is the hiring manager's hub; no persistent left sidebar (a contextual rail inside an opening is Fable's call) |
| AI ranking persistence | Rankings run inside an opening persist (JD + weights + scores/narratives) and reappear on return; re-run optional. Ad-hoc directory rankings are transient unless saved to an opening (see 7.7) |
| "Opening" terminology | Kept as-is (considered "opportunity" etc.; decided the ATS connotation is acceptable) |
| Self-attested marker | Small "self-attested" marker shown wherever domain expertise, technical skills, and accreditations appear (cards + profile); not on headline/bio/location/availability (obviously self-provided) (see 7.14, 7.15) |
| Email visibility | Never displayed; Contact Me relay form is the only contact path (unscrapeable, still reachable) (see 7.2) |
| Async video requests | New P1 feature (below P0 core): manager sends opening's JD to up to 3 candidates for a ≤5-min "why this role" video; scaffolded, candidate notification stubbed (see 7.17) |
| Mobile | First-class target; hard interactions (flip cards, modals, sliders, carousel, tabs) tested at phone width, not just grid reflow (see Section 7 intro) |
| Career level | 3 tiers displayed with year ranges: Early Career (0–5) / Mid-Career (5–15) / Senior (15+); single-select; no "retiree" (status, not a level) (see 7.1, data model) |
| Work authorization | Free-text (~300 char), logged-in-only (hidden on /site, gated on /profile); NOT scored by AI — displayed for managers to judge (see 7.18) |
| Dev role switcher | Required: a dev-only control to switch identity (logged out / hiring manager / consultant / admin) with no credentials, for testing all states (see 7.9) |
| History sections | Split into three: Work History (max 10), Education (max 5), Additional Experience (max 5); year-level dates, flat caps (not tier-gated); replaces the old merged experience_items (see 7.2) |
| Profile tabs | Five: Overview / Experience / Portfolio / Video Q&As / Audio Testimonials (see 7.2) |
| Firm vs individual profiles | One profile type; firms hide Education, Work History, and career level, and show "years in business" (from year_founded); Portfolio covers firm track record; no separate clients section (see 7.19) |
| Small vs large firm | Defined threshold: Small = 15 or fewer people, Large = more than 15; info tooltip shown at the selector/badge (see 7.19) |
| Career level filter + firms | Career Level filter disables when filtering firms-only; no separate years-in-business filter (weak signal) (see 7.19) |
| Contracting & Work Eligibility | Renamed from "work authorization"; now covers legal contracting vehicle (LLC etc.) + right-to-work, for individuals and firms; free-text, logged-in-only, not scored (see 7.18) |
| Verification / vetting | Badge + 3-outcome admin approval (rejected / approved-Standard / verified-Premium); NOT a hard join-gate (avoids pedigree bias); can harden later (see 7.20) |
| Verified ↔ Premium | Coupled in logic (premium = apply + pass vetting), separate in schema (verification_status vs is_premium); filter labeled "Verified only" (see 7.20) |
| Verification evidence | 1–3 file uploads + explanations; payslips/letters = most sensitive data in app; storage STUBBED and flagged hard for developer (see 7.20) |
| Audio testimonial fields | Reference name, org, job title, relationship, date (month/year), optional verification link (to referee's institutional bio), audio, optional transcript (see 7.6) |
| Transcripts | Optional plain-text transcript on videos and audio testimonials; feeds Demonstrated Experience matching (see 7.5, 7.6) |
| Tier matrix | Standard 1 video / 1 audio / 3 portfolio / 2 links; Premium 10 / 10 / 10 / 5 + custom domain + featured. Card shows 3 portfolio for both (see 7.8) |
| Personal website + social links | Website as name+URL (name defaults to "Personal website"); social links tier-capped (2/5) from a fixed platform list + Other, URL-validated per platform, Lucide icons (see 7.13) |

---

## 13. Definition of Done (this build)

- [ ] Directory browses, filters, and searches (both modes) against real Supabase data with seeded individual and firm profiles, including Sector Experience logos on card fronts.
- [ ] The `/about` page is live and explains the platform for both personas, with a working "Join MavenScout" CTA; the same CTA appears in global navigation on every page and routes into the signup/onboarding flow.
- [ ] `/profile/:handle` renders Video Q&As and Audio Testimonials as distinct tabs, both login-gated (sign-up prompt when logged out); `/site/:handle` renders the same profile with availability and both tabs hidden.
- [ ] Mocked login lets a demo Hiring Manager and demo Consultant reach their respective role-appropriate flows.
- [ ] Flip cards cycle through up to six faces (front, skills/expertise, up to 3 portfolio items, and a Video Intro face when an intro exists); the intro plays in-card (or via thumbnail→modal fallback). Directory default load is a seeded shuffle with Premium first; the sort dropdown overrides (Newly Added / Location / Career Level / Best Match after ranking).
- [ ] Anonymous visitors can browse/filter/search, read full profile text, and watch the general intro video; but the Premium Q&A videos, Audio Testimonials, saving, openings, and AI ranking each show a sign-up prompt until logged in (7.9a).
- [ ] A consultant can complete onboarding including a general intro video (upload OR URL), and — as Premium — up to 5 standard-question videos and a portfolio-attached video, each rejected if over 2 minutes; plus domain expertise & technical skills as primary/secondary within the caps (at category or sub-item level), accreditations, portfolio items with project name/role/description/results/up-to-3-links/cover image/captioned carousel, work history / education / additional-experience entries (work history with a logo URL), a personal website (name + URL), and social/account links within their tier cap (validated per platform).
- [ ] A logged-in user sees a top-right user menu with role-appropriate items; consultant account/billing pages (incl. pause/cancel/resume) and hiring-manager openings/account pages are reachable (operations needing real auth/Stripe clearly stubbed).
- [ ] A candidate can request a testimonial (tokenised link + email template, optional portfolio attachment); a reference can submit audio at `/testimonial/:token` to Supabase Storage; the candidate can alternatively upload audio directly.
- [ ] Testimonials appear in the Audio Testimonials tab and play in-app; portfolio-attached ones also embed on their portfolio item; the candidate can publish and the admin can remove them.
- [ ] A (mocked) hiring manager can create an opening, quick-save and shortlist candidates across long/short lists, apply both list and outreach tags independently, add attributed notes + 0–5 scores and a post-interview note + score, and see team averages/rankings.
- [ ] Sharing works two-tier: a read-only link opens without an account; adding notes/scores requires a granted reviewer (mocked), with input controls disabled for non-reviewers.
- [ ] The billing page displays both tiers correctly; toggling `is_premium` visibly changes the profile's badge, sort position, and all tier caps (videos, audio, portfolio total, social links, custom-domain availability).
- [ ] The "Rank by Job Description" modal accepts JD text + a hiring-organization field, exposes the 3 always-on merit components and 5 addable preferences on 5-stop sliders, runs the placeholder scorer, and displays the top 15 with scores, component breakdowns, and a ~100-word narrative — within the currently filtered/searched pool.
- [ ] Admin (open route) can approve/reject profiles, moderate/remove testimonials, and edit taxonomy.
