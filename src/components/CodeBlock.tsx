"use client"

import { useState } from 'react'

export default function CodeBlock({ children, className }: { children: React.ReactNode, className?: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    const text = String(children).replace(/\n$/, '')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-6 rounded-xl overflow-hidden glass-card border-white/5">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-xs font-mono text-slate-400">
          {className?.replace('language-', '') || 'code'}
        </span>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto custom-scrollbar text-sm font-mono text-slate-300 bg-slate-900/40">
        <code className={className}>{children}</code>
      </pre>

      <style jsx global>{`
        /* Code block scrollbar */
        pre.custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.3) transparent;
        }

        /* WebKit - Code block scrollbar */
        pre.custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        pre.custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        pre.custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.3);
          border-radius: 10px;
        }

        pre.custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  )
}
