// The real dependencies of the semantic engine: Titan for embeddings, Bedrock for text, Supabase over HTTP.
// Kept apart from the factory so tests of the factory load none of the AWS clients.

import { readFileSync } from 'node:fs'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { embedText, MODEL_VERSION } from '../bedrock/titan'
import { createSupabaseReader } from '../data/supabase'
import { createBedrockTextModel } from '../models/text-model'
import type { EngineDeps } from './factory'

/** Reads a secret string. The client is made on first use, with the Lambda's region and role. */
function createSecretReader(): EngineDeps['readSecret'] {
  let client: SecretsManagerClient | null = null
  return async (secretId) => {
    client ??= new SecretsManagerClient({})
    const out = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
    if (typeof out.SecretString !== 'string') throw new Error('secret_has_no_string')
    return out.SecretString
  }
}

export function realEngineDeps(readObject: EngineDeps['readObject']): EngineDeps {
  return {
    readObject,
    readFile: (path) => readFileSync(path, 'utf8'),
    createReader: createSupabaseReader,
    createTextModel: () => createBedrockTextModel(),
    embed: embedText,
    embedModelId: MODEL_VERSION,
    readSecret: createSecretReader(),
  }
}
