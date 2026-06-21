import React, { useState } from 'react'

const CATEGORY_COLORS = {
  fitness:   '#16A34A',
  social:    '#9333EA',
  food:      '#EA580C',
  community: '#2563EB',
  nature:    '#0891B2',
}

const CATEGORY_SOFT = {
  fitness:   '#DCFCE7',
  social:    '#F3E8FF',
  food:      '#FFEDD5',
  community: '#DBEAFE',
  nature:    '#CFFAFE',
}

const CATEGORY_ICONS = {
  fitness:   '🏃',
  social:    '🤝',
  food:      '🍽️',
  community: '🏘️',
  nature:    '🌿',
}

/**
 * The central repeating quest card. White glass surface, category icon box,
 * glass specular highlight. XP in category color — reward, not earned state.
 */
export function QuestCard({
  title,
  description,
  category = 'fitness',
  xpReward = 100,
  distance,
  isSponsored = false,
  sponsorName,
  onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const color  = CATEGORY_COLORS[category] ?? '#6366F1'
  const softBg = CATEGORY_SOFT[category]  ?? '#F1F5F9'
  const icon   = CATEGORY_ICONS[category] ?? '📍'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-md)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'visible',
        gap: 'var(--space-md)',
        opacity: hovered && onClick ? 0.92 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      {/* Glass specular: 1px white top highlight — light catching the glass surface */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 'var(--radius-xl)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Category icon box */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: softBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 24,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Sponsor pill or category pill */}
        <div style={{ marginBottom: 6 }}>
          {isSponsored ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#FFF7ED',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 8px',
                border: '1px solid #FDBA74',
                fontSize: 11,
                fontWeight: 700,
                color: '#EA580C',
                fontFamily: 'var(--font-system)',
              }}
            >
              ⭐ {sponsorName ?? 'Sponsored'}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: softBg,
                borderRadius: 'var(--radius-pill)',
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: color,
                fontFamily: 'var(--font-system)',
                textTransform: 'capitalize',
              }}
            >
              {category}
            </span>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: 800,
            fontSize: 15,
            fontFamily: 'var(--font-system)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 'var(--line-height-title)',
          }}
        >
          {title}
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 13,
              fontFamily: 'var(--font-system)',
              lineHeight: 'var(--line-height-body)',
              marginBottom: 10,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </div>
        )}

        {/* Footer: distance pill + XP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {distance ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 8px',
                border: '1px solid var(--color-border)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-system)',
              }}
            >
              📍 {distance}
            </span>
          ) : (
            <span />
          )}
          <span
            style={{
              color: color,
              fontWeight: 800,
              fontSize: 13,
              fontFamily: 'var(--font-system)',
            }}
          >
            +{xpReward} XP
          </span>
        </div>
      </div>
    </div>
  )
}
