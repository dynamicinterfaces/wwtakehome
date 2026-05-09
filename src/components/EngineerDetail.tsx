import type { EngineerImpact, DimensionScores } from '../types'

interface Props {
  engineer: EngineerImpact
}

const DIM_CONFIG: { key: keyof DimensionScores; label: string; color: string }[] = [
  { key: 'effort', label: 'Effort', color: '#fb7185' },
  { key: 'strategic', label: 'Strategic', color: '#fbbf24' },
  { key: 'impactMix', label: 'Impact Mix', color: '#34d399' },
  { key: 'quality', label: 'Quality', color: '#22d3ee' },
  { key: 'collaboration', label: 'Collaboration', color: '#60a5fa' },
  { key: 'velocity', label: 'Velocity', color: '#a78bfa' },
  { key: 'scope', label: 'Scope', color: '#f472b6' },
]

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = minutes / 60
  if (hours < 24) return hours.toFixed(1) + 'h'
  return (hours / 24).toFixed(1) + 'd'
}

export function EngineerDetail({ engineer: eng }: Props) {
  const { metrics, dimensions } = eng

  return (
    <div className="rounded-xl bg-surface-1 border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{eng.login}</h3>
        <span className="text-3xl font-bold tabular-nums">{eng.impactScore}</span>
      </div>

      {/* 7 dimension donuts */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {DIM_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-0.5">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3"
                  strokeDasharray={`${dimensions[key]} ${100 - dimensions[key]}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
                {dimensions[key]}
              </span>
            </div>
            <p className="text-[9px] text-white/40 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <p className="text-sm text-white/60 mb-4 leading-relaxed">{eng.explanation}</p>

      {/* Impact type breakdown */}
      {Object.values(metrics.impactTypes).some(v => v > 0) && (
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">Impact Types</p>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
            {Object.entries(metrics.impactTypes)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = Object.values(metrics.impactTypes).reduce((a, b) => a + b, 0)
                const pct = (count / total) * 100
                const colors: Record<string, string> = {
                  feature: 'bg-emerald-400', fix: 'bg-amber-400', refactor: 'bg-blue-400',
                  performance: 'bg-violet-400', chore: 'bg-gray-400', docs: 'bg-cyan-400', test: 'bg-pink-400',
                }
                return (
                  <div key={type} className={`${colors[type] || 'bg-gray-400'}`}
                    style={{ width: `${pct}%` }} title={`${type}: ${count}`} />
                )
              })}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {Object.entries(metrics.impactTypes)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span key={type} className="text-[10px] text-white/40">{type}: {count}</span>
              ))}
          </div>
        </div>
      )}

      {/* Top strategic PRs */}
      {eng.topPRs.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">Top Strategic PRs</p>
          <div className="space-y-1.5">
            {eng.topPRs.map(pr => (
              <a key={pr.number}
                href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                target="_blank" rel="noopener noreferrer"
                className="block text-xs p-2 rounded bg-surface-0 border border-white/5 hover:border-white/15 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-white/70 line-clamp-1">#{pr.number} {pr.title}</span>
                  <div className="flex gap-2 shrink-0">
                    <span className="text-amber-400/70">{pr.strategicScore}/10</span>
                    <span className="text-white/30">{pr.effortHours.toFixed(1)}h</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="space-y-1.5">
        {[
          ['PRs Authored', metrics.prsAuthored],
          ['PRs Reviewed', metrics.prsReviewed],
          ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
          ['Avg Cycle Time', formatDuration(metrics.avgCycleTime)],
          ['Merge Frequency', metrics.mergeFrequency.toFixed(1) + '/wk'],
          ['Avg Review Time', formatDuration(metrics.avgReviewTurnaround)],
          ['Substantive Reviews', metrics.reviewsWithSubstance],
          ['Unique Dirs', metrics.uniqueDirectories],
          ['AI-Assisted PRs', metrics.aiAssistedPRs],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between text-xs">
            <span className="text-white/40">{label}</span>
            <span className="tabular-nums font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
