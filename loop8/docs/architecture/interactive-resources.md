# MavenScout Engine Blueprint: Interactive Resources

| | |
|---|---|
| Status | Living catalog |
| Phase | P1 |
| Task | Catalog of the interactive web resources for the ranking engine design |
| Owner | Guillermo Sandoval |
| Date | 2026-11-13 |
| Sources | `loop8/docs/architecture/index.html`, the draw.io diagrams in `loop8/docs/architecture/diagrams/`, `loop8/docs/best-practices/documentation-generation.md` |

This catalog lists the interactive web resource produced alongside the ranking engine design. It is not a deliverable and it is not part of the approved scope. It is a visual aid to explain and review the design inside Loop8. The page has a language toggle (EN and ES) at the top of its side menu. Use it to switch language instead of keeping one link per language.

## Resource

| Resource | What it shows |
|---|---|
| [MavenScout Engine Blueprint](https://claude.ai/artifact/UGqqnhgTXYEByxGba8aJqN) | The engine design in eleven sections, in four groups. **Understand:** start here, what the engine must do (the fixed rules, what the customer asked for on 2026-11-12, the quality targets and the AWS account status), and the scoring math. **Design:** the architecture, the request lifecycle and failures, and the pipeline inside a job. **Cost:** the technology choices and the cost per operation. **Decide:** the risks and open decisions, how to start (fifteen steps, each with its proof), and how we know (what was checked and what was not). The language models are settings of the engine, not fixed choices, so the page names roles and shows Claude prices only as a reference |

## Companion files

| File | What it is |
|---|---|
| [index.html](index.html) | The source of the published page. The published page is this same file |
| [diagrams/](diagrams/) | The draw.io sources of the five diagrams, in English and Spanish |
| [img/](img/) | The PNG exports of those diagrams, which the page shows |

## Versions

| Page version | Date | What changed |
|---|---|---|
| 3 | 2026-11-09 | First published version. A design proposal before any code, with Claude Haiku 5.5 and Sonnet 5.5 as the recommended models and pgvector as the documented fallback |
| 4 | 2026-11-13 | The models become settings by role. Added what the customer asked for on 2026-11-12. The AWS account status now includes the GPT-6 line. OpenSearch Serverless is the chosen vector database. The cost section is rebuilt around reference prices, because the prices of the models in use are not published. The architecture, pipeline and funnel diagrams are updated |

## How to keep it in sync

1. Edit `index.html` in this folder. It is the source of the published page.
2. Edit a diagram in draw.io (`diagrams/<name>.drawio`) and export it to PNG with the draw.io command line: `drawio -x -f png -s 2 -b 10 -o img/<name>.png diagrams/<name>.drawio`.
3. Publish the same file to the same address with the Artifact tool, together with the images that changed, so the link does not change.
4. When a statement on the page changes, change the matching document in the same pull request, for example `docs/planning/PROJECT_PLAN.md`.

## How to use it

The page does not replace the formal documentation in `loop8/docs/`. The technical assessment report (`docs/reports/technical-assessment.md`) is the SOW deliverable and the delivery plan is `docs/planning/PROJECT_PLAN.md`. The page is a proposal for the team to challenge, and every statement on it carries a mark that says how sure it is. When the page and those documents differ, the documents win.

The page is internal. The link opens inside the Loop8 organization, and people outside it need an invitation. Nothing is sent to the customer without the project manager.
