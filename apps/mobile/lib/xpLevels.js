'use strict'

/** Single source for XP → level thresholds (display helpers). DB CASE in 017 stays authoritative for writes. */
const XP_LEVELS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 200 },
  { level: 3, minXp: 500 },
  { level: 4, minXp: 1000 },
  { level: 5, minXp: 2000 },
  { level: 6, minXp: 3500 },
  { level: 7, minXp: 5500 },
  { level: 8, minXp: 8000 },
  { level: 9, minXp: 11000 },
  { level: 10, minXp: 15000 },
]

function getLevelFromXp(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level
  }
  return 1
}

function getXpToNextLevel(xp) {
  const current = getLevelFromXp(xp)
  const next = XP_LEVELS.find((l) => l.level === current + 1)
  return next ? next.minXp - xp : 0
}

function getMinXpForLevel(level) {
  return XP_LEVELS[Math.min(level - 1, XP_LEVELS.length - 1)]?.minXp ?? 0
}

module.exports = {
  XP_LEVELS,
  getLevelFromXp,
  getXpToNextLevel,
  getMinXpForLevel,
}
