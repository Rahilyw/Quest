export type QuestCategory = 'fitness' | 'social' | 'food' | 'community' | 'nature'

export type GeofenceType = 'none' | 'circle' | 'city' | 'polygon' | 'multi'

/** GeoJSON Polygon geometry, as exposed by quests.boundary_geojson (migration 015). */
export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: number[][][]
}

export type QuestGeofenceShape = 'circle' | 'polygon'

/** One completion area on a multi-geofence quest (migration 025). */
export interface QuestGeofenceLocation {
  id: string
  label: string
  shape: QuestGeofenceShape
  lat: number | null
  lng: number | null
  radius_meters: number | null
  boundary_geojson?: PolygonGeometry | null
  sort_order?: number
}

export type QuestStatus = 'active' | 'inactive'

export type CompletionStatus = 'pending' | 'approved' | 'rejected' | 'removed'

export interface Quest {
  id: string
  title: string
  description: string
  category: QuestCategory
  geofence_type: GeofenceType
  city_id: string | null
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
  /** Drawn perimeter for polygon quests; generated server-side, read-only. */
  boundary_geojson?: PolygonGeometry | null
  /** Child areas when geofence_type is multi */
  quest_geofences?: QuestGeofenceLocation[] | null
  /** WebP cutout asset with pre-baked shadow (migration 032). */
  cutout_url?: string | null
  /** Short verb phrase shown on the card, e.g. "Take a photo at..." */
  action_phrase?: string | null
  /** Approximate walking/travel distance for this quest in metres. */
  distance_m?: number | null
  /** Approximate time-to-complete in minutes. */
  duration_min?: number | null
  /** Inclusive start. Null means already available. */
  active_from?: string | null
  /** Exclusive end. Null means no end. */
  active_until?: string | null
  /** One currently live quest recommended to players before their first completion. */
  is_starter?: boolean
  /** Set when the quest was published from a player suggestion. */
  suggested_by?: string | null
  suggester_username?: string | null
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
  gps_accuracy?: number | null
  completed_at: string
  status: CompletionStatus
  redemption_code: string | null
  redeemed_at?: string | null
  /** Optional selfie uploaded as proof; served via signed URL only (migration 032). */
  selfie_url?: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlock_condition: string
  icon_url?: string | null
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  art_style?: 'medal' | 'animated' | 'pixel'
  locked_hint?: string | null
  is_secret?: boolean
  art_key?: string | null
  sort_order?: number
  is_active?: boolean
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
  last_week_rank: number | null
  feed_public: boolean
  /** Push for comments / replies / follows (029). Inbox is unaffected. */
  push_social: boolean
  /** Monday drop pushes (034). */
  push_drops?: boolean
  created_at: string
}

export interface CompletionLike {
  completion_id: string
  user_id: string
  created_at: string
}

export interface CompletionComment {
  id: string
  completion_id: string
  user_id: string
  /** null = top-level; replies are one level deep */
  parent_id: string | null
  body: string
  hidden: boolean
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface AppNotification {
  id: string
  recipient_id: string
  actor_id: string
  type: 'like' | 'comment' | 'reply' | 'follow'
  completion_id: string | null
  comment_id: string | null
  read_at: string | null
  pushed_at: string | null
  created_at: string
}

export interface LeaderboardRow {
  user_id: string
  username: string
  avatar_url: string | null
  weekly_xp: number
  level: number
  last_week_rank: number | null
}

export interface LeaderboardEntry extends LeaderboardRow {
  rank: number
}

export type Database = {
  public: {
    Tables: {
      quests: {
        Row: Quest
        Insert: Omit<Quest, 'id' | 'created_at' | 'boundary_geojson'>
        Update: Partial<Omit<Quest, 'id' | 'created_at' | 'boundary_geojson'>>
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
      completion_likes: {
        Row: CompletionLike
        Insert: Omit<CompletionLike, 'created_at'>
        Update: never
        Relationships: []
      }
      completion_comments: {
        Row: CompletionComment
        Insert: Omit<CompletionComment, 'id' | 'created_at' | 'hidden'> & { hidden?: boolean }
        Update: Partial<Pick<CompletionComment, 'body' | 'hidden'>>
        Relationships: []
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'created_at'>
        Update: never
        Relationships: []
      }
      notifications: {
        Row: AppNotification
        Insert: never
        Update: Pick<AppNotification, 'read_at'>
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
