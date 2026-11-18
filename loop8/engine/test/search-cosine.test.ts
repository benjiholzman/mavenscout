import test from 'node:test'
import assert from 'node:assert/strict'
import { cosine, searchPool } from '../src/search/cosine'
import type { IndexArtifact, IndexFragment } from '../src/search/artifact'

const f = (fragmentId: string, profileId: string, vector: number[]): IndexFragment => ({
  fragmentId,
  profileId,
  type: 'bio',
  text: fragmentId,
  vector,
})
const art = (fragments: IndexFragment[]): IndexArtifact => ({
  modelVersion: 'm',
  indexVersion: 'i',
  dimensions: 2,
  fragments,
})
const opts = { threshold: null, cap: 10, topFragments: 5 }

test('cosine basics', () => {
  assert.equal(cosine([1, 0], [1, 0]), 1)
  assert.equal(cosine([1, 0], [0, 1]), 0)
  assert.ok(Math.abs(cosine([1, 1], [2, 2]) - 1) < 1e-12)
  assert.ok(cosine([1, -1], [-1, 1]) < -0.99)
})

test('cosine with a zero vector is 0', () => {
  assert.equal(cosine([0, 0], [1, 1]), 0)
  assert.equal(cosine([1, 1], [0, 0]), 0)
})

test('only pool profiles are searched, best fragment per profile', () => {
  const a = art([f('a1', 'A', [0, 1]), f('a2', 'A', [1, 0]), f('b1', 'B', [1, 0]), f('c1', 'C', [1, 0])])
  const r = searchPool([1, 0], a, ['A', 'B'], opts)
  assert.deepEqual(r.shortlist.map((c) => c.profileId), ['A', 'B'])
  assert.equal(r.shortlist[0].similarity, 1)
  assert.deepEqual(r.shortlist[0].topFragments.map((t) => t.fragment.fragmentId), ['a2', 'a1'])
  assert.deepEqual(r.notIndexed, [])
})

test('topFragments limited to 5, ties by fragmentId; candidate ties by profileId', () => {
  const frags = ['g', 'f', 'e', 'd', 'c', 'b', 'a'].map((id) => f(id, 'A', [1, 0]))
  const a = art([...frags, f('z', 'B', [1, 0])])
  const r = searchPool([1, 0], a, ['B', 'A'], opts)
  assert.deepEqual(r.shortlist.map((c) => c.profileId), ['A', 'B'])
  assert.deepEqual(r.shortlist[0].topFragments.map((t) => t.fragment.fragmentId), ['a', 'b', 'c', 'd', 'e'])
})

test('notIndexed lists pool ids without fragments, sorted', () => {
  const a = art([f('a1', 'A', [1, 0])])
  const r = searchPool([1, 0], a, ['Z', 'A', 'M'], opts)
  assert.deepEqual(r.notIndexed, ['M', 'Z'])
})

test('threshold null keeps everyone; threshold is inclusive', () => {
  const a = art([f('a1', 'A', [1, 0]), f('b1', 'B', [0, 1])])
  const all = searchPool([1, 0], a, ['A', 'B'], opts)
  assert.equal(all.shortlist.length, 2)
  const t = searchPool([1, 0], a, ['A', 'B'], { ...opts, threshold: 1 })
  assert.deepEqual(t.shortlist.map((c) => c.profileId), ['A'])
  assert.deepEqual(t.below.map((c) => c.profileId), ['B'])
  assert.equal(t.capHit, false)
})

test('cap cuts qualifying candidates and sets capHit', () => {
  const a = art([f('a1', 'A', [1, 0]), f('b1', 'B', [1, 0.1]), f('c1', 'C', [1, 0.2])])
  const r = searchPool([1, 0], a, ['A', 'B', 'C'], { ...opts, cap: 2 })
  assert.deepEqual(r.shortlist.map((c) => c.profileId), ['A', 'B'])
  assert.deepEqual(r.below.map((c) => c.profileId), ['C'])
  assert.equal(r.capHit, true)
  const exact = searchPool([1, 0], a, ['A', 'B', 'C'], { ...opts, cap: 3 })
  assert.equal(exact.capHit, false)
})
