'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const [showAdmin, setShowAdmin] = useState(false)
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check localStorage on mount
  useEffect(() => {
    const adminRevealed = localStorage.getItem('admin_revealed') === 'true'
    setShowAdmin(adminRevealed)
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    // Don't prevent navigation, just track clicks
    clickCountRef.current += 1

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    if (clickCountRef.current >= 5) {
      // Secret 5-click combo detected!
      setShowAdmin(true)
      localStorage.setItem('admin_revealed', 'true')
      clickCountRef.current = 0
    } else {
      // Reset after 600ms if not enough clicks
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 600)
    }
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" onClick={handleLogoClick}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="rounded-xl shadow-lg group-hover:scale-105 transition-transform"
          />
          <span className="text-xl font-bold gradient-text hidden sm:block">
            Video Suggestions
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* YouTube Channels */}
          <a
            href="https://www.youtube.com/@OfficialChatbotBuilder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-all text-[var(--foreground-muted)] hover:text-red-500 hover:bg-[var(--card)] flex items-center gap-1.5"
            title="ChatBot Builder on YouTube"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="text-xs sm:text-sm">CBB</span>
          </a>
          <a
            href="https://www.youtube.com/@PAYMEGPT"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-all text-[var(--foreground-muted)] hover:text-red-500 hover:bg-[var(--card)] flex items-center gap-1.5"
            title="PMGPT on YouTube"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="text-xs sm:text-sm">PMGPT</span>
          </a>

          <div className="w-px h-6 bg-[var(--border)] mx-1 hidden sm:block"></div>

          <Link
            href="/"
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              pathname === '/'
                ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
            }`}
          >
            <span className="hidden sm:inline">Browse</span>
            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <Link
            href="/submit"
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              pathname === '/submit'
                ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
            }`}
          >
            <span className="hidden sm:inline">Request</span>
            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
          {showAdmin && (
            <Link
              href="/admin"
              className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all animate-fade-in ${
                pathname?.startsWith('/admin')
                  ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
              }`}
            >
              <span className="hidden sm:inline">Admin</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
