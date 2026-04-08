import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from '@/lib/api-auth'

function buildShareableInviteLink(args: {
  redirectTo?: string
  actionLink?: string
  hashedToken?: string
  email: string
}) {
  const { redirectTo, actionLink, hashedToken, email } = args

  if (!redirectTo || !hashedToken) {
    return actionLink || ''
  }

  try {
    const redirectUrl = new URL(redirectTo)
    const shareUrl = new URL(redirectUrl.pathname || '/invite', redirectUrl.origin)
    shareUrl.searchParams.set('token_hash', hashedToken)
    shareUrl.searchParams.set('type', 'invite')
    shareUrl.searchParams.set('email', email)
    return shareUrl.toString()
  } catch {
    return actionLink || ''
  }
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function validateActionPasskey(passkey?: string) {
  const configuredPasskey = process.env.ADMIN_ACTION_PASSKEY
  if (!configuredPasskey) {
    return { ok: false, message: 'Server passkey is not configured. Set ADMIN_ACTION_PASSKEY.' }
  }
  if (!passkey) {
    return { ok: false, message: 'Admin passkey is required.' }
  }
  if (passkey !== configuredPasskey) {
    return { ok: false, message: 'Invalid admin passkey.' }
  }
  return { ok: true }
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) {
    return auth.response
  }

  const supabaseAdmin = getAdminClient()
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: u.role,
  }))

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) {
    return auth.response
  }

  const supabaseAdmin = getAdminClient()
  const body = await request.json()
  const { email, password, passkey, mode = 'invite' } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const passkeyValidation = validateActionPasskey(passkey)
  if (!passkeyValidation.ok) {
    return NextResponse.json({ error: passkeyValidation.message }, { status: 403 })
  }

  if (mode === 'invite') {
    const redirectTo = process.env.INVITE_REDIRECT_URL
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const actionLink = data.properties.action_link
    const shareLink = buildShareableInviteLink({
      redirectTo,
      actionLink,
      hashedToken: data.properties.hashed_token,
      email,
    })

    return NextResponse.json({
      invite: {
        email,
        action_link: actionLink,
        share_link: shareLink,
        expires_at: data.properties.email_otp_expires_at,
      },
    })
  }

  if (!password) {
    return NextResponse.json({ error: 'Password is required for manual mode.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}

export async function DELETE(request: Request) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) {
    return auth.response
  }

  const supabaseAdmin = getAdminClient()
  const body = await request.json()
  const { userId, passkey } = body

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
  }

  const passkeyValidation = validateActionPasskey(passkey)
  if (!passkeyValidation.ok) {
    return NextResponse.json({ error: passkeyValidation.message }, { status: 403 })
  }

  // Soft delete keeps relational integrity for existing records (e.g. posts)
  // while still disabling the account from signing in.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, true)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
