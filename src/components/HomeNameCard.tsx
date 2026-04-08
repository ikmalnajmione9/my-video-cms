"use client"

import { useState } from "react"

export default function HomeNameCard() {
  const [pointer, setPointer] = useState({ x: 50, y: 50 })
  const [isInside, setIsInside] = useState(false)

  const rotateX = ((pointer.y - 50) / 50) * -8
  const rotateY = ((pointer.x - 50) / 50) * 10

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div
        className="group relative w-full max-w-[620px]"
        onMouseEnter={() => setIsInside(true)}
        onMouseLeave={() => {
          setIsInside(false)
          setPointer({ x: 50, y: 50 })
        }}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * 100
          const y = ((event.clientY - rect.top) / rect.height) * 100
          setPointer({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          })
        }}
      >
        <div
          className="relative aspect-[5/3] w-full rounded-2xl border border-cyan-300/50 bg-white p-4 shadow-[0_25px_60px_-30px_rgba(30,64,175,0.45)] transition-transform duration-200 ease-out"
          style={{
            transform: `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isInside ? 1.02 : 1})`,
          }}
        >
          <div className="relative h-full rounded-xl border border-indigo-200 bg-slate-50 p-5">
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-cyan-400/10 opacity-80 transition-opacity" />
            <div className="pointer-events-none absolute inset-0 rounded-xl border border-cyan-300/10" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-cyan-700">
                <span>Mandrill Tech</span>
                <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] text-green-700">Video CMS</span>
              </div>

              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
                  Net7 Product Guide Web
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700">
                  Net7 Product Guide Web is a centralized guide to the features of the Net7 mobile app, built to help teams
                  understand, review, and communicate each feature clearly for internal alignment and client-facing conversations.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded border border-cyan-200 bg-cyan-100 px-2 py-2 text-cyan-700">Feature Videos</div>
                <div className="rounded border border-indigo-200 bg-indigo-100 px-2 py-2 text-indigo-700">Team Alignment</div>
                <div className="rounded border border-fuchsia-200 bg-fuchsia-100 px-2 py-2 text-fuchsia-700">Client Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
