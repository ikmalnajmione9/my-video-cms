import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? 'unknown',
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasNextPublicSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAdminEmails: Boolean(process.env.ADMIN_USER_EMAILS),
  })
}
