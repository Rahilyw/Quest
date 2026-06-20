export type QuestCategory = 'fitness' | 'social' | 'food' | 'community' | 'nature'

export type QuestStatus = 'active' | 'inactive'

export type CompletionStatus = 'pending' | 'approved' | 'rejected'

export interface Quest {
  id: string
  title: string
  description: string
  category: QuestCategory
  lat: number
  lng: number
  radius_meters: number
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  sponsor_reward: string | null
  status: QuestStatus
  created_at: string
}

export interface Completion {
  id: string
  user_id: string
  quest_id: string
  photo_url: string
  lat: number
  lng: number
  completed_at: string
  status: CompletionStatus
  redemption_code: string | null
  quest?: Quest
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlock_condition: string
}

export interface UserBadge {
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface UserProfile {
  id: string
  username: string
  city: string
  total_xp: number
  level: number
  avatar_url: string | null
  push_token: string | null
  current_streak: number
  longest_streak: number
  last_completion_week: string | null
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  avatar_url: string | null
  weekly_xp: number
  rank: number
}

// Supabase generated types placeholder — replace with `supabase gen types` output
export type Database = {
  public: {
    Tables: {
      quests: { Row: Quest; Insert: Omit<Quest, 'id' | 'created_at'>; Update: Partial<Quest> }
      completions: { Row: Completion; Insert: Omit<Completion, 'id'>; Update: Partial<Completion> }
      profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'push_token' | 'current_streak' | 'longest_streak' | 'last_completion_week'> & { push_token?: string | null }
        Update: Partial<UserProfile>
      }
      badges: { Row: Badge; Insert: Omit<Badge, 'id'>; Update: Partial<Badge> }
      user_badges: { Row: UserBadge; Insert: UserBadge; Update: never }
    }
    Views: {
      leaderboard: { Row: LeaderboardEntry }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
