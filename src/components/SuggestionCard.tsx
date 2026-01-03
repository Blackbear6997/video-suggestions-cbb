'use client'

import { useState, useEffect } from 'react'
import type { Suggestion } from '@/lib/database.types'

interface SuggestionCardProps {
  suggestion: Suggestion
  onVote?: (id: string) => Promise<boolean>
  showVoteButton?: boolean
}

function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string | null; thumbnailUrl: string | null } {
  if (!url) return { type: null, embedUrl: null, thumbnailUrl: null }

  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (youtubeMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`
    }
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnailUrl: null
    }
  }

  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return { type: 'direct', embedUrl: url, thumbnailUrl: null }
  }

  return { type: null, embedUrl: null, thumbnailUrl: null }
}

function VideoEmbed({ url }: { url: string }) {
  const [showPlayer, setShowPlayer] = useState(false)
  const { type, embedUrl, thumbnailUrl } = getVideoEmbed(url)

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Watch Video
      </a>
    )
  }

  if (type === 'youtube' && thumbnailUrl && !showPlayer) {
    return (
      <div
        className="relative cursor-pointer group w-full md:w-80 overflow-hidden rounded-xl"
        onClick={() => setShowPlayer(true)}
      >
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full rounded-xl block transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'direct') {
    return (
      <video
        src={embedUrl}
        controls
        className="w-full md:w-80 rounded-xl"
      />
    )
  }

  return (
    <iframe
      src={embedUrl}
      className="w-full md:w-80 aspect-video rounded-xl"
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  )
}

const statusConfig = {
  hidden: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Hidden' },
  pending_review: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Pending Review' },
  open_for_voting: { color: 'bg-[#36D6B5]/20 text-[#36D6B5] border-[#36D6B5]/30', label: 'Open for Voting' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'In Progress' },
  published: { color: 'bg-[#36D6B5]/20 text-[#36D6B5] border-[#36D6B5]/30', label: 'Published' },
}

const channelConfig = {
  cbb: { label: 'CBB', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pmgpt: { label: 'PMGPT', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
}

// Helper to check if user has voted for a suggestion
function hasVotedFor(suggestionId: string): boolean {
  if (typeof window === 'undefined') return false
  const votes = JSON.parse(localStorage.getItem('voted_suggestions') || '[]')
  return votes.includes(suggestionId)
}

// Helper to mark suggestion as voted
function markAsVoted(suggestionId: string): void {
  if (typeof window === 'undefined') return
  const votes = JSON.parse(localStorage.getItem('voted_suggestions') || '[]')
  if (!votes.includes(suggestionId)) {
    votes.push(suggestionId)
    localStorage.setItem('voted_suggestions', JSON.stringify(votes))
  }
}

export default function SuggestionCard({ suggestion, onVote, showVoteButton = true }: SuggestionCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [localVotes, setLocalVotes] = useState(suggestion.votes_count)
  const [hasVoted, setHasVoted] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    setHasVoted(hasVotedFor(suggestion.id))
  }, [suggestion.id])

  const handleVote = async () => {
    if (hasVoted) return

    setIsVoting(true)
    setVoteError('')

    try {
      const success = await onVote?.(suggestion.id)
      if (success) {
        setLocalVotes(prev => prev + 1)
        markAsVoted(suggestion.id)
        setHasVoted(true)
      } else {
        setVoteError('Vote failed. Please try again.')
      }
    } catch {
      setVoteError('Failed to vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  // Published video layout
  if (suggestion.status === 'published' && suggestion.video_url) {
    return (
      <div className="card-hover bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h3 className="text-xl font-semibold">{suggestion.title}</h3>
          {suggestion.channel && channelConfig[suggestion.channel] && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${channelConfig[suggestion.channel].color}`}>
              {channelConfig[suggestion.channel].label}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[suggestion.status].color}`}>
            {statusConfig[suggestion.status].label}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:flex-shrink-0">
            <VideoEmbed url={suggestion.video_url} />
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[var(--foreground-muted)] mb-4 leading-relaxed">{suggestion.description}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Requested by {suggestion.requester_name}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[var(--foreground-muted)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="font-semibold text-[var(--foreground)]">{localVotes}</span> votes
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular card layout
  return (
    <div className="card-hover bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-xl font-semibold">{suggestion.title}</h3>
            {suggestion.channel && channelConfig[suggestion.channel] && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${channelConfig[suggestion.channel].color}`}>
                {channelConfig[suggestion.channel].label}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[suggestion.status].color}`}>
              {statusConfig[suggestion.status].label}
            </span>
          </div>
          <p className="text-[var(--foreground-muted)] mb-4 leading-relaxed">{suggestion.description}</p>
          <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Requested by {suggestion.requester_name}
          </div>
        </div>

        {/* Vote section */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)]/10 to-[var(--gradient-end)]/10 border border-[var(--border)] flex flex-col items-center justify-center">
            <div className="text-2xl font-bold gradient-text">{localVotes}</div>
            <div className="text-xs text-[var(--foreground-muted)]">votes</div>
          </div>

          {showVoteButton && suggestion.status === 'open_for_voting' && !hasVoted && (
            <div className="flex flex-col gap-2 w-full">
              {voteError && <p className="text-red-400 text-xs text-center">{voteError}</p>}
              <button
                onClick={handleVote}
                disabled={isVoting}
                className="btn-primary w-full px-4 py-2.5 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVoting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Vote
                  </>
                )}
              </button>
            </div>
          )}

          {hasVoted && (
            <div className="text-emerald-400 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Voted!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
