import { createLocalServer } from '../src/local-server'

const raw = process.env.LOCAL_ENGINE_PORT
const port = raw === undefined || raw === '' ? 8787 : Number(raw)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`LOCAL_ENGINE_PORT must be an integer from 1 to 65535, got "${raw}"`)
  process.exit(1)
}
const { server, baseUrl } = createLocalServer(process.env)
server.listen(port, '127.0.0.1', () => {
  const url = baseUrl()
  console.log(`Local engine server at ${url}. Put VITE_ENGINE_URL=${url} in the app's .env`)
})
