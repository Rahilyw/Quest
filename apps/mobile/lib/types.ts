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
  cover_image_url?: string | null
}

export interface QuestWithBadges extends Quest {
  badges: Badge[]
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
}

export interface UserBadgeWithBadge extends UserBadge {
  badge?: Badge
}

export interface CompletionWithQuest extends Completion {
  quest?: Pick<Quest, 'title' | 'category' | 'xp_reward' | 'is_sponsored'> | null
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

export interface LeaderboardRow {
  user_id: string
  username: string
  avatar_url: string | null
  weekly_xp: number
}

export interface LeaderboardEntry extends LeaderboardRow {
  rank: number
}

export type Database = {
  public: {
    Tables: {
      quests: {
        Row: Quest
        Insert: Omit<Quest, 'id' | 'created_at'>
        Update: Partial<Omit<Quest, 'id' | 'created_at'>>
        Relationships: []
      }
      completions: {
        Row: Completion
        Insert: Omit<Completion, 'id'>
        Update: Partial<Omit<Completion, 'id'>>
        Relationships: []
      }
      profiles: {
        Row: UserProfile
        Insert: {
          id: string
          username: string
          city: string
          total_xp?: number
          level?: number
          avatar_url?: string | null
          push_token?: string | null
        }
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
        Relationships: []
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, 'id'>
        Update: Partial<Omit<Badge, 'id'>>
        Relationships: []
      }
      user_badges: {
        Row: UserBadge
        Insert: UserBadge
        Update: Partial<UserBadge>
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: LeaderboardRow
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
  }
}
