# Documentation Generation

| | |
|---|---|
| Status | Active |
| Phase | All |
| Task | Documentation rules |
| Owner | Guillermo Sandoval |
| Date | 2026-11-09 |
| Sources | Loop8 documentation practices |

Rules for every document written for this project: markdown docs, plans, runbooks, handoffs, and the web pages that serve as documentation. They apply to anything that goes into this repository or is shared with the client.

## 1. Language

1. Write all project documentation in English.
2. Write it the way a person would explain it to another person across a desk: simple, direct, and complete. Say what happened, why it matters, and what comes next.
3. Do not use analogies or metaphors. Explain the thing itself, in plain words, with concrete examples from this project (real resource names, real values where they are not secret).
4. Prefer short sentences. If a technical term is needed, use it and explain it once, the first time it appears. Do not stack jargon.
5. Be honest about what is unknown, not yet validated, or still waiting on a decision. Say so plainly instead of softening it.

## 2. Punctuation and formatting

1. Never use em dashes, en dashes, or double hyphens as punctuation. Rewrite the sentence with a period, a comma, a colon, or parentheses. The only place double hyphens are allowed is inside code blocks and inline code, for command line flags (for example `--stack-name`).
2. Do not use hyphen bullet lists in narrative documents. Use short paragraphs or numbered lists. Tables are fine where a table is the clearest form.
3. Every document opens with a small metadata block: status, phase, task, owner, date, and sources.
4. Never include secret values. Names of keys, files, and resources only.

## 3. Plans

When a plan is created for a task, make it easy to follow without prior context. A plan covers, in this order:

1. What the task is for, and what depends on it.
2. What the design already decided, with a pointer to the document that decided it.
3. What will be built or changed.
4. Assumptions, stated explicitly, so they can be confirmed or corrected.
5. Impact analysis: what else this touches and what could go wrong.
6. Acceptance criteria that can be checked.
7. The remaining steps, in order, including approvals needed.

A plan is written before the work starts. A build document (the record of what was actually done and validated) is written after the step is verified, next to the plan.

## 4. Diagrams with draw.io

1. Use diagrams when a picture explains the thing faster than text does: account structure, network layout, request flow, pipelines.
2. Create them with draw.io, but only when it is installed locally. Check first (`which drawio` or `ls /Applications/draw.io.app`). If it is not installed, leave the diagram out and recommend installing it (`brew install --cask drawio`). Do not substitute another diagramming tool.
3. Keep the editable `.drawio` source and the exported `.png` together in a `diagrams/` folder next to the document. Export with:

   ```bash
   drawio -x -f png -s 2 -o diagrams/<name>.png diagrams/<name>.drawio
   ```

4. Reference the exported image from the markdown document, with a one line caption that says what the reader should notice.
5. Keep each diagram to one idea. Use the same colors for the same kinds of things across all diagrams (for example one color for compute, one for data, one for networking, one for external services).

## 5. Web pages that serve as documentation

When documentation is delivered as a web page, build it in the same style as the reference example: <https://claude.ai/artifact/Lyb3qy6w8LxNYXvWjNYheG?sk=3Jq9F6TP4bBTDn_bBMLFUQ#empezar>

What that example does, and what new pages should repeat:

1. **One self contained HTML page.** Everything inline, published with the Artifact tool (private by default). Keep it well under the 16 MB limit, which matters because diagram images are embedded.
2. **Layout.** A fixed menu on the left, one section at a time on the right, and a single column on narrow screens (the menu moves to the top and scrolls sideways). Sections are reachable by an anchor in the address (for example `#empezar`), the page remembers the section in the URL, and each section has a "Copy link to this section" button.
3. **Menu.** Sections are numbered and grouped under short headings that follow the reader's questions (for example Understand, How it works, Changes and open points). The first section is always "Start here". A previous and next link closes each section.
4. **Start here section.** It states the question the page answers, the principle that was followed, a short answer (often a small table), how to read any marks or colors used in the diagrams, and the example case used throughout.
5. **Each section leads with its diagram.** The diagram comes first and the explanation goes underneath. Diagrams are PNG exports from draw.io, clickable to open full size in a viewer that can be scrolled and closed, with a caption.
6. **Building blocks.** Numbered step cards, a highlighted example callout, a dashed note for caveats, tables, code blocks with a labeled header, and short status pills (for example exists, extends, new, to confirm).
7. **Closing sections.** One section for what changes and why, and one for what is still to be confirmed.
8. **Visual style.** A calm slate palette with a single amber accent, defined as color tokens at the top of the stylesheet. It has a light and a dark theme, follows the viewer's system setting, and keeps text readable in both. Monospace type for labels, numbers, and code. Respect reduced motion preferences. Visible focus outlines.
9. **Example data.** When a page walks through an example, real names (tables, functions, resources) are used and invented values are clearly labeled as invented.
10. **Languages.** English only by default. Add a language toggle only when a Spanish version is explicitly requested.

Before writing a new page, load the `artifact-design` skill so the page follows the Artifact contract (title, theme tokens, allowed libraries, layout at phone width). Keep the HTML source file next to the related markdown in the matching folder under `loop8/docs/` so it is versioned, and add the published link to the markdown document.

## 6. Where documentation lives

1. Everything Loop8 writes for this project lives under `loop8/docs/`, in the folder that matches its kind: `sow/`, `planning/`, `architecture/`, `client-proposal/`, `reports/`, `runbooks/`, `handoffs/`.
2. A diagram lives in a `diagrams/` folder next to the document that uses it.
3. Internal material (work hours, project context, session notes) lives in `loop8/internal/`, which is gitignored. It is never described in committed documents.
4. The customer's own documents stay in `docs/` and are not edited by Loop8 except for a link in `docs/README.md` when needed.
5. When a document is added, update the index in `loop8/README.md`.
