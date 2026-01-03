export type SuggestionStatus = 'hidden' | 'pending_review' | 'open_for_voting' | 'in_progress' | 'published'
export type Channel = 'cbb' | 'pmgpt'

export interface Suggestion {
  id: string
  title: string
  description: string
  requester_name: string
  requester_email: string
  channel: Channel
  status: SuggestionStatus
  video_url: string | null
  votes_count: number
  created_at: string
}

export interface Vote {
  id: string
  suggestion_id: string
  voter_email: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      suggestions: {
        Row: Suggestion
        Insert: {
          title: string
          description: string
          requester_name: string
          requester_email: string
          channel: Channel
          status: SuggestionStatus
          video_url?: string | null
          votes_count?: number
          created_at?: string
        }
        Update: {
          title?: string
          description?: string
          requester_name?: string
          requester_email?: string
          channel?: Channel
          status?: SuggestionStatus
          video_url?: string | null
          votes_count?: number
        }
      }
      votes: {
        Row: Vote
        Insert: {
          suggestion_id: string
          voter_email: string
        }
        Update: {
          suggestion_id?: string
          voter_email?: string
        }
      }
    }
  }
}
