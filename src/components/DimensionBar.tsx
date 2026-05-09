import type { DimensionScores } from '../types'

interface Props {
  dimensions: DimensionScores
}

/** Short hover tooltips — one line each */
export const DIM_TOOLTIPS: Record<keyof DimensionScores, string> = {
  effort: 'Total expert-hours shipped (LLM-estimated from PR body + files)',
  strategic: "Alignment to PostHog's north star and 8 documented use cases",
  impactMix: 'Feature vs fix vs chore ratio — weighted toward value creation',
  quality: 'PR quality: problem statement, testing plan, tradeoffs, changelog',
  collaboration: 'Review quality — questions, suggestions, pushback. Bots filtered.',
  velocity: 'DORA-lite: merge frequency + cycle time + shipping consistency',
  scope: 'Breadth: unique dirs, cross-cutting PRs, product area diversity',
}

export const DIM_CONFIG: { key: keyof DimensionScores; label: string; shortLabel: string }[] = [
  { key: 'effort', label: 'Effort Output', shortLabel: 'Effort' },
  { key: 'strategic', label: 'Strategic Alignment', shortLabel: 'Strategic' },
  { key: 'impactMix', label: 'Impact Type Mix', shortLabel: 'Impact' },
  { key: 'quality', label: 'PR Quality', shortLabel: 'Quality' },
  { key: 'collaboration', label: 'Collaboration', shortLabel: 'Collab' },
  { key: 'velocity', label: 'Velocity (DORA)', shortLabel: 'Velocity' },
  { key: 'scope', label: 'Scope & Ownership', shortLabel: 'Scope' },
]

export function DimensionBar({ dimensions }: Props) {
  return (
    <div className="flex gap-1.5">
      {DIM_CONFIG.map(({ key, shortLabel }) => (
        <div key={key} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{shortLabel}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{dimensions[key]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${dimensions[key]}%`, opacity: 0.5 + (dimensions[key] / 200) }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
