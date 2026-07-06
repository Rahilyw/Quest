import { useState } from "react";
import {
  Heart, MessageCircle, Share2, MapPin, Check, Lock, Trophy
} from "lucide-react";
import { motion } from "motion/react";
import { BottomNav, AppBrandHeader } from "./components/layout/BottomNav";
import {
  QUESTS, PLAYERS, FEED, BADGES, COLORS,
  type Tab, type QuestFilter,
} from "./data/mock";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function XPBar({ current, max, color = "#22C55E" }: { current: number; max: number; color?: string }) {
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
      />
    </div>
  );
}

function DiffBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
      {label}
    </span>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function ExploreScreen({ filter, setFilter }: { filter: QuestFilter; setFilter: (f: QuestFilter) => void }) {
  const [started, setStarted] = useState<Set<number>>(new Set());
  const filtered = filter === "ALL" ? QUESTS : QUESTS.filter((q) => q.category === filter);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <AppBrandHeader subtitle="Week 24 · 3 days left" showBell />
      </div>

      {/* Player card */}
      <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #4364F7, #6B8EFF)" }}>
        <div className="flex items-center gap-3">
          <Avatar initials="YO" color="rgba(255,255,255,0.3)" size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70">LV 4</span>
              <span className="text-xs font-black text-white tracking-wider">EXPLORER</span>
            </div>
            <XPBar current={3450} max={4000} color="#FFFFFF" />
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>3,450 / 4,000 XP · Rank #12 this week</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">+0</p>
            <p className="text-[10px] text-white/60">today</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {(["ALL", "FITNESS", "SOCIAL", "FOOD"] as QuestFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={
                filter === f
                  ? { background: "#0D1B3E", color: "#fff" }
                  : { background: "rgba(255,255,255,0.7)", color: "#6B7FA3" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Quest cards */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {filtered.map((quest, i) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-3xl overflow-hidden shadow-lg"
            style={{ background: "#fff" }}
          >
            <div className="relative h-44">
              <img
                src={quest.img}
                alt={quest.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,27,62,0.85) 0%, transparent 55%)" }} />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white tracking-wider" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                  {quest.tag}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "#4364F7" }}>
                  +{quest.xp} XP
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-base font-black text-white leading-tight">{quest.title}</h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#6B7FA3" }}>{quest.desc}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DiffBadge label={quest.difficulty} color={quest.diffColor} />
                  <span className="text-[10px]" style={{ color: "#6B7FA3" }}>
                    {quest.completions} completed
                  </span>
                </div>
                <button
                  onClick={() => setStarted((prev) => { const s = new Set(prev); s.has(quest.id) ? s.delete(quest.id) : s.add(quest.id); return s; })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                  style={{ background: started.has(quest.id) ? "#22C55E" : "#4364F7" }}
                >
                  {started.has(quest.id) ? <><Check size={12} /> STARTED</> : "START QUEST"}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FeedScreen({ liked, setLiked }: { liked: Set<number>; setLiked: (s: Set<number>) => void }) {
  const toggleLike = (id: number) => {
    const s = new Set(liked);
    s.has(id) ? s.delete(id) : s.add(id);
    setLiked(s);
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <AppBrandHeader trailing={<span className="text-sm font-bold" style={{ color: COLORS.navy }}>Activity Feed</span>} />
      </div>

      {/* Map placeholder */}
      <div className="mx-5 mb-4 rounded-3xl overflow-hidden relative h-44 shadow-md">
        <div
          className="w-full h-full"
          style={{
            background: "linear-gradient(135deg, #bcd4f0 0%, #cde0f5 40%, #d9ebff 100%)",
            position: "relative",
          }}
        >
          {/* Stylised map grid */}
          <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 390 176" preserveAspectRatio="xMidYMid slice">
            <line x1="0" y1="44" x2="390" y2="44" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="0" y1="88" x2="390" y2="88" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="0" y1="132" x2="390" y2="132" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="65" y1="0" x2="65" y2="176" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="130" y1="0" x2="130" y2="176" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="195" y1="0" x2="195" y2="176" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="260" y1="0" x2="260" y2="176" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="325" y1="0" x2="325" y2="176" stroke="#4364F7" strokeWidth="1" strokeDasharray="4 6" />
            {/* Roads */}
            <path d="M 0 90 Q 100 70 200 95 Q 300 115 390 85" stroke="#fff" strokeWidth="4" fill="none" />
            <path d="M 80 0 Q 90 88 110 176" stroke="#fff" strokeWidth="3" fill="none" />
            <path d="M 220 0 Q 200 88 240 176" stroke="#fff" strokeWidth="3" fill="none" />
          </svg>
          {/* Quest pins */}
          {[
            { x: "28%", y: "38%", color: "#4364F7", label: "Trail" },
            { x: "55%", y: "60%", color: "#22C55E", label: "Tolmie" },
            { x: "72%", y: "32%", color: "#FF6B35", label: "Coffee" },
          ].map((pin) => (
            <div key={pin.label} className="absolute" style={{ left: pin.x, top: pin.y, transform: "translate(-50%,-50%)" }}>
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ background: pin.color }}>
                  <MapPin size={12} color="white" fill="white" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap" style={{ color: "#0D1B3E" }}>{pin.label}</div>
              </div>
            </div>
          ))}
          {/* User location */}
          <div className="absolute" style={{ left: "45%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <div className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ background: "#4364F7" }}>
              <div className="w-full h-full rounded-full animate-ping opacity-50" style={{ background: "#4364F7" }} />
            </div>
          </div>
          {/* Overlay label */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow" style={{ background: "rgba(255,255,255,0.9)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} />
            <span className="text-[11px] font-bold" style={{ color: "#0D1B3E" }}>12 quests near you</span>
          </div>
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full shadow" style={{ background: "rgba(255,255,255,0.9)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#4364F7" }}>Explore map →</span>
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="px-5 mb-3 flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>Recent Completions</span>
        <span className="text-xs font-semibold" style={{ color: "#4364F7" }}>See all</span>
      </div>

      {/* Feed posts */}
      <div className="px-5 pb-6 space-y-4">
        {FEED.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-3xl overflow-hidden shadow-md"
            style={{ background: "#fff" }}
          >
            <div className="p-4 pb-3 flex items-center gap-3">
              <Avatar initials={post.user.initials} color={post.user.color} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: "#0D1B3E" }}>{post.user.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#E8F3FF", color: "#4364F7" }}>
                    LV {post.user.level}
                  </span>
                </div>
                <p className="text-[11px] truncate" style={{ color: "#4364F7" }}>✓ {post.quest}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black" style={{ color: "#22C55E" }}>+{post.xp} XP</span>
                <p className="text-[10px]" style={{ color: "#6B7FA3" }}>{post.time}</p>
              </div>
            </div>
            <div className="relative h-52">
              <img src={post.img} alt={post.quest} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 pt-3">
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#0D1B3E" }}>{post.caption}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(post.id)}
                  className="flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Heart
                    size={18}
                    style={{ color: liked.has(post.id) ? "#EF4444" : "#6B7FA3" }}
                    fill={liked.has(post.id) ? "#EF4444" : "none"}
                  />
                  <span className="text-xs font-semibold" style={{ color: "#6B7FA3" }}>
                    {post.likes + (liked.has(post.id) ? 1 : 0)}
                  </span>
                </button>
                <button className="flex items-center gap-1.5">
                  <MessageCircle size={18} style={{ color: "#6B7FA3" }} />
                  <span className="text-xs font-semibold" style={{ color: "#6B7FA3" }}>{post.comments}</span>
                </button>
                <button className="flex items-center gap-1.5 ml-auto">
                  <Share2 size={16} style={{ color: "#6B7FA3" }} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RankingsScreen() {
  const top3 = PLAYERS.slice(0, 3);
  const rest = PLAYERS.slice(3);

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0D1B3E 0%, #1a2d6d 100%)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="w-8 h-8 flex flex-col gap-1 justify-center">
            <span className="w-5 h-0.5 rounded bg-white/50" />
            <span className="w-7 h-0.5 rounded bg-white/50" />
            <span className="w-4 h-0.5 rounded bg-white/50" />
          </div>
          <span className="text-sm tracking-widest text-white">
            <span className="brand-wordmark-sm">QUEST!</span>
            <span className="text-sm font-bold tracking-widest text-white"> RANKINGS</span>
          </span>
          <Trophy size={20} color="#F59E0B" />
        </div>

        <p className="text-center text-[11px] mb-2 tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>
          WEEK 24 · VICTORIA, BC
        </p>
        <h2 className="text-center text-3xl font-black text-white tracking-tight mb-1">THE CITY'S ELITE</h2>
        <p className="text-center text-xs mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          Off the couch and onto the board.
        </p>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3">
          {/* 2nd place */}
          <div className="flex flex-col items-center w-24">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg" style={{ background: top3[1].color }}>
                {top3[1].initials}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow text-xs font-black" style={{ color: "#0D1B3E" }}>2</div>
            </div>
            <p className="text-xs font-bold text-white text-center leading-tight mt-2">{top3[1].name}</p>
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>LV {top3[1].level}</p>
            <div className="mt-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <p className="text-sm font-black text-white text-center">{top3[1].xp.toLocaleString()}</p>
              <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.45)" }}>XP</p>
            </div>
          </div>

          {/* 1st place — tallest */}
          <div className="flex flex-col items-center w-28 -mb-2">
            <div className="text-2xl mb-1">👑</div>
            <div className="relative mb-2">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-2xl text-white shadow-xl border-4 border-white/20" style={{ background: top3[0].color }}>
                {top3[0].initials}
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow text-sm font-black" style={{ color: "#0D1B3E" }}>1</div>
            </div>
            <p className="text-sm font-black text-white text-center leading-tight mt-3">{top3[0].name}</p>
            <p className="text-[10px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>LV {top3[0].level} {top3[0].title}</p>
            <div className="mt-2 px-4 py-2 rounded-2xl" style={{ background: "#4364F7" }}>
              <p className="text-lg font-black text-white text-center">{top3[0].xp.toLocaleString()}</p>
              <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.6)" }}>XP</p>
            </div>
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center w-24">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg" style={{ background: top3[2].color }}>
                {top3[2].initials}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow text-xs font-black" style={{ color: "#0D1B3E" }}>3</div>
            </div>
            <p className="text-xs font-bold text-white text-center leading-tight mt-2">{top3[2].name}</p>
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>LV {top3[2].level}</p>
            <div className="mt-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <p className="text-sm font-black text-white text-center">{top3[2].xp.toLocaleString()}</p>
              <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.45)" }}>XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured badges */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black tracking-widest" style={{ color: "#0D1B3E" }}>FEATURED BADGES</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#FF6B35" }}>New</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {BADGES.filter((b) => b.earned).map((badge) => (
            <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1 w-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ background: "#fff" }}>
                {badge.emoji}
              </div>
              <p className="text-[10px] font-bold text-center leading-tight" style={{ color: "#0D1B3E" }}>{badge.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming chasers */}
      <div className="px-5 pb-2">
        <span className="text-xs font-black tracking-widest" style={{ color: "#0D1B3E" }}>UPCOMING CHASERS</span>
      </div>
      <div className="px-5 pb-4 space-y-2">
        {rest.map((p, i) => (
          <motion.div
            key={p.rank}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "#fff" }}
          >
            <span className="w-6 text-sm font-black text-center flex-shrink-0" style={{ color: "#6B7FA3" }}>{p.rank}</span>
            <Avatar initials={p.initials} color={p.color} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold" style={{ color: "#0D1B3E" }}>{p.name}</span>
                <span className="text-[10px]">{p.emojis}</span>
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "#6B7FA3" }}>LV {p.level} {p.title}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>{p.xp.toLocaleString()}</span>
              <p className="text-[10px]" style={{ color: "#6B7FA3" }}>XP</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-8">
        <button
          className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-wide transition-all active:scale-98"
          style={{ background: "linear-gradient(135deg, #4364F7, #6B8EFF)" }}
        >
          Boost Your Rank →
        </button>
      </div>
    </div>
  );
}

