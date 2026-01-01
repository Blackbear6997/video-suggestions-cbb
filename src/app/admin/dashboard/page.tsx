'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Suggestion, SuggestionStatus } from '@/lib/database.types'

export default function AdminDashboard() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SuggestionStatus | 'all'>('hidden')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return false
    }
    return true
  }, [router])

  const fetchSuggestions = useCallback(async () => {
    const isAuthed = await checkAuth()
    if (!isAuthed) return

    setLoading(true)
    let query = supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (!error && data) {
      setSuggestions(data)
    }
    setLoading(false)
  }, [filter, checkAuth])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  const updateStatus = async (id: string, status: SuggestionStatus) => {
    const { error } = await supabase
      .from('suggestions')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setSuggestions(prev =>
        prev.map(s => (s.id === id ? { ...s, status } : s))
      )
    }
  }

  const publishVideo = async (id: string) => {
    if (!videoUrl) return

    const { error } = await supabase
      .from('suggestions')
      .update({ status: 'published', video_url: videoUrl })
      .eq('id', id)

    if (!error) {
      setSuggestions(prev =>
        prev.map(s => (s.id === id ? { ...s, status: 'published', video_url: videoUrl } : s))
      )
      setEditingId(null)
      setVideoUrl('')
    }
  }

  const deleteSuggestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return

    await supabase.from('votes').delete().eq('suggestion_id', id)

    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', id)

    if (!error) {
      setSuggestions(prev => prev.filter(s => s.id !== id))
    }
  }

  const statusColors: Record<SuggestionStatus, string> = {
    hidden: 'bg-purple-500',
    pending_review: 'bg-gray-500',
    open_for_voting: 'bg-blue-500',
    in_progress: 'bg-[var(--warning)]',
    published: 'bg-[var(--success)]',
  }

  const statusLabels: Record<SuggestionStatus, string> = {
    hidden: 'Hidden',
    pending_review: 'Pending Review',
    open_for_voting: 'Open for Voting',
    in_progress: 'In Progress',
    published: 'Published',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'hidden', 'pending_review', 'open_for_voting', 'in_progress', 'published'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              filter === status
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)]'
            }`}
          >
            {status === 'all' ? 'All' : statusLabels[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No suggestions found</div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColors[suggestion.status]}`}>
                      {statusLabels[suggestion.status]}
                    </span>
                    <span className="text-sm text-gray-500">{suggestion.votes_count} votes</span>
                  </div>
                  <p className="text-gray-400 mb-2">{suggestion.description}</p>
                  <p className="text-sm text-gray-500">
                    By {suggestion.requester_name} ({suggestion.requester_email})
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(suggestion.created_at).toLocaleDateString()}
                  </p>
                  {suggestion.video_url && (
                    <a
                      href={suggestion.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-[var(--primary)] hover:underline text-sm"
                    >
                      {suggestion.video_url}
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {/* Hidden -> Pending Review */}
                  {suggestion.status === 'hidden' && (
                    <button
                      onClick={() => updateStatus(suggestion.id, 'pending_review')}
                      className="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:opacity-80"
                    >
                      Review
                    </button>
                  )}

                  {/* Pending Review -> Open for Voting or back to Hidden */}
                  {suggestion.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'open_for_voting')}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:opacity-80"
                      >
                        Open for Voting
                      </button>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'hidden')}
                        className="px-3 py-1.5 border border-[var(--border)] rounded text-sm hover:bg-[var(--card-hover)]"
                      >
                        Reject (Hide)
                      </button>
                    </>
                  )}

                  {/* Open for Voting -> In Progress */}
                  {suggestion.status === 'open_for_voting' && (
                    <>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'in_progress')}
                        className="px-3 py-1.5 bg-[var(--warning)] text-white rounded text-sm hover:opacity-80"
                      >
                        Start Working
                      </button>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'pending_review')}
                        className="px-3 py-1.5 border border-[var(--border)] rounded text-sm hover:bg-[var(--card-hover)]"
                      >
                        Back to Review
                      </button>
                    </>
                  )}

                  {/* In Progress -> Publish */}
                  {suggestion.status === 'in_progress' && (
                    <>
                      {editingId === suggestion.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="url"
                            placeholder="Video URL"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-sm w-48"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => publishVideo(suggestion.id)}
                              className="px-3 py-1.5 bg-[var(--success)] text-white rounded text-sm hover:opacity-80"
                            >
                              Publish
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setVideoUrl('')
                              }}
                              className="px-3 py-1.5 border border-[var(--border)] rounded text-sm hover:bg-[var(--card-hover)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(suggestion.id)}
                          className="px-3 py-1.5 bg-[var(--success)] text-white rounded text-sm hover:opacity-80"
                        >
                          Add Video & Publish
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(suggestion.id, 'open_for_voting')}
                        className="px-3 py-1.5 border border-[var(--border)] rounded text-sm hover:bg-[var(--card-hover)]"
                      >
                        Back to Voting
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => deleteSuggestion(suggestion.id)}
                    className="px-3 py-1.5 border border-red-500 text-red-500 rounded text-sm hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
