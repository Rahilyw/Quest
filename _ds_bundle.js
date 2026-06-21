/* @ds-bundle: {"format":3,"namespace":"QuestDesignSystem_8b2125","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"CategoryChip","sourcePath":"components/core/CategoryChip.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"LevelChip","sourcePath":"components/core/LevelChip.jsx"},{"name":"QuestCard","sourcePath":"components/quest/QuestCard.jsx"},{"name":"XPBar","sourcePath":"components/quest/XPBar.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"339be0bb44a1","components/core/Badge.jsx":"c8820963e57d","components/core/Button.jsx":"4972355fb339","components/core/CategoryChip.jsx":"3f07e0071e36","components/core/Input.jsx":"948e38926bd9","components/core/LevelChip.jsx":"682f8fe2552c","components/quest/QuestCard.jsx":"d618db43a454","components/quest/XPBar.jsx":"4f981473c8e6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.QuestDesignSystem_8b2125 = window.QuestDesignSystem_8b2125 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
const PALETTES = [{
  bg: '#DCFCE7',
  fg: '#15803D'
},
// fitness green
{
  bg: '#F3E8FF',
  fg: '#7E22CE'
},
// social purple
{
  bg: '#FFEDD5',
  fg: '#C2410C'
},
// food orange
{
  bg: '#DBEAFE',
  fg: '#1D4ED8'
},
// community blue
{
  bg: '#CFFAFE',
  fg: '#0E7490'
},
// nature teal
{
  bg: '#FEF9C3',
  fg: '#A16207'
},
// amber
{
  bg: '#FCE7F3',
  fg: '#9D174D'
} // pink
];
function hashUsername(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return h;
}

/**
 * User avatar — shows photo if provided, falls back to deterministic
 * initial with vivid color derived from username hash.
 */
function Avatar({
  username = '?',
  src,
  size = 48
}) {
  const palette = PALETTES[hashUsername(username) % PALETTES.length];
  const initial = (username[0] ?? '?').toUpperCase();
  if (src) {
    return /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: username,
      style: {
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        flexShrink: 0
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: palette.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: Math.round(size * 0.38),
      fontWeight: 800,
      color: palette.fg,
      lineHeight: 1,
      fontFamily: 'var(--font-system)'
    }
  }, initial));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const CATEGORY_COLORS = {
  fitness: '#16A34A',
  social: '#9333EA',
  food: '#EA580C',
  community: '#2563EB',
  nature: '#0891B2'
};
const CATEGORY_SOFT = {
  fitness: '#DCFCE7',
  social: '#F3E8FF',
  food: '#FFEDD5',
  community: '#DBEAFE',
  nature: '#CFFAFE'
};

/**
 * Compact label pill for category identification, sponsor tags, and status chips.
 * XP values in category color (not indigo) on quest cards — reward state, not earned.
 */
function Badge({
  label,
  variant = 'category',
  category,
  icon
}) {
  const catColor = category ? CATEGORY_COLORS[category] ?? 'var(--color-text-secondary)' : 'var(--color-text-secondary)';
  const catSoft = category ? CATEGORY_SOFT[category] ?? 'var(--color-surface-elevated)' : 'var(--color-surface-elevated)';
  const variants = {
    category: {
      bg: catSoft,
      color: catColor,
      border: undefined
    },
    sponsor: {
      bg: 'var(--color-bg-warm)',
      color: 'var(--color-sponsor)',
      border: '1px solid #FDBA74'
    },
    accent: {
      bg: 'var(--color-accent-soft)',
      color: 'var(--color-accent-text)',
      border: undefined
    },
    muted: {
      bg: 'var(--color-surface-elevated)',
      color: 'var(--color-text-muted)',
      border: '1px solid var(--color-border)'
    },
    success: {
      bg: '#F0FDF4',
      color: 'var(--color-success)',
      border: undefined
    },
    warning: {
      bg: '#FFFBEB',
      color: 'var(--color-warning)',
      border: undefined
    }
  };
  const s = variants[variant] ?? variants.category;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 10px',
      fontSize: 'var(--font-size-label-sm)',
      fontWeight: 'var(--font-weight-label)',
      fontFamily: 'var(--font-system)',
      letterSpacing: 'var(--letter-spacing-label)',
      backgroundColor: s.bg,
      color: s.color,
      border: s.border ?? undefined,
      whiteSpace: 'nowrap',
      lineHeight: 'var(--line-height-label)',
      textTransform: 'capitalize',
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px'
    }
  }, icon), label);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Primary interactive control for all user actions.
 * Variants: primary (Local Signal + glow), ghost (transparent border), link (text only).
 * Disabled state uses 40% opacity — never hide or remove from DOM.
 */
