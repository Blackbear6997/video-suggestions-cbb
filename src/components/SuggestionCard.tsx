'use client'

import { useState } from 'react'
import type { Suggestion } from '@/lib/database.types'

interface SuggestionCardProps {
  suggestion: Suggestion
  onVote?: (id: string, email: string) => Promise<boolean>
  showVoteButton?: boolean
}

function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string | null; thumbnailUrl: string | null } {
  if (!url) return { type: null, embedUrl: null, thumbnailUrl: null }

  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (youtubeMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`
    }
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnailUrl: null // Vimeo thumbnails require API call
    }
  }

  // Direct video file
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
        className="inline-block mt-3 text-[var(--primary)] hover:underline"
      >
        Watch Video
      </a>
    )
  }

  // For YouTube, show thumbnail first, then embed on click
  if (type === 'youtube' && thumbnailUrl && !showPlayer) {
    return (
      <div
        className="mt-3 relative cursor-pointer group"
        onClick={() => setShowPlayer(true)}
      >
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full max-w-md rounded-lg border border-[var(--border)]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Show embedded player
  if (type === 'direct') {
    return (
      <video
        src={embedUrl}
        controls
        className="mt-3 w-full max-w-md rounded-lg border border-[var(--border)]"
      />
    )
  }

  return (
    <iframe
      src={embedUrl}
      className="mt-3 w-full max-w-md aspect-video rounded-lg border border-[var(--border)]"
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  )
}

const statusColors = {
  hidden: 'bg-purple-500',
  pending_review: 'bg-gray-500',
  open_for_voting: 'bg-blue-500',
  in_progress: 'bg-[var(--warning)]',
  published: 'bg-[var(--success)]',
}

const statusLabels = {
  hidden: 'Hidden',
  pending_review: 'Pending Review',
  open_for_voting: 'Open for Voting',
  in_progress: 'In Progress',
  published: 'Published',
}

export default function SuggestionCard({ suggestion, onVote, showVoteButton = true }: SuggestionCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [voteEmail, setVoteEmail] = useState('')
  const [showVoteForm, setShowVoteForm] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [localVotes, setLocalVotes] = useState(suggestion.votes_count)

  const handleVote = async () => {
    if (!voteEmail) {
      setVoteError('Please enter your email')
      return
    }

    setIsVoting(true)
    setVoteError('')

    try {
      const success = await onVote?.(suggestion.id, voteEmail)
      if (success) {
        setLocalVotes(prev => prev + 1)
        setShowVoteForm(false)
        setVoteEmail('')
      } else {
        setVoteError('You have already voted for this suggestion')
      }
    } catch {
      setVoteError('Failed to vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:border-[var(--primary)] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{suggestion.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColors[suggestion.status]}`}>
              {statusLabels[suggestion.status]}
            </span>
          </div>
          <p className="text-gray-400 mb-3">{suggestion.description}</p>
          <p className="text-sm text-gray-500">
            Requested by {suggestion.requester_name}
          </p>
          {suggestion.status === 'published' && suggestion.video_url && (
            <VideoEmbed url={suggestion.video_url} />
          )}
        </div>

        {showVoteButton && suggestion.status === 'open_for_voting' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary)]">{localVotes}</div>
              <div className="text-xs text-gray-500">votes</div>
            </div>

            {!showVoteForm ? (
              <button
                onClick={() => setShowVoteForm(true)}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors text-sm"
              >
                Vote
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  value={voteEmail}
                  onChange={(e) => setVoteEmail(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-sm w-40"
                />
                {voteError && <p className="text-red-500 text-xs">{voteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleVote}
                    disabled={isVoting}
                    className="px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded text-sm disabled:opacity-50"
                  >
                    {isVoting ? '...' : 'Submit'}
                  </button>
                  <button
                    onClick={() => {
                      setShowVoteForm(false)
                      setVoteError('')
                    }}
                    className="px-3 py-1.5 border border-[var(--border)] rounded text-sm hover:bg-[var(--card-hover)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(!showVoteButton || suggestion.status !== 'open_for_voting') && (
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--primary)]">{localVotes}</div>
            <div className="text-xs text-gray-500">votes</div>
          </div>
        )}
      </div>
    </div>
  )
}
