import type { EngineerImpact } from '../types'

interface Props {
  engineer: EngineerImpact
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = minutes / 60
  if (hours < 24) return hours.toFixed(1) + 'h'
  return (hours / 24).toFixed(1) + 'd'
}

export function EngineerDetail({ engineer: eng }: Props) {
  const { metrics, pillars } = eng

  const stats = [
    { label: 'PRs Authored', value: metrics.prsAuthored },
    { label: 'PRs Reviewed', value: metrics.prsReviewed },
    { label: 'Additions', value: metrics.totalAdditions.toLocaleString() },
    { label: 'Deletions', value: metrics.totalDeletions.toLocaleString() },
    { label: 'Avg Files/PR', value: metrics.avgFilesPerPR.toFixed(1) },
    { label: 'Unique Dirs', value: metrics.uniqueDirectories },
    { label: 'Reviews Given', value: metrics.reviewsGiven },
    { label: 'Substantive Reviews', value: metrics.reviewsWithSubstance },
    { label: 'Avg Cycle Time', value: formatDuration(metrics.avgCycleTime) },
    { label: 'Avg Review Time', value: formatDuration(metrics.avgTimeToReview) },
    { label: 'Churn Rate', value: (metrics.churnRate * 100).toFixed(1) + '%' },
    { label: 'AI-Assisted PRs', value: metrics.aiAssistedPRs },
  ]

  return (
    <div className="rounded-xl bg-surface-1 border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{eng.login}</h3>
        <span className="text-3xl font-bold tabular-nums">{eng.impactScore}</span>
      </div>

      {/* Radar-like pillar display */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Object.entries(pillars).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-1">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18" cy="18" r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="16"
                  fill="none"
                  stroke={
                    key === 'scope' ? '#60a5fa' :
                    key === 'depth' ? '#34d399' :
                    key === 'leverage' ? '#fbbf24' : '#a78bfa'
                  }
                  strokeWidth="3"
                  strokeDasharray={`${value} ${100 - value}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
                {value}
              </span>
            </div>
            <p className="text-xs text-white/40 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <p className="text-sm text-white/60 mb-4 leading-relaxed">
        {eng.explanation}
      </p>

      {/* Detailed stats */}
      <div className="space-y-2">
        {stats.map(s => (
          <div key={s.label} className="flex justify-between text-sm">
            <span className="text-white/40">{s.label}</span>
            <span className="tabular-nums font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
