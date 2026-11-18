import test from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createLocalServer } from '../src/local-server'

test('local server serves CORS, jobs and result files over loopback', async () => {
  const originalLog = console.log
  console.log = () => {}
  const { server, baseUrl } = createLocalServer({})
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    assert.ok(baseUrl().startsWith(base))

    const options = await fetch(`${base}/jobs`, { method: 'OPTIONS' })
    assert.equal(options.status, 204)
    assert.equal(options.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.equal(options.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS')
    assert.equal(options.headers.get('access-control-allow-headers'), 'content-type, idempotency-key')

    const poolIds = ['a1', 'b2', 'c3']
    const post = await fetch(`${base}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k1' },
      body: JSON.stringify({ jobDescriptionId: 'jd', requirements: [], poolIds }),
    })
    assert.equal(post.status, 202)
    assert.equal(post.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    const { jobId } = (await post.json()) as { jobId: string }

    let job: { state: string; resultUrl?: string } = { state: '' }
    for (let i = 0; i < 100 && job.state !== 'DONE'; i++) {
      job = (await (await fetch(`${base}/jobs/${jobId}`)).json()) as typeof job
      if (job.state !== 'DONE') await new Promise((r) => setTimeout(r, 20))
    }
    assert.equal(job.state, 'DONE')
    assert.ok(job.resultUrl?.startsWith(base))

    const res = await fetch(job.resultUrl as string)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.match(res.headers.get('content-type') ?? '', /application\/json/)
    const body = (await res.json()) as { results: { profile_id: string; rank: number }[] }
    assert.deepEqual(body.results.map((r) => r.rank), [1, 2, 3])
    assert.deepEqual(body.results.map((r) => r.profile_id).sort(), [...poolIds].sort())

    const missing = await fetch(`${base}/results/missing.json`)
    assert.equal(missing.status, 404)
    assert.equal(missing.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  } finally {
    console.log = originalLog
    server.close()
    server.closeAllConnections()
  }
})
