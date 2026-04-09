import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from '@/lib/api-auth'

function generatePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
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

export async function POST(request: Request) {
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

  // Generate a new password
  const newPassword = generatePassword(16)

  // Update the user's password
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    password: newPassword,
    email: data.user.email,
  })
}
