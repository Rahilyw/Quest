'use client'

interface ExportButtonProps {
  quest: {
    title: string
    sponsor_name: string | null
    sponsor_reward: string | null
    completions: Array<{ status: string }> | null
  }
}

export default function ExportButton({ quest }: ExportButtonProps) {
  const handleExport = () => {
    const total = quest.completions?.length ?? 0
    const approved = quest.completions?.filter((c) => c.status === 'approved').length ?? 0
    const pending = quest.completions?.filter((c) => c.status === 'pending').length ?? 0
    const rejected = quest.completions?.filter((c) => c.status === 'rejected').length ?? 0

    // CSV fields: quest title, sponsor name, reward, total submissions, approved count, pending count, rejection count
    const headers = [
      'Quest Title',
      'Sponsor Name',
      'Reward',
      'Total Submissions',
      'Approved Count',
      'Pending Count',
      'Rejection Count',
    ]

    const row = [
      quest.title,
      quest.sponsor_name ?? '',
      quest.sponsor_reward ?? '',
      total.toString(),
      approved.toString(),
      pending.toString(),
      rejected.toString(),
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
        background: '#334155',
        color: '#F1F5F9',
        border: '1px solid #475569',
        borderRadius: 8,
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 14,
        marginTop: 12,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#475569')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#334155')}
    >
      Export CSV
    </button>
  )
}
