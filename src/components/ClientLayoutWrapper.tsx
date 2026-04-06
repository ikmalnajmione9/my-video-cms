"use client"

import React from 'react'
import TopNav from './TopNav'

interface ClientLayoutWrapperProps {
  children: React.ReactNode
  sidebarContent?: React.ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden bg-background text-foreground">
      <TopNav />
      <main className="flex-1 overflow-y-auto custom-scrollbar relative px-4 sm:px-8">
        <div className="relative z-0 h-full py-8">
          {children}
        </div>
      </main>

      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-gutter: stable;
          scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
        }

        /* WebKit */
        .custom-scrollbar::-webkit-scrollbar { 
          width: 6px; 
        }

        .custom-scrollbar::-webkit-scrollbar-track { 
          background: transparent; 
        }

        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(100, 116, 139, 0.35); 
          border-radius: 10px;
          border: 1px solid transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: rgba(59, 130, 246, 0.8); 
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
        }
      `}</style>
    </div>
  )
}
