// One JSON line per event. Callers must never pass requirements, profile text or narratives.
export function log(event: string, fields: { jobId: string } & Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }))
}
