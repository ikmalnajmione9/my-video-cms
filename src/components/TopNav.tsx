"use client"

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      updateUserData(session)
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

  const updateUserData = (session: any) => {
    if (session?.user) {
      const email = session.user.email || ''
      const name = session.user.user_metadata?.full_name || email.split('@')[0]
      setDisplayName(name)
      const parts = name.split(' ').filter(Boolean)
      if (parts.length >= 2) setInitials((parts[0][0] + parts[1][0]).toUpperCase())
      else if (name.length >= 2) setInitials(name.substring(0, 2).toUpperCase())
      else setInitials(name[0]?.toUpperCase() || 'A')
    }
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const isDocsActive = pathname === '/docs' || pathname.startsWith('/docs/')
  const isAccountsActive = pathname === '/admin/accounts' || pathname.startsWith('/admin/accounts/')

  return (
    <nav 
      className="h-14 border-b backdrop-blur-xl flex items-center px-6 gap-6 sticky top-0 z-40 shadow-sm"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border)',
        color: 'var(--foreground)'
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="text-[13px] font-bold tracking-tight transition-colors flex-shrink-0"
        style={{ color: 'var(--foreground)' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        Net7 Product Guide Web
      </Link>

      {/* Dashboard removed */}

      {/* Nav links — always visible */}
      <Link
        href="/docs"
        className={`text-sm transition-colors whitespace-nowrap ${
          isDocsActive
            ? 'font-semibold'
            : ''
        }`}
        style={{
          color: isDocsActive ? 'var(--accent-blue)' : 'var(--secondary-text)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        User Guide Videos
      </Link>

      {/* Admin-only links */}
      {session && (
        <Link
          href="/admin/accounts"
          className={`text-sm transition-colors whitespace-nowrap ${
            isAccountsActive
              ? 'font-semibold'
              : ''
          }`}
          style={{
            color: isAccountsActive ? 'var(--accent-blue)' : 'var(--secondary-text)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Manage Accounts
        </Link>
      )}

      {/* Push account to far right */}
      <div className="flex-1" />

      {/* Control Panel - Account */}
      <div 
        className="flex items-center gap-3"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {/* Account area */}
        {session ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-full pl-3 pr-1 py-1 transition-all cursor-pointer border"
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
            <div className="flex flex-col items-end mr-1">
              <span 
                className="text-[11px] font-bold leading-tight"
                style={{ color: 'var(--foreground)' }}
              >
                {displayName}
              </span>
              <span 
                className="text-[8px] uppercase tracking-widest font-black"
                style={{ color: 'var(--secondary-text)' }}
              >
                Admin
              </span>
            </div>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border"
              style={{
                backgroundColor: 'var(--accent-blue)',
                borderColor: 'var(--accent-blue)'
              }}
            >
              {initials}
            </div>
          </button>

          {dropdownOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-2xl backdrop-blur-xl z-50 py-1 overflow-hidden"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border)'
              }}
            >
              <div 
                className="px-4 py-2.5 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <p 
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {displayName}
                </p>
                <p 
                  className="text-[10px] truncate"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  {session.user?.email}
                </p>
              </div>
              <div className="py-1">
                <button
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors"
                  style={{ color: 'var(--destructive)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Divider for non-authenticated users */}
          <div 
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border)'
            }}
          />
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
          <div className="flex items-center gap-2 transition-all duration-300 group-hover/login:-translate-x-full group-hover/login:opacity-0 whitespace-nowrap"
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admin?</span>
          </div>
        </Link>
        </>
      )}
      </div>
    </nav>
  )
}
