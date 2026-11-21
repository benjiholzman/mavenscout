// Text model client over the Amazon Bedrock Converse API. The model id is a
// request field (a setting by role), never hard coded here. Nothing is logged.

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { REQUEST_TIMEOUT_MS } from '../stage2/retry'

export interface TextRequest {
  modelId: string
  system: string
  user: string
  maxTokens: number
}
export interface TextResponse {
  text: string
  inputTokens: number
  outputTokens: number
  /** Converse stopReason, for example end_turn or max_tokens. */
  stopReason?: string
}
export type TextModel = (req: TextRequest) => Promise<TextResponse>

/** Client config for the default client. maxAttempts is 1 so withRetry is the
 *  only retry policy (the SDK would otherwise retry underneath it). */
export function bedrockClientConfig(region?: string): { region: string; maxAttempts: number } {
  return { region: region ?? process.env.AWS_REGION ?? 'us-east-1', maxAttempts: 1 }
}

/** The call did not finish within the request timeout. Retryable (see isRetryable). The name is the code
 *  and the message is the code too, so it never carries request or model text. */
export class RequestTimeoutError extends Error {
  constructor() {
    super('request_timeout')
    this.name = 'RequestTimeout'
  }
}

export function createBedrockTextModel(opts: {
  region?: string
  client?: { send(cmd: unknown, options?: { abortSignal?: AbortSignal }): Promise<any> }
  requestTimeoutMs?: number
} = {}): TextModel {
  const client: { send(cmd: unknown, options?: { abortSignal?: AbortSignal }): Promise<any> } =
    opts.client ?? (new BedrockRuntimeClient(bedrockClientConfig(opts.region)) as any)
  const timeoutMs = opts.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
  return async (req) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let res: any
    try {
      res = await client.send(
        new ConverseCommand({
          modelId: req.modelId,
          system: [{ text: req.system }],
          messages: [{ role: 'user', content: [{ text: req.user }] }],
          inferenceConfig: { maxTokens: req.maxTokens, temperature: 0 },
        }),
        { abortSignal: controller.signal },
      )
    } catch (err) {
      // An abort from our own timer is a timeout. Any other error passes through unchanged.
      if (controller.signal.aborted) throw new RequestTimeoutError()
      throw err
    } finally {
      clearTimeout(timer)
    }
    const blocks: unknown[] = res?.output?.message?.content ?? []
    const text = blocks
      .map((b) => (typeof (b as { text?: unknown })?.text === 'string' ? (b as { text: string }).text : ''))
      .join('')
    return {
      text,
      inputTokens: res?.usage?.inputTokens ?? 0,
      outputTokens: res?.usage?.outputTokens ?? 0,
      stopReason: typeof res?.stopReason === 'string' ? res.stopReason : undefined,
    }
  }
}
