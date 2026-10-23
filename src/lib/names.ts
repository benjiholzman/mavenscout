// Names are one free-text field, and some include an honorific ("Dr. Priya
// Nair"). Anywhere we address someone by first name, skip the honorific.

const HONORIFIC = /^((dr|prof|professor|mr|mrs|ms|mx|eng|sir|dame)\.?\s+)+/i

/** "Priya" from "Dr. Priya Nair"; null for an empty name. */
export function firstName(name: string | null | undefined): string | null {
  return (name ?? '').trim().replace(HONORIFIC, '').split(/\s+/)[0] || null
}
