// Stage 1 index types (issue #20, match-rework spec section 5, architecture
// blueprint Stage 1).
//
// A Fragment is one piece of capability evidence from a profile, embedded on
// its own so the worker can keep the best fragment of each candidate. The
// fragment set is capability evidence only: location, language, availability
// and career level are never fragments (Fit judges capability only, brief Fit
// rule); they ride as metadata for the Must have pre-filter and Stage 2.
//
// Transcripts (video Q&A, audio testimonials) are never indexed
// (profiles-membership section 11). FragmentSource has no field for them, so
// they cannot enter the index by construction.

/** The kinds of capability evidence that become fragments. */
export type FragmentType =
  | 'tagline'
  | 'bio'
  | 'portfolio'
  | 'work_history'
  | 'education'
  | 'additional_experience'
  | 'credential'
  | 'expertise_tags'

/** Profile metadata carried on every fragment of a profile. Used by the Must
 *  have pre-filter and Stage 2, never embedded. Availability is passed through
 *  as stored; its exact shape is the app's AvailabilityFilter concern. */
export interface FragmentMetadata {
  location: string | null
  languages: string[]
  expertiseTags: string[]
  careerLevel: string | null
  availability: unknown | null
  /** The employer or project organization of this one fragment, when its
   *  source entry has one (work history, portfolio, additional experience).
   *  Kept here, never in the embedded text, so an employer name cannot score
   *  in Fit (loop8/CLAUDE.md section 3.5; embedding contract point 2). The
   *  query side strips org names from the job description for the same reason. */
  organization?: string | null
}

/** The decoupled input to fragmentation. Both the demo seed and the canonical
 *  DB Profile map to this, so the fragmenter stays production faithful without
 *  depending on either concrete shape. Only capability evidence is present. */
export interface FragmentSource {
  profileId: string
  tagline: string | null
  bio: string | null
  portfolio: PortfolioEvidence[]
  workHistory: RoleEvidence[]
  education: EducationEvidence[]
  additionalExperience: RoleEvidence[]
  credentials: CredentialEvidence[]
  /** Every expertise tag name (all tiers), read as one text fragment. */
  expertiseTags: string[]
  metadata: FragmentMetadata
}

export interface PortfolioEvidence {
  id: string | null
  projectName: string
  role: string
  description: string
  results: string | null
  organization: string | null
}

export interface RoleEvidence {
  /** Stable entry id when the source has one; otherwise the fragmenter falls
   *  back to the ordinal, so a fragment id stays stable across runs. */
  id: string | null
  role: string
  organization: string | null
  description: string | null
}

export interface EducationEvidence {
  id: string | null
  degreeOrCourse: string
  institution: string
}

export interface CredentialEvidence {
  id: string | null
  name: string
  issuingOrganization: string | null
}

/** One fragment before embedding. */
export interface Fragment {
  /** Stable: `${profileId}#${type}#${entryId ?? ordinal}`. */
  fragmentId: string
  profileId: string
  type: FragmentType
  text: string
  /** sha256 of `text`, hex. Re-embed only when this changes. */
  textHash: string
  metadata: FragmentMetadata
}

/** A fragment with its Titan vector. The artifact is a list of these plus the
 *  model and index versions, so a run can prove which space it used. */
export interface EmbeddedFragment extends Fragment {
  vector: number[]
}

export interface IndexArtifact {
  modelVersion: string
  indexVersion: string
  dimensions: number
  metric: 'cosine'
  builtAt: string
  fragments: EmbeddedFragment[]
}
