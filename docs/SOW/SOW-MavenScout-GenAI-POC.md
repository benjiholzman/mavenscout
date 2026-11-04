# Statement of Work: MavenScout GenAI POC (scope extract)

| | |
|---|---|
| Customer | MavenScout |
| Project | MavenScout GenAI POC |
| Service provider | Loop8 LLC |
| SOW version | 1.0, dated April 24, 2026 |
| Signed | Customer 6/26/2026, Loop8 4/24/2026 |
| Funding | AWS Select Tier Partner program |

This is a working extract of the **scope sections** of the signed SOW, transcribed for engineering
reference. Commercial and legal sections (fees, funding contingency, payment, acceptance terms,
IP, confidentiality, warranties, liability, governing law) are deliberately omitted because this
repository is public. The signed PDF is the authoritative document and is held by the Loop8 project
manager. Where this extract and the signed PDF differ, the PDF wins.

Section numbers below match the signed SOW.

## 1. Executive summary

MavenScout is a curated recruitment marketplace purpose-built for the international development
sector. Unlike general freelance platforms, MavenScout maintains a capped, pre-vetted pool of
specialized consultants and connects them with hiring managers seeking niche expertise for
short-term knowledge work.

This SOW covers the AI layer of the platform: (1) extracting structured requirements from a job
description and matching them against candidate profiles to generate ranked results, and (2)
producing transparent confidence scores that explain why each candidate ranked where they did.

## 2. Architecture

The signed SOW contains an architecture diagram (image only, not transcribed here). The
architecture is confirmed as part of Phase 1 (Discovery and Technical Assessment).

## 3. Scope of work

**Objective: Discovery and Technical Assessment**

- Audit the existing MavenScout codebase to understand the current state of candidate profile data
  structure and any existing matching logic.
- Define the candidate profile schema: the fields that feed the matching engine (skills, sector
  experience, geographic focus, language, education, and portfolio).
- Define job description parsing requirements: what structured data points need to be extracted
  from an unstructured posting.
- Confirm architecture and LLM/AI service selections for the matching engine and conversational
  agent.

**Objective: Job Description Parsing and Candidate Matching Engine**

- Build an ingestion module that extracts structured requirements from free-text input: skills,
  domain expertise, geography, seniority, language, and assignment type.
- Generate vector embeddings for all candidate profiles and store them in a vector database.
- Implement the matching engine that performs semantic comparison between the parsed descriptions
  and candidate embeddings, returning a ranked list.
- Surface ranked results in the existing flip card UI.

**Objective: Confidence Scoring and Explainability**

- Develop a multi-dimensional scoring model breaking the overall match percentage into component
  scores: technical skills, domain expertise, sector and geographic relevance, and seniority
  alignment.
- Display the component breakdown alongside the overall confidence score on each candidate card.
- Generate a plain-language narrative explaining each candidate's ranking position.

## 4. Deliverables

- Technical assessment report
- Parsing module that extracts structured requirements from free-text job descriptions
- Candidate matching engine with vector embeddings and ranked results surfaced in the flip card UI
- Multi-dimensional confidence scoring model with component breakdown and plain-language ranking
  rationale
- Codebase

## 5. Success criteria

- A hiring manager can upload or paste a job description and receive a ranked candidate shortlist.
- Each result displays a confidence score with a multi-dimensional breakdown (technical skills,
  domain expertise, sector and geographic relevance) so the hiring manager understands what is
  driving the match.
- The system provides a plain-language narrative explaining why a candidate ranked where they did.

## 6. Assumptions

- A candidate profile dataset of sufficient size will be available for testing. If the live pool
  is not yet populated, a synthetic dataset will be created for POC purposes.
- Client provides access to the existing codebase and relevant API credentials at the start of the
  engagement.

## 7. Out of scope

- Candidate-facing features. Matching and chat are hiring manager tools only.
- Pre-recorded asynchronous video screening infrastructure.
- Shortlisting and candidate saving features.
- Mobile and tablet optimization.
- Integration with external ATS or HR platforms.

## 8. Timeline

| Phase | Duration | Description |
|---|---|---|
| Phase 1 | Week 1 | Discovery and Technical Assessment |
| Phase 2 | Week 2 | Job Description Parsing and Candidate Matching Engine |
| Phase 3 | Week 3 | Confidence Scoring and Explainability |

## 9. Deliverables clarification

This is a Proof of Concept engagement. The purpose is to demonstrate technical feasibility and
validate approach, not to deliver production-ready assets.

**What the customer will receive:**

1. Documentation: findings summary, architecture overview, and recommendations document.
2. POC testing environment: temporary access to a working demonstration environment for evaluation
   purposes (30 days post-demo).
3. Demo walkthrough: live demonstration of POC functionality with customer stakeholders.

**What the customer will not receive:**

1. No Infrastructure-as-Code (Terraform, CloudFormation, CDK, etc.).
2. No CI/CD pipelines or deployment automation.
3. No production-ready configurations or templates.

A production implementation following a successful POC requires a separate production SOW.

## 10. Customer responsibilities

1. Designate a primary point of contact with decision-making authority.
2. Provide required sample data and system access within 3 business days of kickoff.
3. Make stakeholders available for scheduled meetings and the demo session.
4. Provide timely feedback within the testing/evaluation window.
5. Ensure any required internal approvals are obtained prior to kickoff.
6. Provide written sign-off upon project completion or termination.

## 13. POC environment and data

1. **Environment:** Loop8 will provision a POC environment in AWS in the customer's AWS account.
   This environment is temporary and will be decommissioned thirty (30) days after the demo unless
   otherwise agreed.
2. **Data:** Any customer data used in the POC remains the customer's property.
3. **Cost responsibility:** The customer is responsible for any cost incurred for this POC on AWS.

## 19. Term (summary)

The SOW runs from the date of last signature until completion of the POC or thirty (30) days from
kickoff, whichever occurs first. Work beyond the defined scope is quoted separately and requires
written approval before it starts.
