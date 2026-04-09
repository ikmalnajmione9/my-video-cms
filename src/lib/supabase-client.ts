import { createClient } from '@supabase/supabase-js'

export const isSupabaseClientConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

if (!isSupabaseClientConfigured) {
  console.warn(
    'Supabase env vars are missing. Using placeholder client to avoid build-time prerender failure. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Project Settings.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
