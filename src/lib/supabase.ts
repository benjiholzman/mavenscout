import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton: the client is only constructed (and env vars only
// validated) on first actual use, not on import — so importing this module
// is side-effect-free for tooling that can't supply real env vars (e.g. a
// design-system bundler), while real usage still fails loudly if misconfigured.
let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    if (!url || !anonKey) {
      throw new Error(
        'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.',
      )
    }
    client = createClient(url, anonKey)
  }
  return client
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
