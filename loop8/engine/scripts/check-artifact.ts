import { readFile } from 'node:fs/promises'
import { main, realDeps } from '../src/check-artifact'

const code = await main(process.argv.slice(2), process.env, realDeps((p) => readFile(p, 'utf8')))
process.exit(code)
