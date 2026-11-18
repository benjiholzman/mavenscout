import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRankRequest } from '../src/shared/validate'
import { DEFAULT_LIMITS } from '../src/shared/limits'

const L = DEFAULT_LIMITS
const body = (o: unknown) => JSON.stringify(o)
const good = { jobDescriptionId: 'jd1', requirements: [], poolIds: ['b', 'a'] }

test('valid request is accepted with sorted ids', () => {
  const r = validateRankRequest(body({ ...good, managerId: 'm1' }), L)
  assert.ok(r.ok)
  if (r.ok) {
    assert.deepEqual(r.value.poolIds, ['a', 'b'])
    assert.equal(r.value.managerId, 'm1')
  }
})

test('jdText is accepted and carried through', () => {
  const r = validateRankRequest(body({ ...good, jdText: 'Evaluate health programs' }), L)
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.value.jdText, 'Evaluate health programs')
})

test('jdText is absent from the result when not sent', () => {
  const r = validateRankRequest(body(good), L)
  assert.ok(r.ok)
  if (r.ok) assert.equal('jdText' in r.value, false)
})

test('jdText must be a non-empty string of at most 15000 chars', () => {
  for (const bad of ['', 5, null, ['x'], 'a'.repeat(15001)]) {
    const r = validateRankRequest(body({ ...good, jdText: bad }), { ...L, maxBodyBytes: 100000 })
    assert.deepEqual(r, { ok: false, status: 400, error: 'invalid_input' })
  }
  const ok = validateRankRequest(body({ ...good, jdText: 'a'.repeat(15000) }), { ...L, maxBodyBytes: 100000 })
  assert.ok(ok.ok)
})

test('body over maxBodyBytes gives 413 body_too_large', () => {
  const r = validateRankRequest(body(good), { ...L, maxBodyBytes: 10 })
  assert.deepEqual(r, { ok: false, status: 413, error: 'body_too_large' })
})

test('body size is measured in bytes, not characters', () => {
  const raw = body({ ...good, jobDescriptionId: 'ééééé' })
  const r = validateRankRequest(raw, { ...L, maxBodyBytes: raw.length })
  assert.equal(r.ok, false)
})

test('invalid inputs give 400 invalid_input', () => {
  const bad: Array<string | null> = [
    null,
    'not json',
    '[]',
    'null',
    body({ requirements: [], poolIds: [] }),
    body({ ...good, jobDescriptionId: '' }),
    body({ ...good, requirements: 'x' }),
    body({ ...good, poolIds: 'x' }),
    body({ ...good, poolIds: ['a', 1] }),
    body({ ...good, poolIds: ['a', ''] }),
    body({ ...good, managerId: 5 }),
  ]
  for (const raw of bad) {
    assert.deepEqual(validateRankRequest(raw, L), { ok: false, status: 400, error: 'invalid_input' }, String(raw))
  }
})

test('too many ids or requirements give 400 invalid_input', () => {
  const lim = { ...L, maxPoolIds: 2, maxRequirements: 1 }
  assert.equal(validateRankRequest(body({ ...good, poolIds: ['a', 'b', 'c'] }), lim).ok, false)
  assert.equal(validateRankRequest(body({ ...good, requirements: [{}, {}] }), lim).ok, false)
  assert.equal(validateRankRequest(body({ ...good, poolIds: ['a', 'b'], requirements: [{}] }), lim).ok, true)
})

test('duplicate ids are de-duplicated, not rejected, and count after de-duplication', () => {
  const lim = { ...L, maxPoolIds: 2 }
  const r = validateRankRequest(body({ ...good, poolIds: ['b', 'a', 'b', 'a', 'b'] }), lim)
  assert.ok(r.ok)
  if (r.ok) assert.deepEqual(r.value.poolIds, ['a', 'b'])
})

test('whitespace only jdText is invalid', () => {
  const r = validateRankRequest(body({ ...good, jdText: '   \n ' }), L)
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'invalid_input')
})
