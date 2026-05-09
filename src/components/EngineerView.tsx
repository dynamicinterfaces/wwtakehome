import { useState } from 'react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { DIM_CONFIG } from './DimensionBar'
import type { EngineerImpact, DimensionScores, ScoreWeights } from '../types'

interface Props {
  engineer: EngineerImpact
  weights: ScoreWeights
  onWeightsChange: (w: ScoreWeights) => void
  expandedDimension: keyof DimensionScores | null
  onDimensionClick: (dim: keyof DimensionScores) => void
}

const DIM_RUBRICS: Record<keyof DimensionScores, { tag: string; desc: string }> = {
  effort: { tag: 'LLM', desc: 'Expert-hours shipped. LLM reads PR body + files to estimate senior engineer effort.' },
  strategic: { tag: 'LLM + PostHog', desc: "Alignment to PostHog's north star — 8 use cases, 17 product areas, hot priorities." },
  impactMix: { tag: 'LLM + Commits', desc: 'Feature vs fix vs chore ratio. Features (1.0) > fixes (0.7) > chores (0.2).' },
  quality: { tag: 'Deterministic', desc: 'Problem statement (+2.5), testing plan (+3), tradeoffs (+2.5), changelog (+2). From real PR body.' },
  collaboration: { tag: 'SPACE-C', desc: 'Review quality (questions, code suggestions, pushback). Bots + QA Swarm filtered.' },
  velocity: { tag: 'DORA', desc: 'Merge frequency (capped 20/wk) + cycle time (inverse log) + consistency (low variance).' },
  scope: { tag: 'Git', desc: 'Unique dirs touched + cross-cutting PRs (3+ dirs, ×5 bonus) + product area diversity.' },
}

function dur(m: number | null): string {
  if (m === null) return '—'
  const h = m / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function EngineerView({ engineer, weights, onWeightsChange, expandedDimension, onDimensionClick }: Props) {
  const [showWeights, setShowWeights] = useState(false)
  const { dimensions, metrics } = engineer

  const handleWeightChange = (key: keyof ScoreWeights, value: number) => {
    const w = { ...weights, [key]: value }
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    if (total > 0) for (const k of Object.keys(w) as (keyof ScoreWeights)[]) w[k] /= total
    onWeightsChange(w)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header: name + score + explanation */}
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

      {/* 7 dimension scores — each row clickable to expand rubric */}
      <Card className="p-0 overflow-hidden">
        {DIM_CONFIG.map(({ key, label }) => {
          const isExpanded = expandedDimension === key
          const rubric = DIM_RUBRICS[key]
          const score = dimensions[key]
          return (
            <div key={key} className="border-b border-border last:border-b-0">
              <button
                onClick={() => onDimensionClick(key)}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                  isExpanded ? 'bg-primary/5' : 'hover:bg-secondary/30'
                }`}
              >
                <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${score}%`, opacity: 0.4 + score / 170 }} />
                </div>
                <span className="text-sm font-semibold tabular-nums w-8 text-right">{score}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{(weights[key] * 100).toFixed(0)}%</span>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0 mt-0.5">{rubric.tag}</Badge>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{rubric.desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {/* Two-column: metrics + impact type + use cases | top PRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: metrics + breakdown */}
        <div className="space-y-4">
          {/* Key metrics */}
          <Card className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Metrics</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {([
                ['PRs Authored', metrics.prsAuthored],
                ['PRs Reviewed', metrics.prsReviewed],
                ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
                ['Cycle Time', dur(metrics.avgCycleTime)],
                ['Merge Freq', metrics.mergeFrequency.toFixed(1) + '/wk'],
                ['Reviews (quality)', metrics.reviewsWithSubstance],
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

          {/* Impact type breakdown */}
          {Object.values(metrics.impactTypes).some(v => v > 0) && (
            <Card className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Impact Types</p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
                {Object.entries(metrics.impactTypes)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(metrics.impactTypes).reduce((a, b) => a + b, 0)
                    return (
                      <div key={type} className="bg-primary rounded-sm"
                        style={{ width: `${(count / total) * 100}%`, opacity: type === 'feature' ? 1 : type === 'fix' ? 0.7 : 0.4 }}
                        title={`${type}: ${count}`} />
                    )
                  })}
              </div>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(metrics.impactTypes).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                  .map(([t, c]) => <span key={t} className="text-[10px] text-muted-foreground">{t}: {c}</span>)}
              </div>
            </Card>
          )}

          {/* Use cases + product areas */}
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
              {metrics.productAreas.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Product Areas</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {metrics.productAreas.map(pa => <Badge key={pa.area} variant="secondary">{pa.area} ({pa.count})</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column: top PRs + weights */}
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

          {/* Collapsible weights */}
          <Card className="p-4">
            <button onClick={() => setShowWeights(!showWeights)}
              className="text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex items-center gap-1 w-full"
            >
              Adjust Weights <span className="ml-auto">{showWeights ? '−' : '+'}</span>
            </button>
            {showWeights && (
              <div className="mt-3 space-y-2">
                {DIM_CONFIG.map(({ key, shortLabel }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground">{shortLabel}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{(weights[key] * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={weights[key] * 100}
                      onChange={e => handleWeightChange(key, Number(e.target.value) / 100)}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${weights[key] * 100}%, hsl(var(--secondary)) ${weights[key] * 100}%)` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
