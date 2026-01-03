'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Suggestion, Channel } from '@/lib/database.types'

const statusConfig = {
  open_for_voting: { color: 'bg-[#36D6B5]/20 text-[#36D6B5] border-[#36D6B5]/30', label: 'Open for Voting' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'In Progress' },
  published: { color: 'bg-[#36D6B5]/20 text-[#36D6B5] border-[#36D6B5]/30', label: 'Published' },
}

export default function SubmitPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester_name: '',
    requester_email: '',
    channel: '' as Channel | '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [similarSuggestions, setSimilarSuggestions] = useState<Suggestion[]>([])

  const searchSimilar = useCallback(async (title: string) => {
    // Extract meaningful words (3+ chars, not common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'why', 'when', 'where', 'who', 'which', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'your', 'you', 'use', 'using', 'make', 'get', 'into'])

    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word))

    if (words.length === 0) {
      setSimilarSuggestions([])
      return
    }

    // Fetch all visible suggestions and score them client-side
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .in('status', ['open_for_voting', 'in_progress', 'published'])

    if (!data) {
      setSimilarSuggestions([])
      return
    }

    // Score each suggestion based on word matches in title
    const scored = data.map(suggestion => {
      const suggestionTitle = suggestion.title.toLowerCase()
      const suggestionWords = suggestionTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/)

      let score = 0
      for (const word of words) {
        // Exact word match in title (highest score)
        if (suggestionWords.includes(word)) {
          score += 10
        }
        // Partial match - word appears within a title word (lower score)
        else if (suggestionWords.some((sw: string) => sw.includes(word) || word.includes(sw))) {
          score += 3
        }
      }

      return { suggestion, score }
    })

    // Filter to only suggestions with meaningful matches, sort by score
    const matches = scored
      .filter(s => s.score >= 10) // At least one exact word match
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.suggestion)

    setSimilarSuggestions(matches)
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchSimilar(formData.title)
    }, 300)

    return () => clearTimeout(debounce)
  }, [formData.title, searchSimilar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!formData.title || !formData.description || !formData.requester_name || !formData.requester_email || !formData.channel) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('suggestions').insert([{
      title: formData.title,
      description: formData.description,
      requester_name: formData.requester_name,
      requester_email: formData.requester_email,
      channel: formData.channel,
      status: 'hidden' as const,
      video_url: null,
    }])

    if (insertError) {
      console.error('Submit error:', insertError)
      setError(`Failed to submit: ${insertError.message}`)
      setIsSubmitting(false)
      return
    }

    router.push('/?submitted=true')
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-4 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to suggestions
        </Link>
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">Request a Video</span>
        </h1>
        <p className="text-[var(--foreground-muted)]">
          Have an idea for a video? Submit your suggestion and let others vote on it!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-[var(--foreground)]">
            Video Title
          </label>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)]"
              placeholder="What video would you like to see?"
            />
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Which channel is this for? <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, channel: 'cbb' })}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                formData.channel === 'cbb'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]'
              }`}
            >
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className={`font-semibold ${formData.channel === 'cbb' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                ChatBot Builder
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">@OfficialChatbotBuilder</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, channel: 'pmgpt' })}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                formData.channel === 'pmgpt'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]'
              }`}
            >
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className={`font-semibold ${formData.channel === 'pmgpt' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                PMGPT
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">@PAYMEGPT</span>
            </button>
          </div>
        </div>

        {/* Similar Suggestions Warning */}
        {similarSuggestions.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-400 mb-3">
                  Similar suggestions already exist
                </p>
                <div className="space-y-2">
                  {similarSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]"
                    >
                      <p className="font-medium text-[var(--foreground)]">{suggestion.title}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-[var(--foreground-muted)]">
                          {suggestion.votes_count} votes
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusConfig[suggestion.status as keyof typeof statusConfig]?.color || ''}`}>
                          {statusConfig[suggestion.status as keyof typeof statusConfig]?.label || suggestion.status}
                        </span>
                        {suggestion.status === 'open_for_voting' && (
                          <Link href="/" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                            Vote for this instead
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                        {suggestion.status === 'published' && suggestion.video_url && (
                          <a href={suggestion.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                            Watch video
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-3">
                  If your suggestion is different, continue filling out the form below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)]">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)] resize-none"
            placeholder="Describe what the video should cover, why it would be useful, and any specific topics you'd like addressed..."
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)]">
              Your Name
            </label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                id="name"
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)]"
                placeholder="John Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
              Your Email
            </label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                id="email"
                value={formData.requester_email}
                onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-muted)]"
                placeholder="john@example.com"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-4 rounded-xl font-semibold text-white text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Submit Request
            </>
          )}
        </button>

      </form>
    </div>
  )
}
