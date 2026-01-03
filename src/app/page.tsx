'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Suggestion, Channel } from '@/lib/database.types'
import SuggestionCard from '@/components/SuggestionCard'

type FilterStatus = 'all' | 'open_for_voting' | 'in_progress' | 'published'
type FilterChannel = 'all' | Channel

const filterConfig = {
  all: { label: 'All', icon: '◆' },
  open_for_voting: { label: 'Voting', icon: '▲' },
  in_progress: { label: 'In Progress', icon: '●' },
  published: { label: 'Published', icon: '✓' },
}

const channelFilterConfig = {
  all: { label: 'All Channels', color: '' },
  cbb: { label: 'CBB', color: 'text-blue-400' },
  pmgpt: { label: 'PMGPT', color: 'text-purple-400' },
}

function HomeContent() {
  const searchParams = useSearchParams()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [channelFilter, setChannelFilter] = useState<FilterChannel>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Check for submitted query param and show success toast
  useEffect(() => {
    if (searchParams.get('submitted') === 'true') {
      setShowSuccessToast(true)
      // Clear the URL param without refreshing
      window.history.replaceState({}, '', '/')
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setShowSuccessToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('votes_count', { ascending: false })

    if (!error && data) {
      const visibleSuggestions = data.filter(s =>
        s.status === 'open_for_voting' ||
        s.status === 'in_progress' ||
        s.status === 'published'
      )
      setSuggestions(visibleSuggestions)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  useEffect(() => {
    let filtered = suggestions

    if (filter !== 'all') {
      filtered = filtered.filter(s => s.status === filter)
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter(s => s.channel === channelFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      )
    }

    // Sort based on filter:
    // - Published: sort by date (newest first)
    // - Voting/In Progress: sort by votes (highest first)
    // - All: published first by date, then others by votes
    filtered = [...filtered].sort((a, b) => {
      if (filter === 'published') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (filter === 'open_for_voting' || filter === 'in_progress') {
        return b.votes_count - a.votes_count
      } else {
        // "all" filter: published videos first (sorted by date), then others by votes
        if (a.status === 'published' && b.status !== 'published') return -1
        if (a.status !== 'published' && b.status === 'published') return 1
        if (a.status === 'published' && b.status === 'published') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return b.votes_count - a.votes_count
      }
    })

    setFilteredSuggestions(filtered)
  }, [suggestions, filter, channelFilter, searchQuery])

  const handleVote = async (suggestionId: string): Promise<boolean> => {
    // Just increment the vote count - localStorage handles duplicate prevention on client
    const { error: updateError } = await supabase
      .from('suggestions')
      .update({ votes_count: (suggestions.find(s => s.id === suggestionId)?.votes_count || 0) + 1 })
      .eq('id', suggestionId)

    if (!updateError) {
      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestionId ? { ...s, votes_count: s.votes_count + 1 } : s
        )
      )
      return true
    }

    return false
  }

  const stats = {
    total: suggestions.length,
    voting: suggestions.filter(s => s.status === 'open_for_voting').length,
    inProgress: suggestions.filter(s => s.status === 'in_progress').length,
    published: suggestions.filter(s => s.status === 'published').length,
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-[#36D6B5] text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Request submitted!</p>
              <p className="text-sm text-white/80">We&apos;ll review your suggestion soon.</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--background-secondary)] border border-[var(--border)] p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--gradient-start)]/5 to-[var(--gradient-end)]/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--gradient-start)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Video Suggestions</span>
          </h1>
          <p className="text-[var(--foreground-muted)] text-lg mb-8 max-w-2xl">
            Request videos you want to see, vote on suggestions from others, and watch your ideas come to life.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/submit"
              className="btn-primary px-6 py-3 rounded-xl font-semibold text-white inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit a Request
            </Link>

            {/* Stats */}
            <div className="flex items-center gap-6 ml-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</div>
                <div className="text-xs text-[var(--foreground-muted)]">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#36D6B5]">{stats.voting}</div>
                <div className="text-xs text-[var(--foreground-muted)]">Voting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
                <div className="text-xs text-[var(--foreground-muted)]">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#36D6B5]">{stats.published}</div>
                <div className="text-xs text-[var(--foreground-muted)]">Published</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--primary)]"
            />
          </div>

          {/* Channel Filter */}
          <div className="flex gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl">
            {(Object.keys(channelFilterConfig) as FilterChannel[]).map((channel) => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  channelFilter === channel
                    ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
                    : `text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] ${channelFilterConfig[channel].color}`
                }`}
              >
                {channel !== 'all' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                )}
                {channelFilterConfig[channel].label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl w-fit">
          {(Object.keys(filterConfig) as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
              }`}
            >
              <span className="mr-1.5">{filterConfig[status].icon}</span>
              {filterConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
            <p className="text-[var(--foreground-muted)]">Loading suggestions...</p>
          </div>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--card)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matches found' : 'No suggestions yet'}
          </h3>
          <p className="text-[var(--foreground-muted)] mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Be the first to submit a video request!'}
          </p>
          {!searchQuery && (
            <Link
              href="/submit"
              className="btn-primary px-6 py-3 rounded-xl font-semibold text-white inline-flex items-center gap-2"
            >
              Submit a Request
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
          <p className="text-[var(--foreground-muted)]">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
