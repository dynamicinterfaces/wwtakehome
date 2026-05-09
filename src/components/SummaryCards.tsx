import type { DatasetSummary } from '../types'

interface Props {
  summary: DatasetSummary
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = minutes / 60
  if (hours < 24) return hours.toFixed(1) + 'h'
  return (hours / 24).toFixed(1) + 'd'
}

export function SummaryCards({ summary }: Props) {
  const cards = [
    { label: 'Merged PRs', value: formatNumber(summary.totalPRs), sub: `${summary.totalEngineers} engineers` },
    { label: 'Expert-Hours Shipped', value: formatNumber(summary.totalEffortHours), sub: 'LLM-estimated effort' },
    { label: 'Median Cycle Time', value: formatDuration(summary.medianCycleTime), sub: 'open → merge (DORA)' },
    { label: 'Avg Strategic Score', value: summary.avgStrategicScore.toFixed(1) + '/10', sub: 'north star alignment' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="rounded-xl bg-surface-1 border border-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">{card.label}</p>
          <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
          <p className="text-xs text-white/40 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
