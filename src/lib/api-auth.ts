import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type AuthResult =
  | { ok: true; user: { id: string; email: string | null } }
  | { ok: false; response: NextResponse }

function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request)
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing Authorization bearer token.' }, { status: 401 }),
    }
  }

  try {
    const authClient = getAuthClient()
    const { data, error } = await authClient.auth.getUser(token)

    if (error || !data.user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
      }
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    }
  } catch (error) {
    console.error('Auth validation failed:', error)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication service unavailable.' }, { status: 500 }),
    }
  }
}

function getAdminEmailsFromEnv() {
  const raw = process.env.ADMIN_USER_EMAILS || ''
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = email?.toLowerCase().trim() ?? ''
  if (!normalizedEmail) return false
  return getAdminEmailsFromEnv().includes(normalizedEmail)
}

export async function requireAdminUser(request: Request): Promise<AuthResult> {
  const authResult = await requireAuthenticatedUser(request)
  if (!authResult.ok) {
    return authResult
  }

  const adminEmails = getAdminEmailsFromEnv()
  if (adminEmails.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Server admin access is not configured. Set ADMIN_USER_EMAILS.' },
        { status: 500 }
      ),
    }
  }

  if (!isAdminEmail(authResult.user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 }),
    }
  }

  return authResult
}
