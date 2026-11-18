import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQueryText } from '../src/search/query'

test('without exclusions only whitespace is collapsed', () => {
  assert.equal(buildQueryText('  a \n\n b\t c  '), 'a b c')
  assert.equal(buildQueryText('a  b', {}), 'a b')
})

test('excluded terms are removed case-insensitively as whole phrases', () => {
  const out = buildQueryText('Work with the World Bank in Kenya, speaking French.', {
    orgNames: ['world bank'],
    places: ['KENYA'],
    languages: ['french'],
  })
  assert.equal(out, 'Work with the in , speaking .')
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
