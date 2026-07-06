'use client'

import { useEffect, useRef, useState } from 'react'
import { theme } from '@/lib/theme'
import {
  ART_STYLE_OPTIONS,
  RARITY_OPTIONS,
  UNLOCK_RULES,
  UNLOCK_RULES_BY_TYPE,
  summarizeUnlockRule,
  type BadgeArtStyle,
  type BadgeRarity,
  type UnlockRuleType,
} from '@/lib/badge-rules'
import type { BadgeRow } from '../app/badges/actions'

export interface BadgeFormValues {
  name: string
  description: string
  icon: string
  locked_hint: string
  rarity: BadgeRarity
  art_style: BadgeArtStyle
  art_key: string
  is_secret: boolean
  is_active: boolean
  sort_order: number
  unlock_rule_type: UnlockRuleType
  unlock_condition: string
  ruleConfig: Record<string, string>
}

function badgeToForm(badge?: BadgeRow | null): BadgeFormValues {
  const type = (badge?.unlock_rule_type ?? 'manual') as UnlockRuleType
  const config = (badge?.unlock_rule_config ?? {}) as Record<string, unknown>
  const ruleConfig: Record<string, string> = {}
  for (const [k, v] of Object.entries(config)) {
    ruleConfig[k] = String(v)
  }

  return {
    name: badge?.name ?? '',
    description: badge?.description ?? '',
    icon: badge?.icon ?? '🏅',
    locked_hint: badge?.locked_hint ?? '',
    rarity: (badge?.rarity ?? 'common') as BadgeRarity,
    art_style: (badge?.art_style ?? 'medal') as BadgeArtStyle,
    art_key: badge?.art_key ?? '',
    is_secret: badge?.is_secret ?? false,
    is_active: badge?.is_active ?? true,
    sort_order: badge?.sort_order ?? 0,
    unlock_rule_type: type,
    unlock_condition: badge?.unlock_condition ?? '',
    ruleConfig,
  }
}

interface Props {
  badge?: BadgeRow | null
  iconUrl?: string | null
  onSubmit: (formData: FormData) => Promise<void>
  submitLabel: string
  error: string | null
  submitting: boolean
}

