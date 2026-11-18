import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { handleApi } from './api/app'
import { loadSettings } from './core/settings'
import { createStubEngine, stubOptionsFromEnv } from './engine/stub'
import { DEFAULT_LIMITS } from './shared/limits'
import { log } from './shared/log'
import { createMemoryStore } from './shared/memory-store'
import type { JobQueue, JobStore } from './shared/store'
import { processJob } from './worker/app'

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(chunks.length === 0 ? null : Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** A local HTTP server running the real API and worker code in memory, with the stub engine. */
export function createLocalServer(env: Record<string, string | undefined>): { server: Server; baseUrl(): string } {
  const memory = createMemoryStore()
  const baseUrl = () => {
    const addr = server.address()
    return addr && typeof addr === 'object' ? `http://127.0.0.1:${addr.port}` : ''
  }
  const store: JobStore = { ...memory, objectUrl: async (key: string) => `${baseUrl()}/${key}` }
  const settings = loadSettings(env)
  const engine = createStubEngine(stubOptionsFromEnv(env))
  const worker = { store, engine, limits: DEFAULT_LIMITS, now: Date.now, workerId: 'local-server' }
  const queue: JobQueue = {
    async send(jobId: string) {
      setImmediate(() => {
        processJob(jobId, 1, worker).catch((e: unknown) => {
          log('local_worker_error', { jobId, message: e instanceof Error ? e.message : String(e) })
        })
      })
    },
  }
  const api = { store, queue, settings, limits: DEFAULT_LIMITS, now: Date.now, newId: () => randomUUID() }

  const cors = {
    'access-control-allow-origin': env.LOCAL_ALLOW_ORIGIN || 'http://localhost:5173',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, idempotency-key',
  }
  const send = (res: ServerResponse, status: number, body: string) => {
    res.writeHead(status, { ...cors, 'content-type': 'application/json' })
    res.end(body)
  }

  const server = createServer(async (req, res) => {
    try {
      const method = req.method ?? 'GET'
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      if (method === 'OPTIONS') {
        res.writeHead(204, cors)
        res.end()
        return
      }
      const m = method === 'GET' ? /^\/(results\/[^/]+\.json)$/.exec(path) : null
      if (m) {
        const obj = await store.getObject(m[1])
        if (obj === null) send(res, 404, JSON.stringify({ error: 'not_found', message: 'Not found' }))
        else send(res, 200, obj)
        return
      }
      const headers: Record<string, string | undefined> = {}
      for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : v
      const out = await handleApi({ method, path, headers, body: await readBody(req) }, api)
      send(res, out.status, JSON.stringify(out.body))
    } catch (e) {
      log('local_server_error', { jobId: 'n/a', message: e instanceof Error ? e.message : String(e) })
      send(res, 500, JSON.stringify({ error: 'internal_error', message: 'Unexpected error' }))
    }
  })

  return { server, baseUrl }
}
