'use client'

import { theme } from '@/lib/theme'
import type { SponsorExportSummary } from '@/lib/adminRules'

interface ExportButtonProps {
  /** Counts only (B-5): redemption codes never reach the browser. */
  summary: SponsorExportSummary
}

export default function ExportButton({ summary }: ExportButtonProps) {
  const quest = summary
  const handleExport = () => {
    const { total, approved, pending, rejected, issued, redeemed } = summary
    const rate = issued === 0 ? '0' : String(Math.round((redeemed / issued) * 100))
    const last = summary.lastRedemption
    const headers = [
      'Quest Title',
      'Sponsor Name',
      'Reward',
      'Total Submissions',
      'Approved Count',
      'Pending Count',
      'Rejection Count',
      'Codes Issued',
      'Codes Redeemed',
      'Redemption Rate',
      'Last Redemption',
    ]

    const row = [
      quest.title,
      quest.sponsor_name ?? '',
      quest.sponsor_reward ?? '',
      total.toString(),
      approved.toString(),
      pending.toString(),
      rejected.toString(),
      issued.toString(),
      redeemed.toString(),
      rate,
      last,
    ]

    // Escape CSV values to handle commas, quotes, and newlines
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      row.map(escapeCSV).join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    // Slugify quest title
    const slug = quest.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    link.setAttribute('href', url)
    link.setAttribute('download', `quest-${slug}-sponsor-report.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      style={{
        background: theme.surface,
        color: theme.text,
        border: `1px solid ${theme.borderStrong}`,
        borderRadius: 8,
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 14,
        marginTop: 12,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = theme.surface)}
    >
      Export CSV
    </button>
  )
}
