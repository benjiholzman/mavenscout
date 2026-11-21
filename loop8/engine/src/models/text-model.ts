// Text model client over the Amazon Bedrock Converse API. The model id is a
// request field (a setting by role), never hard coded here. Nothing is logged.

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

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

export function createBedrockTextModel(opts: {
  region?: string
  client?: { send(cmd: unknown): Promise<any> }
} = {}): TextModel {
  const client =
    opts.client ?? new BedrockRuntimeClient(bedrockClientConfig(opts.region))
  return async (req) => {
    const res = await client.send(
      new ConverseCommand({
        modelId: req.modelId,
        system: [{ text: req.system }],
        messages: [{ role: 'user', content: [{ text: req.user }] }],
        inferenceConfig: { maxTokens: req.maxTokens, temperature: 0 },
      }),
    )
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
