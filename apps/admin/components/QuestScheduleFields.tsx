'use client'

import { theme } from '@/lib/theme'
import { formatVancouverInput, nextMondayNine, parseVancouverInput, weekAfterDrop } from '@quest/geofence'

export function QuestScheduleFields({
  activeFrom,
  activeUntil,
  onChange,
}: {
  /** `YYYY-MM-DDTHH:mm` in America/Vancouver. Blank means open. */
  activeFrom: string
  activeUntil: string
  onChange: (next: { activeFrom: string; activeUntil: string }) => void
}) {
  const fromIso = parseVancouverInput(activeFrom)
  const untilIso = parseVancouverInput(activeUntil)

  function applyNextMonday() {
    const at = nextMondayNine(new Date())
    const end = weekAfterDrop(at)
    onChange({
      activeFrom: formatVancouverInput(at.toISOString()),
      activeUntil: formatVancouverInput(end.toISOString()),
    })
  }

  return (
    <section className="admin-card" style={{ marginBottom: 20 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Weekly drop</h2>
      <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13, lineHeight: 1.45 }}>
        Times are Victoria (America/Vancouver). The quest is live from the start time, up to but not
        including the end. Leave both blank to publish now with no end date.
      </p>
      <div className="admin-grid-2">
        <div className="admin-field">
          <label className="admin-label" htmlFor="active-from">Drops at</label>
          <input
            id="active-from"
            className="admin-input"
            type="datetime-local"
            value={activeFrom}
            onChange={(e) => onChange({ activeFrom: e.target.value, activeUntil })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="active-until">Ends at</label>
          <input
            id="active-until"
            className="admin-input"
            type="datetime-local"
            value={activeUntil}
            onChange={(e) => onChange({ activeFrom, activeUntil: e.target.value })}
          />
        </div>
      </div>
      <input type="hidden" name="active_from" value={fromIso ?? ''} />
      <input type="hidden" name="active_until" value={untilIso ?? ''} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={applyNextMonday}>
          Next Monday
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => onChange({ activeFrom: '', activeUntil: '' })}
        >
          Live now, no end
        </button>
      </div>
      <p style={{ margin: '12px 0 0', color: theme.textDim, fontSize: 12, lineHeight: 1.45 }}>
        {activeFrom
          ? `Players see it from ${activeFrom.replace('T', ' ')}`
          : 'Players see it as soon as you publish'}
        {activeUntil ? `, until ${activeUntil.replace('T', ' ')} (that minute is not included).` : '. No end date.'}
      </p>
    </section>
  )
}
