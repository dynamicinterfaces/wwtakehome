import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import type { EngineerImpact, DimensionScores } from '../types'

interface Props {
  engineer: EngineerImpact
}

const DIM_CONFIG: { key: keyof DimensionScores; label: string; colorVar: string }[] = [
  { key: 'effort', label: 'Effort', colorVar: '--chart-5' },
  { key: 'strategic', label: 'Strategic', colorVar: '--chart-3' },
  { key: 'impactMix', label: 'Impact', colorVar: '--chart-2' },
  { key: 'quality', label: 'Quality', colorVar: '--chart-6' },
  { key: 'collaboration', label: 'Collab', colorVar: '--chart-1' },
  { key: 'velocity', label: 'Velocity', colorVar: '--chart-4' },
  { key: 'scope', label: 'Scope', colorVar: '--chart-7' },
]

function dur(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = minutes / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

const IMPACT_COLORS: Record<string, string> = {
  feature: 'bg-emerald-400', fix: 'bg-amber-400', refactor: 'bg-blue-400',
  performance: 'bg-violet-400', chore: 'bg-zinc-500', docs: 'bg-cyan-400', test: 'bg-pink-400',
}

export function EngineerDetail({ engineer: eng }: Props) {
  const { metrics, dimensions } = eng

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">{eng.login}</CardTitle>
        <span className="text-3xl font-bold tabular-nums text-foreground">{eng.impactScore}</span>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Dimension donuts */}
        <div className="grid grid-cols-4 gap-2">
          {DIM_CONFIG.map(({ key, label, colorVar }) => (
            <div key={key} className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-0.5">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none"
                    stroke={`hsl(var(${colorVar}))`} strokeWidth="3"
                    strokeDasharray={`${dimensions[key]} ${100 - dimensions[key]}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-foreground">
                  {dimensions[key]}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">{eng.explanation}</p>

        {/* Impact type bar */}
        {Object.values(metrics.impactTypes).some(v => v > 0) && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Impact Types</p>
            <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
              {Object.entries(metrics.impactTypes)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const total = Object.values(metrics.impactTypes).reduce((a, b) => a + b, 0)
                  return (
                    <div key={type} className={`${IMPACT_COLORS[type] || 'bg-zinc-500'}`}
                      style={{ width: `${(count / total) * 100}%` }} title={`${type}: ${count}`} />
                  )
                })}
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {Object.entries(metrics.impactTypes)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <span key={type} className="text-[10px] text-muted-foreground">{type}: {count}</span>
                ))}
            </div>
          </div>
        )}

        {/* Top strategic PRs */}
        {eng.topPRs.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top Strategic PRs</p>
            <div className="space-y-1.5">
              {eng.topPRs.map(pr => (
                <a key={pr.number}
                  href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-xs p-2.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-foreground/70 line-clamp-1">#{pr.number} {pr.title}</span>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="warning">{pr.strategicScore}/10</Badge>
                      <span className="text-muted-foreground">{pr.effortHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Metrics grid */}
        <div className="space-y-1.5">
          {([
            ['PRs Authored', metrics.prsAuthored],
            ['PRs Reviewed', metrics.prsReviewed],
            ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
            ['Avg Cycle Time', dur(metrics.avgCycleTime)],
            ['Merge Frequency', metrics.mergeFrequency.toFixed(1) + '/wk'],
            ['Review Turnaround', dur(metrics.avgReviewTurnaround)],
            ['Substantive Reviews', metrics.reviewsWithSubstance],
            ['Unique Dirs', metrics.uniqueDirectories],
            ['AI-Assisted PRs', metrics.aiAssistedPRs],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular-nums font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
