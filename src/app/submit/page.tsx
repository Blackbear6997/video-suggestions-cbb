'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Suggestion } from '@/lib/database.types'

export default function SubmitPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester_name: '',
    requester_email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [similarSuggestions, setSimilarSuggestions] = useState<Suggestion[]>([])

  const searchSimilar = useCallback(async (title: string) => {
    if (title.length < 3) {
      setSimilarSuggestions([])
      return
    }

    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .ilike('title', `%${title}%`)
      .limit(5)

    if (data) {
      setSimilarSuggestions(data)
    }
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

    if (!formData.title || !formData.description || !formData.requester_name || !formData.requester_email) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('suggestions').insert([{
      title: formData.title,
      description: formData.description,
      requester_name: formData.requester_name,
      requester_email: formData.requester_email,
      status: 'hidden' as const,
      video_url: null,
    }])

    if (insertError) {
      setError('Failed to submit suggestion. Please try again.')
      setIsSubmitting(false)
      return
    }

    router.push('/?submitted=true')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Submit a Video Suggestion</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Video Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
            placeholder="What video would you like to see?"
          />
        </div>

        {similarSuggestions.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--warning)] rounded-lg p-4">
            <p className="text-sm text-[var(--warning)] font-medium mb-3">
              Similar suggestions already exist. Are you looking for one of these?
            </p>
            <div className="space-y-2">
              {similarSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 bg-[var(--background)] rounded border border-[var(--border)]"
                >
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-sm text-gray-500">
                    {suggestion.votes_count} votes - Status: {suggestion.status}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              If your suggestion is different, continue filling out the form below.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] resize-none"
            placeholder="Describe what the video should cover..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.requester_name}
              onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
              className="w-full px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.requester_email}
              onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
              className="w-full px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
              placeholder="john@example.com"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
        </button>
      </form>
    </div>
  )
}
