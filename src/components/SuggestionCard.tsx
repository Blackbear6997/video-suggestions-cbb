'use client'

import { useState } from 'react'
import type { Suggestion } from '@/lib/database.types'

interface SuggestionCardProps {
  suggestion: Suggestion
  onVote?: (id: string, email: string) => Promise<boolean>
  showVoteButton?: boolean
}

const statusColors = {
  pending: 'bg-gray-500',
  in_progress: 'bg-[var(--warning)]',
  published: 'bg-[var(--success)]',
}

const statusLabels = {
  pending: 'Pending',
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
            <a
              href={suggestion.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-[var(--primary)] hover:underline"
            >
              Watch Video
            </a>
          )}
        </div>

        {showVoteButton && suggestion.status === 'pending' && (
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

        {!showVoteButton && (
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--primary)]">{localVotes}</div>
            <div className="text-xs text-gray-500">votes</div>
          </div>
        )}
      </div>
    </div>
  )
}
