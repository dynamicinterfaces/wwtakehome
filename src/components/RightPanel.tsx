import { useState } from 'react'
import { Badge } from './ui/badge'
import { DIM_CONFIG } from './DimensionBar'
import type { EngineerImpact, DimensionScores, ScoreWeights } from '../types'

interface Props {
  engineer: EngineerImpact
  expandedDimension: keyof DimensionScores | null
  onDimensionClick: (dim: keyof DimensionScores) => void
  weights: ScoreWeights
  onWeightsChange: (w: ScoreWeights) => void
}

const DIM_RUBRICS: Record<keyof DimensionScores, { tag: string; desc: string; signals: string[] }> = {
  effort: {
    tag: 'LLM', desc: 'Expert-hours shipped. LLM reads PR body + files to estimate how long a senior PostHog engineer would take.',
    signals: ['Reads real PR description', 'Complexity > LOC', 'Sum across all PRs'],
  },
  strategic: {
    tag: 'LLM + PostHog', desc: "Alignment to PostHog's north star. Scored against 8 use cases, 17 product areas, hot priorities.",
    signals: ['Effort-weighted average', 'MCP/AI, Web Analytics, Experiments score highest', 'Infra scored on business impact'],
  },
  impactMix: {
    tag: 'LLM + Commits', desc: 'Feature vs fix vs chore ratio. Features create new value (1.0), fixes ensure reliability (0.7), chores maintain (0.2).',
    signals: ['LLM overrides mislabeled commit prefixes', '19% more accurate than self-reported', 'One dimension of seven — chore work not penalized overall'],
  },
  quality: {
    tag: 'Deterministic', desc: 'Engineering communication. Scored from real PR body: problem statement (+2.5), testing plan (+3), tradeoffs (+2.5), changelog (+2).',
    signals: ['Not LLM subjective score — computed from boolean signals', 'Range 0-8, mean 4.4', 'Real differentiation vs old compressed 4-8'],
  },
  collaboration: {
    tag: 'SPACE-C', desc: 'Review quality, not volume. Bots filtered. Each review scored 0-4 on questions, code suggestions, pushback.',
    signals: ['1,333 bot reviews filtered', 'QA Swarm automated reviews filtered', 'Fast turnaround = bonus'],
  },
  velocity: {
    tag: 'DORA', desc: 'Shipping cadence. Three equally-weighted sub-signals from DORA research.',
    signals: ['Merge frequency (capped at 20/wk)', 'Cycle time (inverse log)', 'Consistency (low variance)'],
  },
  scope: {
    tag: 'Git', desc: 'Breadth of system influence. Cross-cutting PRs (3+ dirs) get 5× bonus.',
    signals: ['Unique directories touched', 'Cross-cutting PRs', 'Product area diversity from LLM'],
  },
}

function dur(m: number | null): string {
  if (m === null) return '—'
  const h = m / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function RightPanel({ engineer, expandedDimension, onDimensionClick, weights, onWeightsChange }: Props) {
  const [showWeights, setShowWeights] = useState(false)
  const { dimensions, metrics } = engineer

  const handleWeightChange = (key: keyof ScoreWeights, value: number) => {
    const w = { ...weights, [key]: value }
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    if (total > 0) for (const k of Object.keys(w) as (keyof ScoreWeights)[]) w[k] /= total
    onWeightsChange(w)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with engineer name + score */}
      <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold">{engineer.login}</span>
        <span className="text-xl font-bold tabular-nums">{engineer.impactScore}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Dimension scores — each row is clickable to expand */}
        <div className="border-b border-border">
          {DIM_CONFIG.map(({ key, label }) => {
            const isExpanded = expandedDimension === key
            const rubric = DIM_RUBRICS[key]
            return (
              <div key={key} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => onDimensionClick(key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isExpanded ? 'bg-primary/5' : 'hover:bg-secondary/50'
                  }`}
                >
                  {/* Score bar */}
                  <div className="w-8 h-8 relative shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--secondary))" strokeWidth="2" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))"
                        strokeWidth="2" strokeDasharray={`${dimensions[key]} ${100 - dimensions[key]}`}
                        strokeLinecap="round" style={{ opacity: 0.5 + dimensions[key] / 200 }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
                      {dimensions[key]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{(weights[key] * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{isExpanded ? '−' : '+'}</span>
                </button>

                {/* Expanded detail for this dimension */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary">{rubric.tag}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{rubric.desc}</p>
                    <ul className="space-y-0.5">
                      {rubric.signals.map(s => (
                        <li key={s} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-primary shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Key metrics */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Metrics</p>
          <div className="space-y-1">
            {([
              ['PRs Authored', metrics.prsAuthored],
              ['PRs Reviewed', metrics.prsReviewed],
              ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
              ['Avg Cycle Time', dur(metrics.avgCycleTime)],
              ['Merge Freq', metrics.mergeFrequency.toFixed(1) + '/wk'],
              ['Substantive Reviews', metrics.reviewsWithSubstance],
              ['Unique Dirs', metrics.uniqueDirectories],
              ['AI-Assisted', metrics.aiAssistedPRs > 0 ? `${metrics.aiAssistedPRs} (${metrics.aiPercentage.toFixed(0)}%)` : '0'],
            ] as [string, string | number][]).map(([label, value]) => (
              <div key={label} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top strategic PRs */}
        {engineer.topPRs.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Strategic PRs</p>
            <div className="space-y-1.5">
              {engineer.topPRs.map(pr => (
                <a key={pr.number}
                  href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-[11px] p-2 rounded bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-foreground/70 line-clamp-1">#{pr.number} {pr.title}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">{pr.strategicScore}/10</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible weights */}
        <div className="px-4 py-3">
          <button
            onClick={() => setShowWeights(!showWeights)}
            className="text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex items-center gap-1"
          >
            Adjust Weights {showWeights ? '−' : '+'}
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
        </div>
      </div>
    </div>
  )
}