function Button({
  label,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick
}) {
  const [hovered, setHovered] = useState(false);
  const text = label ?? children;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-system)',
    fontWeight: 'var(--font-weight-label)',
    fontSize: size === 'sm' ? 'var(--font-size-label)' : 'var(--font-size-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : hovered ? 0.9 : 1,
    border: 'none',
    outline: 'none',
    transition: 'opacity 150ms ease',
    width: fullWidth ? '100%' : 'auto',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    textDecoration: 'none',
    padding: size === 'sm' ? '8px 16px' : '14px 24px',
    letterSpacing: '0.01em',
    lineHeight: 'var(--line-height-label)',
    boxSizing: 'border-box'
  };
  const variants = {
    primary: {
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF',
      boxShadow: 'var(--shadow-action-glow)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1.5px solid var(--color-border-strong)'
    },
    link: {
      backgroundColor: 'transparent',
      color: 'var(--color-accent)',
      padding: size === 'sm' ? '4px 0' : '8px 0',
      boxShadow: 'none'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    style: {
      ...base,
      ...(variants[variant] ?? variants.primary)
    },
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false)
  }, text);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/CategoryChip.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Filter chip for quest category selection.
 * Inactive = frosted glass pill. Active = Local Signal fill with Action Glow.
 * Shows emoji + label. Color lives on the quest card, NOT the chip.
 */
