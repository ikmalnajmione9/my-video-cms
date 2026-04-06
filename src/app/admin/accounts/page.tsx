"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role?: string
}

export default function AccountsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removingUserId, setRemovingUserId] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [passkeyModalOpen, setPasskeyModalOpen] = useState(false)
  const [passkey, setPasskey] = useState('')
  const [pendingAction, setPendingAction] = useState<{ type: 'create' } | { type: 'remove'; user: User } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else {
        setCurrentUserId(session.user.id)
        setLoading(false)
        fetchUsers()
      }
    })
  }, [router])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users)
    } catch (e: any) {
      setError(e.message || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !invitePassword) return
    setPendingAction({ type: 'create' })
    setPasskey('')
    setPasskeyModalOpen(true)
    setNotice({ type: 'info', text: 'Enter admin passkey to create this account.' })
  }

  const handleRemoveClick = (user: User) => {
    setPendingAction({ type: 'remove', user })
    setPasskey('')
    setPasskeyModalOpen(true)
    setNotice({ type: 'info', text: `Enter admin passkey to remove ${user.email}.` })
  }

  const handlePasskeyAction = async () => {
    if (!pendingAction) return
    if (!passkey.trim()) {
      setNotice({ type: 'error', text: 'Admin passkey is required.' })
      return
    }

    if (pendingAction.type === 'create') {
      setInviting(true)
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, password: invitePassword, passkey: passkey.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create user')
        setNotice({ type: 'success', text: `Account created for ${inviteEmail}.` })
        setInviteEmail('')
        setInvitePassword('')
        setPasskeyModalOpen(false)
        setPendingAction(null)
        fetchUsers()
      } catch (e: any) {
        setNotice({ type: 'error', text: e.message || 'Failed to create user.' })
      } finally {
        setInviting(false)
      }
      return
    }

    const targetUser = pendingAction.user
    setRemovingUserId(targetUser.id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, passkey: passkey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove user')
      setNotice({ type: 'success', text: `Account removed for ${targetUser.email}.` })
      setPasskeyModalOpen(false)
      setPendingAction(null)
      fetchUsers()
    } catch (e: any) {
      setNotice({ type: 'error', text: e.message || 'Failed to remove user.' })
    } finally {
      setRemovingUserId('')
    }
  }

  const closePasskeyModal = () => {
    if (inviting || !!removingUserId) return
    setPasskeyModalOpen(false)
    setPendingAction(null)
    setPasskey('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-extrabold text-slate-900">Manage Accounts</h1>
          <p className="text-sm text-slate-600 mt-2">Add new users and view all registered accounts.</p>
        </div>

        <div className="space-y-8">
        {error && (
          <div className="rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {notice && (
          <div className={`rounded border px-4 py-3 text-sm ${
            notice.type === 'error'
              ? 'border-red-800/50 bg-red-900/20 text-red-300'
              : notice.type === 'success'
              ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-300'
              : 'border-blue-800/50 bg-blue-900/20 text-blue-300'
          }`}>
            {notice.text}
          </div>
        )}

        {/* Add account */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Add New Account</h2>
          <p className="text-xs text-slate-500 mb-4">Creates a new user in Supabase Auth. They can then log in and manage videos.</p>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Password</label>
              <input
                type="password"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                required
                placeholder="min. 6 characters"
                minLength={6}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {inviting ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Users table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Registered Accounts</h2>
            <button onClick={fetchUsers} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↻ Refresh</button>
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest">
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Created</th>
                  <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Last Login</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usersLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600">No accounts found.</td></tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-800 font-medium text-sm">{user.email}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveClick(user)}
                          disabled={removingUserId === user.id || user.id === currentUserId}
                          className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          title={user.id === currentUserId ? 'You cannot remove your own account.' : `Remove ${user.email}`}
                        >
                          {removingUserId === user.id ? 'Removing...' : 'Remove Account'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {passkeyModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
          <h3 className="text-base font-bold text-slate-900">Admin Passkey Required</h3>
          <p className="mt-1 text-xs text-slate-600">
            {pendingAction?.type === 'remove'
              ? `Confirm passkey to remove ${pendingAction.user.email}.`
              : 'Confirm passkey to create this account.'}
          </p>
          <div className="mt-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Passkey</label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              autoFocus
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
              placeholder="Enter admin passkey"
            />
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closePasskeyModal}
              disabled={inviting || !!removingUserId}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasskeyAction}
              disabled={inviting || !!removingUserId}
              className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
