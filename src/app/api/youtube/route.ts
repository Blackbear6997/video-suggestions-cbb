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
    const videos: YouTubeVideo[] = []
    let nextPageToken = ''

    while (videos.length < maxResults) {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
      )
      const playlistData = await playlistResponse.json()

      if (!playlistData.items) break

      for (const item of playlistData.items) {
        if (videos.length >= maxResults) break
        videos.push({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description?.substring(0, 500) || '',
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        })
      }

      nextPageToken = playlistData.nextPageToken
      if (!nextPageToken) break
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