export function BadgeForm({ badge, iconUrl, onSubmit, submitLabel, error, submitting }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<BadgeFormValues>(() => badgeToForm(badge))
  const [preview, setPreview] = useState<string | null>(iconUrl ?? null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [removeIcon, setRemoveIcon] = useState(false)
  const [autoUnlockLabel, setAutoUnlockLabel] = useState(true)

  useEffect(() => {
    setForm(badgeToForm(badge))
    setPreview(iconUrl ?? null)
    setIconFile(null)
    setRemoveIcon(false)
    setAutoUnlockLabel(!badge?.unlock_condition)
  }, [badge, iconUrl])

  const ruleDef = UNLOCK_RULES_BY_TYPE[form.unlock_rule_type]

  function set<K extends keyof BadgeFormValues>(key: K, value: BadgeFormValues[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'unlock_rule_type') {
        const def = UNLOCK_RULES_BY_TYPE[value as UnlockRuleType]
        next.ruleConfig = Object.fromEntries(
          def.fields.map((f) => [f.key, String(f.default ?? '')])
        )
      }
      if (autoUnlockLabel && (key === 'unlock_rule_type' || key === 'ruleConfig')) {
        next.unlock_condition = summarizeUnlockRule(
          next.unlock_rule_type,
          Object.fromEntries(
            Object.entries(next.ruleConfig).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
          )
        )
      }
      return next
    })
  }

  function setRuleField(key: string, value: string) {
    setForm((prev) => {
      const ruleConfig = { ...prev.ruleConfig, [key]: value }
      const next = { ...prev, ruleConfig }
      if (autoUnlockLabel) {
        next.unlock_condition = summarizeUnlockRule(
          prev.unlock_rule_type,
          Object.fromEntries(
            Object.entries(ruleConfig).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
          )
        )
      }
      return next
    })
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIconFile(file)
    setRemoveIcon(false)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name', form.name)
    fd.set('description', form.description)
    fd.set('icon', form.icon)
    fd.set('locked_hint', form.locked_hint)
    fd.set('rarity', form.rarity)
    fd.set('art_style', form.art_style)
    fd.set('art_key', form.art_key)
    fd.set('is_secret', String(form.is_secret))
    fd.set('is_active', String(form.is_active))
    fd.set('sort_order', String(form.sort_order))
    fd.set('unlock_rule_type', form.unlock_rule_type)
    fd.set('unlock_condition', form.unlock_condition)
    for (const [k, v] of Object.entries(form.ruleConfig)) {
      fd.set(`rule_${k}`, v)
    }
    if (iconFile) fd.set('icon_file', iconFile)
    if (removeIcon) fd.set('remove_icon', 'true')
    await onSubmit(fd)
  }

  const rarityColor = RARITY_OPTIONS.find((r) => r.value === form.rarity)?.color ?? theme.textMuted

  return (
    <form onSubmit={handleSubmit}>
      <section className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Badge artwork</h2>
        <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>
          Upload a custom icon image, or use an emoji fallback. Custom images appear in the app when no built-in art exists.
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(ev) => ev.key === 'Enter' && fileRef.current?.click()}
            style={{
              width: 120,
              height: 120,
              borderRadius: 20,
              border: `2px dashed ${theme.border}`,
              background: preview ? `url(${preview}) center/cover` : theme.primarySoft,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              flexShrink: 0,
            }}
          >
            {!preview && (form.icon || '🏅')}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="admin-field">
              <label>Emoji fallback</label>
              <input
                value={form.icon}
                onChange={(e) => set('icon', e.target.value)}
                maxLength={8}
                placeholder="🏅"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => fileRef.current?.click()}>
                Upload image
              </button>
              {preview && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => {
                    setPreview(null)
                    setIconFile(null)
                    setRemoveIcon(true)
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleIconChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </section>

      <section className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Details</h2>
        <div className="admin-field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="First Quest" />
        </div>
        <div className="admin-field">
          <label>Description (earned)</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            required
            rows={3}
            placeholder="Shown after the player earns this badge."
          />
        </div>
        <div className="admin-field">
          <label>Locked hint</label>
          <input
            value={form.locked_hint}
            onChange={(e) => set('locked_hint', e.target.value)}
            placeholder="Teaser shown while locked — not the full spec."
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="admin-field">
            <label>Rarity</label>
            <select value={form.rarity} onChange={(e) => set('rarity', e.target.value as BadgeRarity)}>
              {RARITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label>Art style</label>
            <select value={form.art_style} onChange={(e) => set('art_style', e.target.value as BadgeArtStyle)}>
              {ART_STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label>Sort order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => set('sort_order', parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
        <div className="admin-field">
          <label>Art key (mobile SVG registry)</label>
          <input
            value={form.art_key}
            onChange={(e) => set('art_key', e.target.value)}
            placeholder="first-quest"
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.textDim }}>
            Optional. Links to built-in mobile art when set. Upload an image if no art exists.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_secret} onChange={(e) => set('is_secret', e.target.checked)} />
            Secret badge (hidden until earned)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Active (eligible for auto-award)
          </label>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: `${rarityColor}22`,
            border: `1px solid ${rarityColor}44`,
            fontSize: 13,
            fontWeight: 600,
            color: rarityColor,
          }}
        >
          Preview: {form.rarity.toUpperCase()} · {form.art_style}
        </div>
      </section>

      <section className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Unlock rule</h2>
        <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>
          Defines when the database automatically awards this badge after XP updates.
        </p>
        <div className="admin-field">
          <label>Rule type</label>
          <select
            value={form.unlock_rule_type}
            onChange={(e) => set('unlock_rule_type', e.target.value as UnlockRuleType)}
          >
            {UNLOCK_RULES.map((r) => (
              <option key={r.type} value={r.type}>
                {r.label}
              </option>
            ))}
          </select>
          {ruleDef && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.textDim }}>{ruleDef.description}</p>
          )}
        </div>

        {ruleDef && ruleDef.fields.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {ruleDef.fields.map((field) => (
              <div className="admin-field" key={field.key}>
                <label>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={form.ruleConfig[field.key] ?? String(field.default ?? '')}
                    onChange={(e) => setRuleField(field.key, e.target.value)}
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={form.ruleConfig[field.key] ?? String(field.default ?? '')}
                    onChange={(e) => setRuleField(field.key, e.target.value)}
                    min={field.min}
                    max={field.max}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="admin-field" style={{ marginTop: 12 }}>
          <label>
            Unlock label (player-facing)
            <span style={{ fontWeight: 400, color: theme.textDim, marginLeft: 8 }}>shown in app</span>
          </label>
          <input
            value={form.unlock_condition}
            onChange={(e) => {
              setAutoUnlockLabel(false)
              set('unlock_condition', e.target.value)
            }}
          />
        </div>
      </section>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            color: theme.danger,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
