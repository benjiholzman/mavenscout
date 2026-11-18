import test from 'node:test'
import assert from 'node:assert/strict'
import { internalError, toApiRequest, toHttpResponse } from '../src/api/http'

const event = (o: Record<string, unknown>) =>
  ({ headers: { 'Idempotency-Key': 'k1' }, rawPath: '/jobs', requestContext: { http: { method: 'POST' } }, ...o }) as never

test('toApiRequest lowercases headers and keeps plain bodies', () => {
  const r = toApiRequest(event({ body: '{"a":1}' }))
  assert.deepEqual(r, { method: 'POST', path: '/jobs', headers: { 'idempotency-key': 'k1' }, body: '{"a":1}' })
})

test('toApiRequest decodes base64 bodies and maps a missing body to null', () => {
  const b64 = Buffer.from('hello', 'utf8').toString('base64')
  assert.equal(toApiRequest(event({ body: b64, isBase64Encoded: true })).body, 'hello')
  assert.equal(toApiRequest(event({})).body, null)
})

test('toHttpResponse maps status and JSON body', () => {
  assert.deepEqual(toHttpResponse({ status: 202, body: { a: 1 } }), {
    statusCode: 202, headers: { 'content-type': 'application/json' }, body: '{"a":1}',
  })
})

test('internalError is a 500 with the fixed body', () => {
  const r = internalError()
  assert.equal(r.statusCode, 500)
  assert.equal((r.headers as Record<string, string>)['content-type'], 'application/json')
  assert.deepEqual(JSON.parse(r.body as string), { error: 'internal_error', message: 'Unexpected error' })
})
