import { NextResponse } from 'next/server'
import { isAdminUser, requireAuthenticatedUser } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      is_admin: isAdminUser(auth.user),
    },
  })
}