function CategoryChip({
  label,
  active = false,
  count,
  onClick
}) {
  const [hovered, setHovered] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      borderRadius: 'var(--radius-pill)',
      padding: '8px 16px',
      fontSize: 'var(--font-size-label)',
      fontWeight: 600,
      fontFamily: 'var(--font-system)',
      cursor: 'pointer',
      border: '1.5px solid',
      transition: 'all 150ms ease',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      outline: 'none',
      lineHeight: 1,
      // Active vs inactive
      backgroundColor: active ? 'var(--color-accent)' : 'var(--color-surface)',
      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
      color: active ? '#FFFFFF' : 'var(--color-text-secondary)',
      boxShadow: active ? 'var(--shadow-action-glow)' : 'var(--shadow-sm)',
      opacity: hovered && !active ? 0.85 : 1
    }
  }, label, count !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.75,
      marginLeft: '2px'
    }
  }, count));
}
Object.assign(__ds_scope, { CategoryChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CategoryChip.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Text input field — Glass White surface, subtle border at rest, indigo focus ring.
 */
function Input({
  placeholder,
  value,
  onChange,
  type = 'text',
  label,
  error,
  disabled = false
}) {
  const [focused, setFocused] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 'var(--font-size-label)',
      fontWeight: 'var(--font-weight-label)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-system)',
      lineHeight: 'var(--line-height-label)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text-primary)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      fontSize: 'var(--font-size-body)',
      fontFamily: 'var(--font-system)',
      border: focused ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      transition: 'border-color 150ms ease',
      lineHeight: 'var(--line-height-body)'
    }
  }), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--font-size-label-sm)',
      color: 'var(--color-sponsor)',
      fontFamily: 'var(--font-system)',
      lineHeight: 1.4
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/LevelChip.jsx
try { (() => {
/**
 * Compact indigo level indicator pill.
 * Appears on profile header overlay and quest feed header.
 * Never use category colors here — level is an earned/indigo concept.
 */
function LevelChip({
  level,
  compact = false
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF',
      borderRadius: 'var(--radius-pill)',
      padding: compact ? '2px 8px' : '4px 10px',
      fontSize: compact ? '10px' : 'var(--font-size-label-sm)',
      fontWeight: 'var(--font-weight-display)',
      fontFamily: 'var(--font-system)',
      letterSpacing: 'var(--letter-spacing-label)',
      boxShadow: 'var(--shadow-action-glow)',
      whiteSpace: 'nowrap',
      lineHeight: 1.2,
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }
  }, "Lv ", level);
}
Object.assign(__ds_scope, { LevelChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/LevelChip.jsx", error: String((e && e.message) || e) }); }

// components/quest/QuestCard.jsx
try { (() => {
const {
  useState
} = React;
const CATEGORY_COLORS = {
  fitness: '#16A34A',
  social: '#9333EA',
  food: '#EA580C',
  community: '#2563EB',
  nature: '#0891B2'
};
const CATEGORY_SOFT = {
  fitness: '#DCFCE7',
  social: '#F3E8FF',
  food: '#FFEDD5',
  community: '#DBEAFE',
  nature: '#CFFAFE'
};
const CATEGORY_ICONS = {
  fitness: '🏃',
  social: '🤝',
  food: '🍽️',
  community: '🏘️',
  nature: '🌿'
};

/**
 * The central repeating quest card. White glass surface, category icon box,
 * glass specular highlight. XP in category color — reward, not earned state.
 */
function QuestCard({
  title,
  description,
  category = 'fitness',
  xpReward = 100,
  distance,
  isSponsored = false,
  sponsorName,
  onClick
}) {
  const [hovered, setHovered] = useState(false);
  const color = CATEGORY_COLORS[category] ?? '#6366F1';
  const softBg = CATEGORY_SOFT[category] ?? '#F1F5F9';
  const icon = CATEGORY_ICONS[category] ?? '📍';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: {
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
      transition: 'opacity 150ms ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 16,
      right: 16,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 'var(--radius-xl)',
      zIndex: 1,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 'var(--radius-lg)',
      backgroundColor: softBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: 24
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, isSponsored ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: '#FFF7ED',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 8px',
      border: '1px solid #FDBA74',
      fontSize: 11,
      fontWeight: 700,
      color: '#EA580C',
      fontFamily: 'var(--font-system)'
    }
  }, "\u2B50 ", sponsorName ?? 'Sponsored') : /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: softBg,
      borderRadius: 'var(--radius-pill)',
      padding: '3px 8px',
      fontSize: 11,
      fontWeight: 700,
      color: color,
      fontFamily: 'var(--font-system)',
      textTransform: 'capitalize'
    }
  }, category)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--color-text-primary)',
      fontWeight: 800,
      fontSize: 15,
      fontFamily: 'var(--font-system)',
      marginBottom: 4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      lineHeight: 'var(--line-height-title)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--color-text-secondary)',
      fontSize: 13,
      fontFamily: 'var(--font-system)',
      lineHeight: 'var(--line-height-body)',
      marginBottom: 10,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, distance ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'var(--color-surface-elevated)',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 8px',
      border: '1px solid var(--color-border)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-system)'
    }
  }, "\uD83D\uDCCD ", distance) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: color,
      fontWeight: 800,
      fontSize: 13,
      fontFamily: 'var(--font-system)'
    }
  }, "+", xpReward, " XP"))));
}
Object.assign(__ds_scope, { QuestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/QuestCard.jsx", error: String((e && e.message) || e) }); }

// components/quest/XPBar.jsx
try { (() => {
const XP_LEVELS = [{
  level: 1,
  minXp: 0
}, {
  level: 2,
  minXp: 200
}, {
  level: 3,
  minXp: 500
}, {
  level: 4,
  minXp: 1000
}, {
  level: 5,
  minXp: 2000
}, {
  level: 6,
  minXp: 3500
}, {
  level: 7,
  minXp: 5500
}, {
  level: 8,
  minXp: 8000
}, {
  level: 9,
  minXp: 11000
}, {
  level: 10,
  minXp: 15000
}];
function getLevelFromXp(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level;
  }
  return 1;
}

/**
 * Signature XP progress bar.
 * White glass card, Local Signal fill with violet blend on right 35%, glass sheen strip.
 * Level markers below track. XP fraction in Mist.
 */
function XPBar({
  totalXp = 750
}) {
  const level = getLevelFromXp(totalXp);
  const curLevelXp = XP_LEVELS.find(l => l.level === level)?.minXp ?? 0;
  const nextLevelEntry = XP_LEVELS.find(l => l.level === level + 1);
  const isMaxLevel = !nextLevelEntry;
  const nextLevelXp = nextLevelEntry?.minXp ?? curLevelXp + 1;
  const progress = isMaxLevel ? 1 : (totalXp - curLevelXp) / (nextLevelXp - curLevelXp);
  const fillPct = `${Math.min(Math.max(progress * 100, 2), 100)}%`;
  const xpLabel = isMaxLevel ? 'Max level' : `${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-primary)',
      fontWeight: 800,
      fontSize: 15,
      fontFamily: 'var(--font-system)'
    }
  }, "Level ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 13,
      fontFamily: 'var(--font-system)'
    }
  }, xpLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12,
      backgroundColor: 'var(--color-surface-elevated)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: fillPct,
      backgroundColor: 'var(--color-accent)',
      borderRadius: 'var(--radius-pill)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'width 600ms ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '35%',
      backgroundColor: '#8B5CF6',
      opacity: 0.55
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
      backgroundColor: '#FFFFFF',
      opacity: 0.28
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 'var(--space-xs)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-system)'
    }
  }, "Lv ", level), !isMaxLevel && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-system)'
    }
  }, "Lv ", level + 1)));
}
Object.assign(__ds_scope, { XPBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/XPBar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CategoryChip = __ds_scope.CategoryChip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.LevelChip = __ds_scope.LevelChip;

__ds_ns.QuestCard = __ds_scope.QuestCard;

__ds_ns.XPBar = __ds_scope.XPBar;

})();
