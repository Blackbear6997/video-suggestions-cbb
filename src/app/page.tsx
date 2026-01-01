'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Suggestion } from '@/lib/database.types'
import SuggestionCard from '@/components/SuggestionCard'
import SearchBar from '@/components/SearchBar'

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'published'

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
      const visibleSuggestions = data.filter(s => s.status !== 'hidden')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-3xl font-bold">Video Suggestions</h1>
        <a
          href="/submit"
          className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors"
        >
          Submit a Suggestion
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar onSearch={setSearchQuery} />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'published'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                filter === status
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)]'
              }`}
            >
              {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading suggestions...</div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No suggestions found matching your search.' : 'No suggestions yet. Be the first to submit one!'}
        </div>
      ) : (
        <div className="space-y-4">
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
