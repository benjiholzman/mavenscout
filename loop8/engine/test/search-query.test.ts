import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQueryText, exclusionsFromRequirements, isCaseSensitiveTerm, mergeExclusions } from '../src/search/query'
import type { Requirement } from '../../../src/lib/matching/types'

test('without exclusions only whitespace is collapsed', () => {
  assert.equal(buildQueryText('  a \n\n b\t c  '), 'a b c')
  assert.equal(buildQueryText('a  b', {}), 'a b')
})

test('excluded terms are removed case-insensitively as whole phrases', () => {
  const out = buildQueryText('Work with the World Bank in Kenya, speaking French.', {
    orgNames: ['world bank'],
    places: ['kenya'],
    languages: ['french'],
  })
  assert.equal(out, 'Work with the in , speaking .')
})

test('isCaseSensitiveTerm is true when a capital follows the first character', () => {
  for (const t of ['WHO', 'CARE', 'PATH', 'GAIN', 'CoST', 'UN', 'IBRD', 'UN Women', ' WHO ']) {
    assert.equal(isCaseSensitiveTerm(t), true, t)
  }
  for (const t of ['World Bank', 'Pact', 'Kenya', 'unicef', 'a', '']) assert.equal(isCaseSensitiveTerm(t), false, t)
})

test('who, care and reach stay in ordinary text when WHO, CARE and REACH are excluded', () => {
  const text = 'Who will lead primary care and reach rural areas? Work with WHO, CARE and REACH. Reach out.'
  const out = buildQueryText(text, { orgNames: ['WHO', 'CARE', 'REACH'] })
  assert.equal(out, 'Who will lead primary care and reach rural areas? Work with , and . Reach out.')
})

test('a mixed-case term is removed only with its exact case', () => {
  assert.equal(buildQueryText('CoST data, cost data, COST data', { orgNames: ['CoST'] }), 'data, cost data, COST data')
})

test('longer terms are removed first', () => {
  const out = buildQueryText('The World Bank Group funds it', { orgNames: ['World Bank', 'World Bank Group'] })
  assert.equal(out, 'The funds it')
})

test('word boundaries protect larger words', () => {
  const out = buildQueryText('Indiana and India', { places: ['India'] })
  assert.equal(out, 'Indiana and')
})

test('regex characters in terms are literal', () => {
  const out = buildQueryText('Uses Node.js and Nodexjs', { languages: ['Node.js'] })
  assert.equal(out, 'Uses and Nodexjs')
})

test('multi-word terms match any whitespace between words', () => {
  assert.equal(buildQueryText('Work at World  Bank today', { orgNames: ['World Bank'] }), 'Work at today')
  assert.equal(buildQueryText('Work at World\nBank today', { orgNames: ['World Bank'] }), 'Work at today')
})

test('terms with apostrophes, hyphens and plus signs are removed but not inside longer words', () => {
  assert.equal(buildQueryText("Based in Côte d'Ivoire now", { places: ["Côte d'Ivoire"] }), 'Based in now')
  assert.equal(buildQueryText('Join UN-Habitat and UN-Habitats', { orgNames: ['UN-Habitat'] }), 'Join and UN-Habitats')
  assert.equal(buildQueryText('Write C++ and C++x code', { languages: ['C++'] }), 'Write and C++x code')
})

const req = (kind: string, value: unknown, level = 'strong'): Requirement =>
  ({ id: `r-${kind}`, kind, level, source: 'manual', value }) as unknown as Requirement

test('exclusionsFromRequirements reads location, language and org rows at any level', () => {
  const out = exclusionsFromRequirements([
    req('location', { values: ['Kenya', 'Nairobi, Kenya', ' ', 'Washington, D.C., United States'] }, 'must'),
    req('language', { values: ['French', ''], min: 'fluent' }, 'slight'),
    req('org_history', { org: 'World Bank', also: [{ org: 'IMF' }, { org: '' }], scope: 'ever', peers: ['ADB', ''] }),
    req('expertise', { name: 'Water' }),
    req('type', { values: ['individual'] }),
  ])
  assert.deepEqual(out.places, [
    'Kenya', 'Nairobi, Kenya', 'Nairobi', 'Washington, D.C., United States', 'Washington', 'D.C.', 'United States',
  ])
  assert.deepEqual(out.languages, ['French'])
  assert.deepEqual(out.orgNames, ['World Bank', 'IMF', 'ADB'])
})

test('a location value is split on every comma', () => {
  const out = exclusionsFromRequirements([req('location', { values: ['Nairobi, Nairobi County, Kenya'] })])
  assert.deepEqual(out.places, ['Nairobi, Nairobi County, Kenya', 'Nairobi', 'Nairobi County', 'Kenya'])
})

test('exclusionsFromRequirements skips malformed rows and fields and keeps the good ones', () => {
  const rows = [
    null,
    42,
    { id: 'x' },
    req('location', null),
    req('location', { values: 'Kenya' }),
    req('location', { values: [5, null, 'Peru'] }),
    req('language', { values: { a: 1 } }),
    req('language', { values: ['French', 7] }),
    req('org_history', { org: 5, also: 'IMF', peers: 'ADB' }),
    req('org_history', { org: 'World Bank', also: [null, { org: 9 }, { org: 'IMF' }], peers: [3, 'ADB'] }),
    req('org_history', { org: 'Solo' }),
  ] as unknown as Requirement[]
  const out = exclusionsFromRequirements(rows)
  assert.deepEqual(out.places, ['Peru'])
  assert.deepEqual(out.languages, ['French'])
  assert.deepEqual(out.orgNames, ['World Bank', 'IMF', 'ADB', 'Solo'])
  assert.doesNotThrow(() => exclusionsFromRequirements(undefined as unknown as Requirement[]))
})

test('exclusionsFromRequirements gives empty lists for no relevant rows', () => {
  assert.deepEqual(exclusionsFromRequirements([req('expertise', { name: 'Water' })]), {})
})

test('mergeExclusions concatenates, de-duplicates case-insensitively and omits empty fields', () => {
  const out = mergeExclusions(
    { orgNames: ['World Bank'], places: ['Kenya'] },
    undefined,
    { orgNames: ['world bank', 'IMF'], languages: [] },
  )
  assert.deepEqual(out, { orgNames: ['World Bank', 'IMF'], places: ['Kenya'] })
  assert.deepEqual(mergeExclusions(undefined, {}), {})
})
