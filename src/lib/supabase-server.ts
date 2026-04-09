import { createClient, SupabaseClient } from '@supabase/supabase-js'

let clientInstance: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (clientInstance) return clientInstance
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    )
  }

  clientInstance = createClient(supabaseUrl, supabaseServiceRoleKey)
  return clientInstance
}

// Export a stub during build time, real client at runtime
export const supabaseServer: SupabaseClient = (() => {
  // During Next.js build phase, env vars may not be available
  // Return a minimal stub to avoid errors during collection
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      from: () => ({ update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: null }) }) }) }),
      auth: { admin: { updateUserById: () => Promise.resolve({ data: null }) } },
    } as any
  }
  return getSupabaseServer()
})()
