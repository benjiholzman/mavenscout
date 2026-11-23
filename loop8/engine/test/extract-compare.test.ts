import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkLiveApproval,
  livePlanText,
  parseExtractCompareArgs,
  plannedCalls,
  scoreExtraction,
} from '../src/eval/extract-compare'
import type { ExtractedRequirements } from '../../../src/lib/matching/types'

const got = (expertise: string[], locations: string[], languages: string[]): ExtractedRequirements => ({
  expertise: expertise.map((name) => ({ name, mentions: 1, suggested: 'slight' as const })),
  locations: locations.map((value) => ({ value, mentions: 1 })),
  languages: languages.map((value) => ({ value, mentions: 1 })),
  hiring_organization: null,
})

test('the arguments need a model and reject anything unknown', () => {
  assert.throws(() => parseExtractCompareArgs([]), /at least one model/)
  assert.throws(() => parseExtractCompareArgs(['--models=a', '--nope']), /Unknown argument/)
  assert.throws(() => parseExtractCompareArgs(['--models=a', '--max-calls=x']), /whole number/)
  const a = parseExtractCompareArgs(['--models=a, b', '--tors=tor-01', '--confirm-live', '--max-calls=2'])
  assert.deepEqual(a, { models: ['a', 'b'], torIds: ['tor-01'], confirmLive: true, maxCalls: 2 })
})

test('without --confirm-live the plan only counts the calls and says that none was made', () => {
  const a = parseExtractCompareArgs(['--models=a,b'])
  assert.equal(a.confirmLive, false)
  assert.equal(plannedCalls(a, 5), 10)
  const text = livePlanText(a, 5)
  assert.match(text, /Planned live calls: 10/)
  assert.match(text, /No database read and no model call was made/)
  assert.match(text, /--confirm-live --max-calls=10/)
})

test('a live run needs the approved number of calls, exactly or more', () => {
  const base = parseExtractCompareArgs(['--models=a,b', '--confirm-live'])
  assert.throws(() => checkLiveApproval(base, 5), /--max-calls=10/)
  assert.throws(() => checkLiveApproval({ ...base, maxCalls: 9 }, 5), /needs 10 calls and --max-calls allows 9/)
  assert.doesNotThrow(() => checkLiveApproval({ ...base, maxCalls: 10 }, 5))
})

test('the score counts expected terms found, the ones missed and the suggestions that were not expected', () => {
  const s = scoreExtraction(got(['Nutrition', 'Translation'], ['Ethiopia', 'Addis Ababa, Ethiopia'], ['English']), {
    expertise: ['Nutrition', 'Policy Briefs'],
    locations: ['Ethiopia'],
    languages: ['English', 'Amharic'],
  })
  assert.equal(s.total, 5)
  assert.equal(s.hit, 3)
  assert.deepEqual(s.missed, ['expertise: Policy Briefs', 'languages: Amharic'])
  assert.deepEqual(s.unexpected, ['expertise: Translation', 'locations: Addis Ababa, Ethiopia'])
})
