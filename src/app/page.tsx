'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Suggestion } from '@/lib/database.types'
import SuggestionCard from '@/components/SuggestionCard'

type FilterStatus = 'all' | 'open_for_voting' | 'in_progress' | 'published'

const filterConfig = {
  all: { label: 'All', icon: '◆' },
  open_for_voting: { label: 'Voting', icon: '▲' },
  in_progress: { label: 'In Progress', icon: '●' },
  published: { label: 'Published', icon: '✓' },
}

export default function Home() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      )
    }

    setFilteredSuggestions(filtered)
  }, [suggestions, filter, searchQuery])

  const handleVote = async (suggestionId: string, email: string): Promise<boolean> => {
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('voter_email', email)
      .single()

    if (existingVote) {
      return false
    }

    const { error: voteError } = await supabase
      .from('votes')
      .insert({ suggestion_id: suggestionId, voter_email: email })

    if (voteError) {
      return false
    }

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
    }

    return true
  }

  const stats = {
    total: suggestions.length,
    voting: suggestions.filter(s => s.status === 'open_for_voting').length,
    inProgress: suggestions.filter(s => s.status === 'in_progress').length,
    published: suggestions.filter(s => s.status === 'published').length,
  }

  return (
    <div className="space-y-8 animate-fade-in">
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

        <div className="flex gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl">
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
