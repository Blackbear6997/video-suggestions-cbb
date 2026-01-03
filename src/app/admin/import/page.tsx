'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Channel } from '@/lib/database.types'

interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnail: string
}

export default function ImportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [existingVideoIds, setExistingVideoIds] = useState<Set<string>>(new Set())
  const [channel, setChannel] = useState<Channel>('cbb')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return false
    }
    return true
  }, [router])

  useEffect(() => {
    checkAuth()
    fetchExistingVideos()
  }, [checkAuth])

  const fetchExistingVideos = async () => {
    const { data } = await supabase
      .from('suggestions')
      .select('video_url')
      .not('video_url', 'is', null)

    if (data) {
      const ids = new Set<string>()
      data.forEach(item => {
        if (item.video_url) {
          const match = item.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
          if (match) ids.add(match[1])
        }
      })
      setExistingVideoIds(ids)
    }
  }

  const fetchVideos = async () => {
    setLoading(true)
    setError('')
    setVideos([])
    setSelectedVideos(new Set())

    try {
      const response = await fetch(`/api/youtube?channel=${channel}&max=100`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setVideos(data.videos || [])
      }
    } catch {
      setError('Failed to fetch videos')
    } finally {
      setLoading(false)
    }
  }

  const toggleVideo = (videoId: string) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId)
    } else {
      newSelected.add(videoId)
    }
    setSelectedVideos(newSelected)
  }

  const selectAll = () => {
    const newVideos = videos.filter(v => !existingVideoIds.has(v.id))
    setSelectedVideos(new Set(newVideos.map(v => v.id)))
  }

  const selectNone = () => {
    setSelectedVideos(new Set())
  }

  const importVideos = async () => {
    if (selectedVideos.size === 0) return

    setImporting(true)
    setError('')
    setSuccessMessage('')

    const videosToImport = videos.filter(v => selectedVideos.has(v.id))
    let imported = 0

    for (const video of videosToImport) {
      const { error: insertError } = await supabase.from('suggestions').insert({
        title: video.title,
        description: video.description || 'No description',
        requester_name: 'YouTube Import',
        requester_email: 'import@videotutorhub.com',
        channel: channel,
        status: 'published',
        video_url: `https://www.youtube.com/watch?v=${video.id}`,
        votes_count: 0,
      })

      if (!insertError) {
        imported++
        existingVideoIds.add(video.id)
      }
    }

    setExistingVideoIds(new Set(existingVideoIds))
    setSelectedVideos(new Set())
    setSuccessMessage(`Successfully imported ${imported} videos!`)
    setImporting(false)
  }

  const newVideosCount = videos.filter(v => !existingVideoIds.has(v.id)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import YouTube Videos</h1>
          <p className="text-[var(--foreground-muted)]">
            Fetch videos from YouTube channels and import them as published suggestions
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)]"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Channel Selection */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-semibold mb-4">Select Channel</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setChannel('cbb')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              channel === 'cbb'
                ? 'bg-blue-500 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] hover:border-blue-500'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            ChatBot Builder (CBB)
          </button>
          <button
            onClick={() => setChannel('pmgpt')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              channel === 'pmgpt'
                ? 'bg-purple-500 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] hover:border-purple-500'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            PMGPT
          </button>
        </div>

        <button
          onClick={fetchVideos}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Fetch Videos
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* Videos List */}
      {videos.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Found {videos.length} videos ({newVideosCount} new)
              </h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                {selectedVideos.size} selected for import
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)]"
              >
                Select All New
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)]"
              >
                Select None
              </button>
              <button
                onClick={importVideos}
                disabled={selectedVideos.size === 0 || importing}
                className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${selectedVideos.size} Videos`}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {videos.map(video => {
              const alreadyExists = existingVideoIds.has(video.id)
              return (
                <div
                  key={video.id}
                  onClick={() => !alreadyExists && toggleVideo(video.id)}
                  className={`flex gap-4 p-3 rounded-lg border transition-all ${
                    alreadyExists
                      ? 'border-gray-700 opacity-50 cursor-not-allowed'
                      : selectedVideos.has(video.id)
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 cursor-pointer'
                      : 'border-[var(--border)] hover:border-[var(--border-hover)] cursor-pointer'
                  }`}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    <p className="text-sm text-[var(--foreground-muted)] line-clamp-2">
                      {video.description || 'No description'}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {alreadyExists ? (
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                        Already imported
                      </span>
                    ) : (
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        selectedVideos.has(video.id)
                          ? 'border-[var(--primary)] bg-[var(--primary)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {selectedVideos.has(video.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
