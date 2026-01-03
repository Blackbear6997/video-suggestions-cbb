import { NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Channel IDs for CBB and PMGPT
const CHANNELS = {
  cbb: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Will be replaced with actual ID
  pmgpt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Will be replaced with actual ID
}

interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnail: string
  duration: string
  videoType: 'short' | 'video' | 'live'
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

// Determine video type based on duration
function getVideoType(durationSeconds: number, isLive: boolean): 'short' | 'video' | 'live' {
  if (isLive) return 'live'
  if (durationSeconds <= 60) return 'short'
  return 'video'
}

async function getChannelId(handle: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${YOUTUBE_API_KEY}`
    )
    const data = await response.json()
    return data.items?.[0]?.id || null
  } catch {
    return null
  }
}

async function getChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
  try {
    // First get the uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    )
    const channelData = await channelResponse.json()
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) return []

    // Get videos from uploads playlist
    const videoIds: string[] = []
    const videoBasicInfo: Map<string, { title: string; description: string; publishedAt: string; thumbnail: string }> = new Map()
    let nextPageToken = ''

    while (videoIds.length < maxResults) {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
      )
      const playlistData = await playlistResponse.json()

      if (!playlistData.items) break

      for (const item of playlistData.items) {
        if (videoIds.length >= maxResults) break
        const videoId = item.snippet.resourceId.videoId
        videoIds.push(videoId)
        videoBasicInfo.set(videoId, {
          title: item.snippet.title,
          description: item.snippet.description?.substring(0, 500) || '',
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        })
      }

      nextPageToken = playlistData.nextPageToken
      if (!nextPageToken) break
    }

    // Fetch video details (duration, live status) in batches of 50
    const videos: YouTubeVideo[] = []
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50)
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,liveStreamingDetails&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`
      )
      const detailsData = await detailsResponse.json()

      for (const item of detailsData.items || []) {
        const basicInfo = videoBasicInfo.get(item.id)
        if (!basicInfo) continue

        const duration = item.contentDetails?.duration || 'PT0S'
        const durationSeconds = parseDuration(duration)
        const isLive = !!item.liveStreamingDetails

        videos.push({
          id: item.id,
          ...basicInfo,
          duration,
          videoType: getVideoType(durationSeconds, isLive),
        })
      }
    }

    return videos
  } catch (error) {
    console.error('Error fetching videos:', error)
    return []
  }
}

export async function GET(request: Request) {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') as 'cbb' | 'pmgpt' | null
  const maxResults = parseInt(searchParams.get('max') || '50')

  if (!channel || !['cbb', 'pmgpt'].includes(channel)) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }

  // Get channel ID from handle
  const handle = channel === 'cbb' ? 'OfficialChatbotBuilder' : 'PAYMEGPT'
  const channelId = await getChannelId(handle)

  if (!channelId) {
    return NextResponse.json({ error: 'Could not find channel' }, { status: 404 })
  }

  const videos = await getChannelVideos(channelId, maxResults)

  return NextResponse.json({ videos, channelId })
}
