import { Badge } from './ui/badge'
import { DIM_CONFIG } from './DimensionBar'
import type { DimensionScores, ScoreWeights } from '../types'

interface Props {
  focusedDimension: keyof DimensionScores | null
  onDimensionClick: (dim: keyof DimensionScores | null) => void
  weights: ScoreWeights
  onWeightsChange: (w: ScoreWeights) => void
}

const DIM_DETAIL: Record<keyof DimensionScores, { tag: string; rubric: string; signals: string[] }> = {
  effort: {
    tag: 'LLM',
    rubric: 'LLM reads the real PR description, files changed, and commit messages to estimate how many hours a senior PostHog engineer would need. Not LOC — cognitive complexity.',
    signals: ['Sum of per-PR expert-hours', 'Real PR body text (not inferred)', 'Log-scaled fallback if LLM unavailable'],
  },
  strategic: {
    tag: 'LLM + PostHog',
    rubric: "Each PR scored 0-10 on how well it advances PostHog's documented north star. Effort-weighted so a big strategic PR matters more than a small one.",
    signals: ['Scored against 8 use cases (analytics, replay, flags, AI...)', 'Hot priorities weighted higher (MCP, Web Analytics, Experiments)', 'Effort-weighted average across PRs'],
  },
  impactMix: {
    tag: 'LLM + Commits',
    rubric: 'LLM classifies each PR as feature/fix/refactor/perf/chore/docs/test. Features create new user value (1.0), fixes ensure reliability (0.7), chores maintain (0.2).',
    signals: ['19% more accurate than commit prefixes alone', 'LLM reads body to resolve ambiguous types', 'One of seven dimensions — chore work not penalized overall'],
  },
  quality: {
    tag: 'Deterministic',
    rubric: 'Scored from real PR body — not LLM opinion. Four boolean signals with fixed weights: problem statement (+2.5), testing plan (+3.0), tradeoff discussion (+2.5), changelog (+2.0).',
    signals: ['Range 0-8 with real differentiation', 'Mean 4.4 (vs old LLM compressed 4-8)', '28 PRs score 0, 51 score 8'],
  },
  collaboration: {
    tag: 'SPACE-C',
    rubric: 'Review QUALITY, not volume. Each human review scored 0-4: body >50 chars (+1), contains question (+1), code suggestion/actionable (+1), CHANGES_REQUESTED (+1).',
    signals: ['1,333 bot reviews filtered (43% of total)', 'QA Swarm automated reviews filtered', 'Fast turnaround adds bonus'],
  },
  velocity: {
    tag: 'DORA',
    rubric: 'Three equally-weighted sub-signals from Google DORA research: merge frequency (capped at 20/wk), inverse-log cycle time, and shipping consistency (low variance).',
    signals: ['Frequency cap prevents volume domination', 'Consistency rewards steady shippers over bursty ones', 'Validated by 23K-respondent DORA study'],
  },
  scope: {
    tag: 'Git',
    rubric: 'Breadth of system influence. Unique directories touched across all PRs, plus a 5× bonus for cross-cutting PRs that span 3+ top-level directories.',
    signals: ['Cross-cutting work weighted heavily (architectural impact)', 'Product area diversity from LLM classification', 'Dirs > files (avoids config-change inflation)'],
  },
}

export function MethodologyPanel({ focusedDimension, onDimensionClick, weights, onWeightsChange }: Props) {
  const handleWeightChange = (key: keyof ScoreWeights, value: number) => {
    const w = { ...weights, [key]: value }
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    if (total > 0) for (const k of Object.keys(w) as (keyof ScoreWeights)[]) w[k] /= total
    onWeightsChange(w)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold">Scoring Methodology</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Click a dimension in the center panel or below to see details</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Dimension list — each expandable */}
        {DIM_CONFIG.map(({ key, label }) => {
          const isFocused = focusedDimension === key
          const detail = DIM_DETAIL[key]
          return (
            <div key={key} className="border-b border-border">
              <button
                onClick={() => onDimensionClick(isFocused ? null : key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                  isFocused ? 'bg-primary/5' : 'hover:bg-secondary/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isFocused ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                  <Badge variant="secondary" className="text-[8px]">{detail.tag}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{(weights[key] * 100).toFixed(0)}%</span>
              </button>

              {isFocused && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{detail.rubric}</p>
                  <ul className="space-y-0.5">
                    {detail.signals.map(s => (
                      <li key={s} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-primary shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  {/* Inline weight slider */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground">Weight</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{(weights[key] * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={weights[key] * 100}
                      onChange={e => handleWeightChange(key, Number(e.target.value) / 100)}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${weights[key] * 100}%, hsl(var(--secondary)) ${weights[key] * 100}%)` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Summary section */}
        <div className="px-4 py-3 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Formula</p>
            <code className="block text-[10px] text-primary font-mono leading-relaxed bg-secondary/50 rounded p-2">
              Impact = {DIM_CONFIG.map(({ key, shortLabel }) =>
                `${(weights[key] * 100).toFixed(0)}%×${shortLabel}`
              ).join(' + ')}
            </code>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">The Gap We Fill</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              No existing platform maps PRs to a company's documented use cases.
              We score against PostHog's own 8 use cases and 17 product areas.
            </p>
          </div>

          <p className="text-[9px] text-muted-foreground border-t border-border pt-2">
            Data: GitHub GraphQL API, 897 merged PRs. LLM: Claude Sonnet 4 (real PR bodies). Frameworks: DORA, SPACE, DevEx.
          </p>
        </div>
      </div>
    </div>
  )
}
