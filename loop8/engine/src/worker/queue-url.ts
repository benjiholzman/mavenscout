// Turns arn:aws:sqs:<region>:<account>:<name> into the queue URL. Only the aws and aws-us-gov
// partitions share the amazonaws.com host. aws-cn and anything malformed give null, never a guess.
export function queueUrlFromArn(arn: string | undefined): string | null {
  if (!arn) return null
  const parts = arn.split(':')
  if (parts.length !== 6) return null
  const [prefix, partition, service, region, account, name] = parts
  if (prefix !== 'arn' || service !== 'sqs') return null
  if (partition !== 'aws' && partition !== 'aws-us-gov') return null
  if (!region || !account || !name) return null
  return `https://sqs.${region}.amazonaws.com/${account}/${name}`
}

// JOBS_QUEUE_URL wins when set (after trimming, so a value of only spaces counts as unset),
// otherwise the URL comes from the record's event source ARN.
export function resolveQueueUrl(envUrl: string | undefined, eventSourceArn: string | undefined): string | null {
  return envUrl?.trim() || queueUrlFromArn(eventSourceArn)
}

type RetryFn = (receiptHandle: string, delaySeconds: number) => Promise<void>

// Returns the retrySoon callback for one record, or undefined when no queue URL is known,
// in which case nothing is requested and the message waits for its visibility timeout.
export function buildRetrySoon(opts: {
  envUrl: string | undefined
  eventSourceArn: string | undefined
  receiptHandle: string
  delaySeconds: number
  makeRetry: (queueUrl: string) => RetryFn
}): (() => Promise<void>) | undefined {
  const url = resolveQueueUrl(opts.envUrl, opts.eventSourceArn)
  if (!url) return undefined
  const retry = opts.makeRetry(url)
  return () => retry(opts.receiptHandle, opts.delaySeconds)
}
