import test from 'node:test'
import assert from 'node:assert/strict'
import { loadIndexArtifact } from '../src/search/artifact'

const frag = (o: Record<string, unknown> = {}) => ({
  fragmentId: 'f1',
  profileId: 'p1',
  type: 'bio',
  text: 'hello',
  vector: [1, 0],
  ...o,
})
const art = (o: Record<string, unknown> = {}) => ({
  modelVersion: 'titan-v2',
  indexVersion: 'i1',
  dimensions: 2,
  fragments: [frag()],
  ...o,
})
const load = (o: unknown) => loadIndexArtifact(JSON.stringify(o))

test('valid artifact loads', () => {
  const a = load(art({ fragments: [frag(), frag({ fragmentId: 'f2', metadata: { k: 1 } })] }))
  assert.equal(a.fragments.length, 2)
  assert.equal(a.dimensions, 2)
  assert.equal(a.fragments[0].type, 'bio')
})

test('fragment_type is accepted as an alias for type', () => {
  const f: Record<string, unknown> = frag()
  delete f.type
  const a = load(art({ fragments: [{ ...f, fragment_type: 'portfolio' }] }))
  assert.equal(a.fragments[0].type, 'portfolio')
})

test('invalid artifacts throw invalid_index', () => {
  const noType: Record<string, unknown> = frag()
  delete noType.type
  const cases: unknown[] = [
    'not json{',
    [],
    null,
    art({ modelVersion: '' }),
    art({ indexVersion: 3 }),
    art({ dimensions: 0 }),
    art({ dimensions: 1.5 }),
    art({ fragments: [] }),
    art({ fragments: 'x' }),
    art({ fragments: [frag({ fragmentId: '' })] }),
    art({ fragments: [frag({ profileId: 1 })] }),
    art({ fragments: [frag({ text: '' })] }),
    art({ fragments: [noType] }),
    art({ fragments: [frag({ vector: [1] })] }),
    art({ fragments: [frag({ vector: [1, null] })] }),
    art({ fragments: [frag({ vector: [1, 'a'] })] }),
    art({ fragments: [frag(), frag({ vector: [0, 1] })] }),
  ]
  for (const c of cases) {
    assert.throws(
      () => loadIndexArtifact(typeof c === 'string' ? c : JSON.stringify(c)),
      /^Error: invalid_index: /,
    )
  }
})

test('non-finite vector values are rejected', () => {
  const raw = JSON.stringify(art()).replace('[1,0]', '[1,1e999]')
  assert.throws(() => loadIndexArtifact(raw), /invalid_index/)
})

test('a snake_case artifact loads to the same shape', () => {
  const a = load({
    model_version: 'titan-v2',
    index_version: 'i1',
    dimensions: 2,
    fragments: [
      { fragment_id: 'f1', profile_id: 'p1', fragment_type: 'bio', text: 'hello', vector: [1, 0], text_hash: 'h1', model_version: 'titan-v2' },
    ],
  })
  assert.deepEqual(a, {
    modelVersion: 'titan-v2',
    indexVersion: 'i1',
    dimensions: 2,
    fragments: [
      { fragmentId: 'f1', profileId: 'p1', type: 'bio', text: 'hello', vector: [1, 0], textHash: 'h1', modelVersion: 'titan-v2' },
    ],
  })
})

test('a fragment model version that differs from the artifact throws', () => {
  assert.throws(() => load(art({ fragments: [frag({ modelVersion: 'other' })] })), /invalid_index: mixed model versions/)
  assert.throws(() => load(art({ fragments: [frag({ model_version: 'other' })] })), /invalid_index: mixed model versions/)
})
