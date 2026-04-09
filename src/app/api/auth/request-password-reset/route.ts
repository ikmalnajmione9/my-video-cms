import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, redirectTo } = await request.json()

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Use service role to send password reset email (bypasses client-side rate limits)
    const { error } = await supabaseServer.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTo || `${new URL(request.url).origin}/invite`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Password reset email sent. Please check your inbox.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
