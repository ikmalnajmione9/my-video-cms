import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET() {
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
  const supabaseAdmin = getAdminClient()
  const body = await request.json()
  const { email, password, passkey } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const passkeyValidation = validateActionPasskey(passkey)
  if (!passkeyValidation.ok) {
    return NextResponse.json({ error: passkeyValidation.message }, { status: 403 })
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

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
