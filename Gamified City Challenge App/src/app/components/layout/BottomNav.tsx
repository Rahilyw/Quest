import { Bell, Compass, Trophy, User, Award, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { COLORS } from '../data/mock'
import type { Tab } from '../data/mock'

export const NAV_ITEMS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'explore', label: 'Explore', icon: <Compass size={20} /> },
  { id: 'feed', label: 'Quests', icon: <MapPin size={20} /> },
  { id: 'rankings', label: 'Rankings', icon: <Trophy size={20} /> },
  { id: 'badges', label: 'Badges', icon: <Award size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
]

export function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-around px-2"
      style={{
        background: COLORS.white,
        borderTop: '1px solid rgba(67,100,247,0.08)',
        paddingTop: 10,
        paddingBottom: 18,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = tab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="flex flex-col items-center gap-0.5 transition-all active:scale-95 relative"
            style={{ minWidth: 52 }}
          >
            {active && (
              <motion.div
                layoutId="nav-pill"
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full"
                style={{ background: COLORS.primary }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <div className="relative z-10" style={{ color: active ? '#fff' : COLORS.muted }}>
              {item.icon}
            </div>
            <span
              className="text-[10px] font-bold relative z-10"
              style={{ color: active ? COLORS.primary : COLORS.muted }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AppBrandHeader({
  subtitle,
  showBell,
  trailing,
}: {
  subtitle?: string
  showBell?: boolean
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: COLORS.primary }}>
            QUEST!
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: COLORS.highlight }}
          >
            Victoria, BC
          </span>
        </div>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{subtitle}</p>
        )}
      </div>
      {showBell ? (
        <div className="relative">
          <Bell size={22} style={{ color: COLORS.navy }} />
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: COLORS.highlight }}
          >
            3
          </span>
        </div>
      ) : (
        trailing
      )}
    </div>
  )
}
