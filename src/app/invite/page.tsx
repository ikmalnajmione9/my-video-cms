"use client"

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type InviteStage = 'verifying' | 'pending' | 'ready' | 'success' | 'error'
type DeferredOtpPayload = {
  tokenHash?: string
  token?: string
  otpType: 'invite' | 'recovery' | 'magiclink' | 'signup' | 'email_change'
  email?: string
}

function isSupportedOtpType(value: string | null): value is 'invite' | 'recovery' | 'magiclink' | 'signup' | 'email_change' {
  return value === 'invite' || value === 'recovery' || value === 'magiclink' || value === 'signup' || value === 'email_change'
}

function parseHashParams(hash: string) {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(trimmed)
}

function getParam(searchParams: URLSearchParams, hashParams: URLSearchParams, key: string) {
  return searchParams.get(key) ?? hashParams.get(key)
}

export default function InvitePage() {
  const router = useRouter()
  const [stage, setStage] = useState<InviteStage>('verifying')
  const [otpFlowType, setOtpFlowType] = useState<'invite' | 'recovery' | 'magiclink' | 'signup' | 'email_change' | null>(null)
  const [statusMessage, setStatusMessage] = useState('Validating invite link...')
  const [pendingOtpPayload, setPendingOtpPayload] = useState<DeferredOtpPayload | null>(null)
  const [verifyingLink, setVerifyingLink] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const verifyInvite = async () => {
      try {
        const url = new URL(window.location.href)
        const searchParams = url.searchParams
        const hashParams = parseHashParams(url.hash)
        const code = getParam(searchParams, hashParams, 'code')
        const tokenHash = getParam(searchParams, hashParams, 'token_hash')
        const token = getParam(searchParams, hashParams, 'token')
        const otpType = getParam(searchParams, hashParams, 'type')
        const email = getParam(searchParams, hashParams, 'email')

        if (isSupportedOtpType(otpType)) {
          setOtpFlowType(otpType)
        }

        const errorDescription = getParam(searchParams, hashParams, 'error_description')
        const errorCode = getParam(searchParams, hashParams, 'error_code')
        if (errorDescription) {
          throw new Error(errorCode ? `${errorDescription} (${errorCode})` : errorDescription)
        }

        const accessToken = getParam(searchParams, hashParams, 'access_token')
        const refreshToken = getParam(searchParams, hashParams, 'refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            throw error
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }
        } else if ((tokenHash || token) && isSupportedOtpType(otpType)) {
          setPendingOtpPayload({
            tokenHash: tokenHash || undefined,
            token: token || undefined,
            otpType,
            email: email || undefined,
          })
          setStatusMessage('Invite link loaded. Click continue to verify and activate your account.')
          setStage('pending')
          return
        } else {
          throw new Error('Invite link is missing auth parameters. Ensure Supabase redirect URL includes /invite and regenerate the link.')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Invite is invalid or expired. Please request a new invite link.')
        }

        if (!mounted) return
        window.history.replaceState({}, '', '/invite')
        setStatusMessage('Invite verified. Set your password to activate your account.')
        setStage('ready')
      } catch (error: any) {
        if (!mounted) return
        setStatusMessage(error?.message || 'Invite verification failed. Request a new link.')
        setStage('error')
      }
    }

    verifyInvite()

    return () => {
      mounted = false
    }
  }, [])

  const handleVerifyInvite = async () => {
    if (!pendingOtpPayload || verifyingLink) return

    setVerifyingLink(true)
    setStatusMessage('Verifying invite link...')

    try {
      if (pendingOtpPayload.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: pendingOtpPayload.tokenHash,
          type: pendingOtpPayload.otpType,
        })

        if (error) {
          throw error
        }
      } else if (pendingOtpPayload.token) {
        if (pendingOtpPayload.email) {
          const { error } = await supabase.auth.verifyOtp({
            email: pendingOtpPayload.email,
            token: pendingOtpPayload.token,
            type: pendingOtpPayload.otpType,
          })

          if (error) {
            throw error
          }
        } else {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: pendingOtpPayload.token,
            type: pendingOtpPayload.otpType,
          })

          if (error) {
            throw error
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Invite is invalid or expired. Please request a new invite link.')
      }

      window.history.replaceState({}, '', '/invite')
      setPendingOtpPayload(null)
      setStatusMessage('Invite verified. Set your password to activate your account.')
      setStage('ready')
    } catch (error: any) {
      setStatusMessage(error?.message || 'Invite verification failed. Request a new link.')
      setStage('error')
    } finally {
      setVerifyingLink(false)
    }
  }

  const handleCancelRecovery = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Best-effort sign-out for recovery flow.
    }
    router.replace('/login')
  }

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.length < 8) {
      setStatusMessage('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setStatusMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setStatusMessage('Saving your password...')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        throw error
      }

      await supabase.auth.signOut()

      setStage('success')
      setStatusMessage('Password set successfully. Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to set password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900">Accept Invite</h1>
          {otpFlowType === 'recovery' && (stage === 'pending' || stage === 'ready') && (
            <button
              type="button"
              onClick={handleCancelRecovery}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close reset password"
              title="Cancel password reset"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12" />
                <path d="M18 6l-12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>

        {stage === 'verifying' && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <div className="h-4 w-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
            Verifying link
          </div>
        )}

        {stage === 'ready' && (
          <form className="mt-6 space-y-4" onSubmit={handleSetPassword}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500/50 transition-all"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500/50 transition-all"
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 flex items-center justify-center rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Set Password'}
            </button>
          </form>
        )}

        {stage === 'success' && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Account activated. You can now sign in.
          </div>
        )}

        {stage === 'pending' && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Ready to verify this invite.
            </div>
            {pendingOtpPayload && (
              <button
                type="button"
                onClick={handleVerifyInvite}
                disabled={verifyingLink}
                className="h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
              >
                {verifyingLink ? 'Verifying...' : 'Continue to Verify Invite'}
              </button>
            )}
            <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              Go to login
            </Link>
          </div>
        )}

        {stage === 'error' && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Invite could not be verified.
            </div>
            <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