function BadgesScreen() {
  return (
    <div className="flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <span className="tracking-tight brand-wordmark" style={{ color: "#4364F7" }}>QUEST!</span>
        <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>Badges</span>
      </div>

      <div className="px-5 mb-5">
        <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, #4364F7, #6B8EFF)" }}>
          <p className="text-white/70 text-xs font-semibold">Your collection</p>
          <p className="text-3xl font-black text-white">3 / 12 earned</p>
          <XPBar current={3} max={12} color="#ffffff" />
        </div>
      </div>

      <div className="px-5 mb-3">
        <span className="text-xs font-black tracking-widest" style={{ color: "#0D1B3E" }}>ALL BADGES</span>
      </div>

      <div className="px-5 pb-6 grid grid-cols-2 gap-3">
        {BADGES.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-3xl p-4 relative overflow-hidden"
            style={{ background: badge.earned ? "#fff" : "#fff", opacity: badge.earned ? 1 : 0.6 }}
          >
            {!badge.earned && (
              <div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
                <Lock size={24} style={{ color: "#6B7FA3" }} />
              </div>
            )}
            <div className="text-3xl mb-2">{badge.emoji}</div>
            <p className="text-sm font-black leading-tight mb-1" style={{ color: "#0D1B3E" }}>{badge.name}</p>
            <p className="text-[10px] leading-relaxed mb-2" style={{ color: "#6B7FA3" }}>{badge.desc}</p>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${badge.rarityColor}22`, color: badge.rarityColor }}>
              {badge.rarity}
            </span>
            {badge.earned && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#22C55E" }}>
                <Check size={10} color="white" strokeWidth={3} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  const stats = [
    { label: "Quests Done", value: "24", icon: "🎯" },
    { label: "Total XP", value: "3,450", icon: "⚡" },
    { label: "Badges", value: "3", icon: "🏅" },
    { label: "Best Rank", value: "#7", icon: "🏆" },
  ];

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="px-5 pt-12 pb-6 text-center" style={{ background: "linear-gradient(160deg, #0D1B3E 0%, #1a2d6d 100%)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 shadow-xl" style={{ background: "#4364F7", borderColor: "rgba(255,255,255,0.2)" }}>
            YO
          </div>
        </div>
        <h2 className="text-xl font-black text-white mb-1">You (Explorer)</h2>
        <p className="text-sm font-bold mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>LV 4 · Week 24 · Victoria, BC</p>
        <div className="flex justify-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.15)" }}>3,450 XP</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "#4364F7" }}>Rank #12</span>
        </div>
      </div>

      <div className="px-5 -mt-4 mb-5 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#fff" }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-black" style={{ color: "#0D1B3E" }}>{s.value}</p>
            <p className="text-[11px] font-semibold" style={{ color: "#6B7FA3" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-5 mb-3">
        <span className="text-xs font-black tracking-widest" style={{ color: "#0D1B3E" }}>RECENT ACTIVITY</span>
      </div>
      <div className="px-5 pb-6 space-y-2">
        {QUESTS.slice(0, 3).map((q) => (
          <div key={q.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#fff" }}>
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <img src={q.img} alt={q.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: "#0D1B3E" }}>{q.title}</p>
              <p className="text-[10px]" style={{ color: "#6B7FA3" }}>{q.tag} · {q.completions} others</p>
            </div>
            <span className="text-xs font-black" style={{ color: "#22C55E" }}>+{q.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
// (see components/layout/BottomNav.tsx)

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<Tab>("explore");
  const [filter, setFilter] = useState<QuestFilter>("ALL");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: COLORS.bgOuter, fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Phone frame on desktop */}
      <div
        className="w-full sm:max-w-[390px] h-screen sm:h-[844px] relative flex flex-col overflow-hidden sm:rounded-[44px] sm:shadow-2xl"
        style={{ background: COLORS.bg }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {tab === "explore" && <ExploreScreen filter={filter} setFilter={setFilter} />}
          {tab === "feed" && <FeedScreen liked={liked} setLiked={setLiked} />}
          {tab === "rankings" && <RankingsScreen />}
          {tab === "badges" && <BadgesScreen />}
          {tab === "profile" && <ProfileScreen />}
        </div>

        {/* Bottom nav */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
