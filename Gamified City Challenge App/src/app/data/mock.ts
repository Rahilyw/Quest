export const COLORS = {
  primary: '#4364F7',
  primaryLight: '#6B8EFF',
  highlight: '#FF6B35',
  bg: '#E8F3FF',
  bgOuter: '#C4DBFF',
  navy: '#0D1B3E',
  muted: '#6B7FA3',
  white: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const

export type Tab = 'explore' | 'feed' | 'rankings' | 'badges' | 'profile'
export type QuestFilter = 'ALL' | 'FITNESS' | 'SOCIAL' | 'FOOD'

export const QUESTS = [
  {
    id: 1,
    title: 'Run the Galloping Goose Trail',
    desc: 'Complete a 5km segment of Victoria\'s most iconic multi-use trail experience.',
    category: 'FITNESS' as QuestFilter,
    xp: 350,
    difficulty: 'MEDIUM',
    img: 'https://images.unsplash.com/photo-1629495063801-c1040fa82533?w=700&h=440&fit=crop&auto=format',
    tag: 'TRAIL',
    completions: 142,
    diffColor: '#F59E0B',
  },
  {
    id: 2,
    title: 'Sunset at Mount Tolmie',
    desc: 'Scale the peak for the best 360-degree golden-hour views in the city.',
    category: 'FITNESS' as QuestFilter,
    xp: 250,
    difficulty: 'EASY',
    img: 'https://images.unsplash.com/photo-1526268072039-3e33e8f0e379?w=700&h=440&fit=crop&auto=format',
    tag: 'VIEWS',
    completions: 89,
    diffColor: '#22C55E',
  },
  {
    id: 3,
    title: 'Grab a Cold Brew at Discovery',
    desc: 'Recharge with a locally roasted cold brew from the city\'s favourite coffee spot.',
    category: 'SOCIAL' as QuestFilter,
    xp: 150,
    difficulty: 'EASY',
    img: 'https://images.unsplash.com/photo-1634709170162-23a76022e9c9?w=700&h=440&fit=crop&auto=format',
    tag: 'FOOD',
    completions: 217,
    diffColor: '#22C55E',
  },
  {
    id: 4,
    title: 'Kayak the Inner Harbour',
    desc: 'Paddle around the harbour and snap a photo with the Empress in the background.',
    category: 'FITNESS' as QuestFilter,
    xp: 400,
    difficulty: 'HARD',
    img: 'https://images.unsplash.com/photo-1639506483050-2d0282607438?w=700&h=440&fit=crop&auto=format',
    tag: 'WATER',
    completions: 54,
    diffColor: '#EF4444',
  },
]

export const PLAYERS = [
  { rank: 1, name: 'Marcus B.', level: 12, title: 'LEGEND', xp: 4200, initials: 'MB', color: '#4364F7' },
  { rank: 2, name: 'Sarah L.', level: 10, title: 'EXPLORER', xp: 3850, initials: 'SL', color: '#FF6B8A' },
  { rank: 3, name: 'Jon J.', level: 9, title: 'EXPLORER', xp: 3500, initials: 'JJ', color: '#22C55E' },
  { rank: 4, name: 'Elena R.', level: 7, title: 'SEEKER', xp: 3120, initials: 'ER', color: '#F59E0B', emojis: '🔥 🎯' },
  { rank: 5, name: 'Tom H.', level: 6, title: 'NOMAD', xp: 2950, initials: 'TH', color: '#8B5CF6', emojis: '🔥 🌿' },
]

export const FEED = [
  {
    id: 1,
    user: { name: 'Marcus K.', level: 8, initials: 'MK', color: '#4364F7' },
    quest: 'Run the Galloping Goose Trail',
    caption: 'Finally got a clear morning. The light through the trees was unreal 🙌',
    img: 'https://images.unsplash.com/photo-1618877739333-b1ccc075870b?w=700&h=440&fit=crop&auto=format',
    likes: 23,
    comments: 7,
    time: '14 min ago',
    xp: 350,
  },
  {
    id: 2,
    user: { name: 'Jess T.', level: 5, initials: 'JT', color: '#FF6B8A' },
    quest: 'Sunset at Mount Tolmie',
    caption: 'Absolutely worth the climb. Going back tomorrow 🔥',
    img: 'https://images.unsplash.com/photo-1629495063801-c1040fa82533?w=700&h=440&fit=crop&auto=format',
    likes: 17,
    comments: 4,
    time: '2 hr ago',
    xp: 250,
  },
]

export const BADGES = [
  { id: 1, name: 'Early Bird', emoji: '🐦', desc: 'Complete a quest before 7am', earned: true, rarity: 'COMMON', rarityColor: '#6B7FA3' },
  { id: 2, name: 'Trail Master', emoji: '🏔️', desc: 'Run 25km total on trail quests', earned: true, rarity: 'RARE', rarityColor: '#4364F7' },
  { id: 3, name: 'Social Butterfly', emoji: '🦋', desc: 'Complete 5 social quests in a week', earned: true, rarity: 'COMMON', rarityColor: '#6B7FA3' },
  { id: 4, name: 'Night Owl', emoji: '🦉', desc: 'Complete a quest after 9pm', earned: false, rarity: 'RARE', rarityColor: '#4364F7' },
  { id: 5, name: 'Explorer Elite', emoji: '⭐', desc: 'Reach LV 10 Explorer status', earned: false, rarity: 'LEGENDARY', rarityColor: '#F59E0B' },
  { id: 6, name: 'Rain Warrior', emoji: '⛈️', desc: 'Complete a quest in the rain', earned: false, rarity: 'EPIC', rarityColor: '#8B5CF6' },
]
