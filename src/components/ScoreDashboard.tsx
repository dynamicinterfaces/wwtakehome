import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { DIM_CONFIG } from './DimensionBar'
import type { EngineerImpact, ScoreWeights, DimensionScores } from '../types'

interface Props {
  engineer: EngineerImpact | null
  weights: ScoreWeights
  onScoreClick: () => void
  onDimensionClick: (dim: keyof DimensionScores) => void
}

function dur(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = minutes / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function ScoreDashboard({ engineer, weights, onScoreClick, onDimensionClick }: Props) {
  if (!engineer) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Select an engineer to see their score breakdown</p>
      </Card>
    )
  }

  const { dimensions, metrics } = engineer

  return (
    <div className="space-y-6">
      {/* Score + name header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{engineer.login}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{engineer.explanation}</p>
        </div>
        <button
          onClick={onScoreClick}
          className="text-4xl font-bold tabular-nums text-foreground hover:text-primary transition-colors cursor-help"
          title="Click to see how this score is calculated"
        >
          {engineer.impactScore}
        </button>
      </div>

      {/* 7-dimension grid — each clickable to open methodology for that dimension */}
      <div className="grid grid-cols-7 gap-3">
        {DIM_CONFIG.map(({ key, label, cssVar }) => (
          <button
            key={key}
            onClick={() => onDimensionClick(key)}
            className="text-center group cursor-help"
          >
            <div className="relative w-14 h-14 mx-auto mb-1">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="16" fill="none"
                  stroke={`hsl(var(${cssVar}))`} strokeWidth="2.5"
                  strokeDasharray={`${dimensions[key]} ${100 - dimensions[key]}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
                {dimensions[key]}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
            <p className="text-[9px] text-muted-foreground tabular-nums">
              {(weights[key] * 100).toFixed(0)}%
            </p>
          </button>
        ))}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-4 gap-3">
        {([
          ['PRs Authored', metrics.prsAuthored.toString()],
          ['Expert-Hours', metrics.totalEffortHours.toFixed(0) + 'h'],
          ['Cycle Time', dur(metrics.avgCycleTime)],
          ['Reviews Given', metrics.prsReviewed.toString()],
        ] as [string, string][]).map(([label, value]) => (
          <Card key={label} className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
          </Card>
        ))}
      </div>

      {/* Impact type bar */}
      {Object.values(metrics.impactTypes).some(v => v > 0) && (
        <Card className="p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Impact Type Distribution</p>
          <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
            {Object.entries(metrics.impactTypes)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = Object.values(metrics.impactTypes).reduce((a, b) => a + b, 0)
                const colors: Record<string, string> = {
                  feature: 'hsl(var(--dim-impact))', fix: 'hsl(var(--dim-strategic))',
                  refactor: 'hsl(var(--dim-collaboration))', performance: 'hsl(var(--dim-velocity))',
                  chore: 'hsl(var(--muted-foreground))', docs: 'hsl(var(--dim-quality))',
                  test: 'hsl(var(--dim-scope))',
                }
                return (
                  <div key={type}
                    style={{ width: `${(count / total) * 100}%`, backgroundColor: colors[type] || 'hsl(var(--muted))' }}
                    title={`${type}: ${count}`}
                    className="rounded-sm"
                  />
                )
              })}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {Object.entries(metrics.impactTypes)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span key={type} className="text-[10px] text-muted-foreground">{type}: {count}</span>
              ))}
          </div>
        </Card>
      )}

      {/* Top strategic PRs */}
      {engineer.topPRs.length > 0 && (
        <Card className="p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Strategic PRs</p>
          <div className="space-y-1.5">
            {engineer.topPRs.map(pr => (
              <a key={pr.number}
                href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                target="_blank" rel="noopener noreferrer"
                className="flex justify-between items-center text-xs p-2 rounded-md bg-background border border-border hover:border-primary/30 transition-colors"
              >
                <span className="text-foreground/70 truncate mr-3">#{pr.number} {pr.title}</span>
                <div className="flex gap-2 shrink-0 items-center">
                  <Badge variant="warning">{pr.strategicScore}/10</Badge>
                  <span className="text-muted-foreground tabular-nums">{pr.effortHours.toFixed(1)}h</span>
                </div>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
