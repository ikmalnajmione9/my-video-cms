"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAdmin } from '@/contexts/AdminContext'

export default function TopRightAuthButton() {
  const router = useRouter()
  const { canManageAccounts } = useAdmin()
  const [session, setSession] = useState<any>(null)
  const [initials, setInitials] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      updateUserData(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      updateUserData(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateUserData = (nextSession: any) => {
    if (nextSession?.user) {
      const email = nextSession.user.email || ''
      const name = nextSession.user.user_metadata?.full_name || email.split('@')[0]
      setDisplayName(name)
      const parts = name.split(' ').filter(Boolean)
      if (parts.length >= 2) setInitials((parts[0][0] + parts[1][0]).toUpperCase())
      else if (name.length >= 2) setInitials(name.substring(0, 2).toUpperCase())
      else setInitials(name[0]?.toUpperCase() || 'A')
      return
    }

    setInitials('')
    setDisplayName('')
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-300 relative overflow-hidden group/login border"
        style={{
          backgroundColor: 'var(--button-bg)',
          borderColor: 'var(--border)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--button-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--button-bg)'
        }}
      >
        <div
          className="flex items-center gap-2 transition-all duration-300 group-hover/login:-translate-x-full group-hover/login:opacity-0 whitespace-nowrap"
          style={{ color: 'var(--secondary-text)' }}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-widest">Viewer</span>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center gap-1.5 translate-x-full opacity-0 group-hover/login:translate-x-0 group-hover/login:opacity-100 transition-all duration-300 whitespace-nowrap backdrop-blur-md px-3 border rounded-full"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: 'var(--border)',
            color: 'white'
          }}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Login</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(prev => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1 shadow-sm transition-colors hover:bg-slate-50"
      >
        <div className="flex flex-col items-end mr-1">
          <span className="text-[11px] font-bold leading-tight text-slate-900">{displayName}</span>
          <span className="text-[8px] uppercase tracking-widest font-black text-slate-500">{canManageAccounts ? 'Admin' : 'Editor'}</span>
        </div>
        <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 py-1 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200">
            <p className="text-xs font-semibold truncate text-slate-900">{displayName}</p>
            <p className="text-[10px] truncate text-slate-500">{session.user?.email}</p>
          </div>
          <div className="py-1">
            <button
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}