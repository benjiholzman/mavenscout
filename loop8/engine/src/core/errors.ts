// An error that retrying cannot fix. The worker fails the job at once instead of letting SQS redeliver.
export class TerminalError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'TerminalError'
  }
}
