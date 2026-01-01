'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--primary)]">
          Video Suggestions CBB
        </Link>
        <nav className="flex gap-4">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg transition-colors ${
              pathname === '/' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--card-hover)]'
            }`}
          >
            Home
          </Link>
          <Link
            href="/submit"
            className={`px-3 py-2 rounded-lg transition-colors ${
              pathname === '/submit' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--card-hover)]'
            }`}
          >
            Submit
          </Link>
          <Link
            href="/admin"
            className={`px-3 py-2 rounded-lg transition-colors ${
              pathname?.startsWith('/admin') ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--card-hover)]'
            }`}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}
