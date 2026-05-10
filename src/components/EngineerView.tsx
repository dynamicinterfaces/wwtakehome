import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { DIM_CONFIG, DIM_TOOLTIPS } from './DimensionBar'
import type { EngineerImpact, DimensionScores, ScoreWeights } from '../types'

interface Props {
  engineer: EngineerImpact
  weights: ScoreWeights
  onWeightsChange: (w: ScoreWeights) => void
  focusedDimension: keyof DimensionScores | null
  onDimensionClick: (dim: keyof DimensionScores | null) => void
}

function dur(m: number | null): string {
  if (m === null) return '—'
  const h = m / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

const RAW_LABELS: Record<keyof DimensionScores, (v: number) => string> = {
  effort: v => v.toFixed(0) + 'h',
  strategic: v => v.toFixed(0) + ' pts',
  impactMix: v => (v * 100).toFixed(0) + '%',
  quality: v => v.toFixed(1) + '/10',
  collaboration: v => v.toFixed(0) + ' pts',
  velocity: v => v.toFixed(1),
  scope: v => v.toFixed(0) + ' pts',
}

export function EngineerView({ engineer, weights, focusedDimension, onDimensionClick }: Props) {
  const { dimensions, metrics, rawValues } = engineer

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold">{engineer.login}</h2>
            {metrics.productAreas.slice(0, 3).map(pa => (
              <Badge key={pa.area} variant="secondary">{pa.area}</Badge>
            ))}
            {metrics.aiPercentage > 0 && (
              <Badge variant="outline">{metrics.aiPercentage.toFixed(0)}% AI</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{engineer.explanation}</p>
        </div>
        <span className="text-4xl font-bold tabular-nums shrink-0">{engineer.impactScore}</span>
      </div>

      {/* Dimension scores — click to focus in right panel, hover for tooltip */}
      <Card className="p-0 overflow-hidden">
        {DIM_CONFIG.map(({ key, label }) => {
          const score = dimensions[key]
          const isFocused = focusedDimension === key
          return (
            <button
              key={key}
              onClick={() => onDimensionClick(isFocused ? null : key)}
              title={DIM_TOOLTIPS[key]}
              className={`w-full flex items-center gap-4 px-4 py-2.5 text-left border-b border-border last:border-b-0 transition-colors ${
                isFocused ? 'bg-primary/5' : 'hover:bg-secondary/30'
              }`}
            >
              <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${score}%`, opacity: 0.4 + score / 170 }} />
              </div>
              <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">{RAW_LABELS[key](rawValues[key])}</span>
              <span className="text-sm font-semibold tabular-nums w-8 text-right">{score}</span>
            </button>
          )
        })}
      </Card>

      {/* Metrics + Impact + PRs in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Metrics</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {([
                ['PRs Authored', metrics.prsAuthored],
                ['PRs Reviewed', metrics.prsReviewed],
                ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
                ['Cycle Time', dur(metrics.avgCycleTime)],
                ['Merge Freq', metrics.mergeFrequency.toFixed(1) + '/wk'],
                ['Quality Reviews', metrics.reviewsWithSubstance],
                ['Unique Dirs', metrics.uniqueDirectories],
                ['AI-Assisted', metrics.aiAssistedPRs > 0 ? `${metrics.aiAssistedPRs} (${metrics.aiPercentage.toFixed(0)}%)` : '—'],
              ] as [string, string | number][]).map(([label, value]) => (
                <div key={label} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {Object.values(metrics.impactTypes).some(v => v > 0) && (
            <Card className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Impact Types</p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
                {Object.entries(metrics.impactTypes).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(metrics.impactTypes).reduce((a, b) => a + b, 0)
                    return <div key={type} className="bg-primary rounded-sm"
                      style={{ width: `${(count / total) * 100}%`, opacity: type === 'feature' ? 1 : type === 'fix' ? 0.7 : 0.4 }}
                      title={`${type}: ${count}`} />
                  })}
              </div>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(metrics.impactTypes).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                  .map(([t, c]) => <span key={t} className="text-[10px] text-muted-foreground">{t}: {c}</span>)}
              </div>
            </Card>
          )}

          {(metrics.useCasesAdvanced.length > 0 || metrics.productAreas.length > 0) && (
            <Card className="p-4 space-y-3">
              {metrics.useCasesAdvanced.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Use Cases</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {metrics.useCasesAdvanced.map(uc => <Badge key={uc} variant="outline">{uc}</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {engineer.topPRs.length > 0 && (
            <Card className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Strategic PRs</p>
              <div className="space-y-2">
                {engineer.topPRs.map(pr => (
                  <a key={pr.number}
                    href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block text-xs p-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-foreground/80 line-clamp-2">#{pr.number} {pr.title}</span>
                      <span className="text-primary shrink-0 font-semibold tabular-nums">{pr.strategicScore}/10</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{pr.effortHours.toFixed(1)}h effort</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
