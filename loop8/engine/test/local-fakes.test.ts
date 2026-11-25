import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeTextModel } from '../src/engine/local-fakes'
import { buildComponentsPrompt, parseComponentsOutput } from '../src/stage2/components'
import { buildFitPrompt, parseFitOutput } from '../src/stage2/fit'

const input = {
  jdQuery: 'Evaluate a rural water and sanitation programme',
  fragments: [{ fragmentId: 'p1#portfolio#0', type: 'portfolio', text: 'Led a WASH programme evaluation.' }],
  workPlaces: ['Malawi'],
}
const other = { ...input, jdQuery: 'Design a health financing study' }
const ask = (p: { system: string; user: string }) => createFakeTextModel()({ modelId: 'fake', maxTokens: 150, ...p })

test('fake text model answers the components prompt with valid components, the same each time', async () => {
  for (const i of [input, other]) {
    const a = await ask(buildComponentsPrompt(i))
    const b = await ask(buildComponentsPrompt(i))
    assert.equal(a.text, b.text)
    const parts = parseComponentsOutput(a.text)
    assert.deepEqual(Object.keys(JSON.parse(a.text)).sort(), ['domain_expertise', 'regional_experience', 'technical_skills'])
    for (const v of Object.values(parts)) assert.ok(v === null || (Number.isInteger(v) && v >= 0 && v <= 100))
    assert.ok(!('fit' in JSON.parse(a.text)), 'no Fit JSON for the components prompt')
  }
})

test('fake text model still answers the Fit prompt with Fit JSON and anything else with the fixed summary', async () => {
  const fit = await ask(buildFitPrompt(input))
  const o = JSON.parse(fit.text)
  assert.deepEqual(Object.keys(o), ['fit', 'fragmentIds', 'reason'])
  assert.deepEqual(o.fragmentIds, ['E1'])
  assert.equal(o.reason, 'fake local model')
  assert.ok(Number.isInteger(o.fit) && o.fit >= 30 && o.fit <= 90)
  assert.equal(parseFitOutput(fit.text, ['p1#portfolio#0'], ['E1']).fit, o.fit)
  const summary = await ask({ system: 'You write a short summary.', user: 'x' })
  assert.equal(summary.text, Array.from({ length: 45 }, (_, i) => `word${i}`).join(' '))
  assert.equal(fit.inputTokens, 0)
  assert.equal(fit.outputTokens, 0)
})
