export interface IndexFragment {
  fragmentId: string
  profileId: string
  type: string
  text: string
  vector: number[]
  textHash?: string
  modelVersion?: string
  metadata?: Record<string, unknown>
}

export interface IndexArtifact {
  modelVersion: string
  indexVersion: string
  dimensions: number
  fragments: IndexFragment[]
}

const bad = (reason: string): Error => new Error(`invalid_index: ${reason}`)

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== ''

export function loadIndexArtifact(raw: string): IndexArtifact {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw bad('not valid JSON')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw bad('not an object')
  const o = data as Record<string, unknown>
  const modelVersion = o.modelVersion ?? o.model_version
  const indexVersion = o.indexVersion ?? o.index_version
  if (!nonEmpty(modelVersion)) throw bad('modelVersion')
  if (!nonEmpty(indexVersion)) throw bad('indexVersion')
  const dimensions = o.dimensions
  if (typeof dimensions !== 'number' || !Number.isInteger(dimensions) || dimensions <= 0) {
    throw bad('dimensions')
  }
  if (!Array.isArray(o.fragments) || o.fragments.length === 0) throw bad('fragments')
  const seen = new Set<string>()
  const fragments: IndexFragment[] = []
  for (const item of o.fragments as unknown[]) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw bad('fragment')
    const f = item as Record<string, unknown>
    const fragmentId = f.fragmentId ?? f.fragment_id
    const profileId = f.profileId ?? f.profile_id
    const type = nonEmpty(f.type) ? f.type : f.fragment_type
    if (!nonEmpty(fragmentId)) throw bad('fragmentId')
    if (!nonEmpty(profileId)) throw bad(`profileId in ${fragmentId}`)
    if (!nonEmpty(f.text)) throw bad(`text in ${fragmentId}`)
    if (!nonEmpty(type)) throw bad(`type in ${fragmentId}`)
    const textHash = f.textHash ?? f.text_hash
    const fragModel = f.modelVersion ?? f.model_version
    if (textHash !== undefined && typeof textHash !== 'string') throw bad(`textHash in ${fragmentId}`)
    if (fragModel !== undefined && typeof fragModel !== 'string') throw bad(`modelVersion in ${fragmentId}`)
    if (fragModel !== undefined && fragModel !== modelVersion) throw bad('mixed model versions')
    const v = f.vector
    if (!Array.isArray(v) || v.length !== dimensions) throw bad(`vector length in ${fragmentId}`)
    if (!v.every((x) => typeof x === 'number' && Number.isFinite(x))) {
      throw bad(`vector values in ${fragmentId}`)
    }
    if (seen.has(fragmentId)) throw bad(`duplicate fragmentId ${fragmentId}`)
    seen.add(fragmentId)
    const out: IndexFragment = {
      fragmentId,
      profileId,
      type,
      text: f.text,
      vector: v as number[],
    }
    if (textHash !== undefined) out.textHash = textHash
    if (fragModel !== undefined) out.modelVersion = fragModel
    if (typeof f.metadata === 'object' && f.metadata !== null && !Array.isArray(f.metadata)) {
      out.metadata = f.metadata as Record<string, unknown>
    }
    fragments.push(out)
  }
  return { modelVersion, indexVersion, dimensions, fragments }
}
