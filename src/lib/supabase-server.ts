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
    const queryStub = {
      select: () => Promise.resolve({ data: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null }) }),
      eq: () => ({ select: () => Promise.resolve({ data: null }) }),
      order: () => Promise.resolve({ data: null }),
      delete: () => Promise.resolve({ data: null }),
      insert: () => Promise.resolve({ data: null }),
    }
    return {
      from: () => queryStub,
      auth: { admin: { updateUserById: () => Promise.resolve({ data: null }) } },
    } as any
  }
  return getSupabaseServer()
})()
