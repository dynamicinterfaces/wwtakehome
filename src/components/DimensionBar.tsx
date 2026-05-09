import type { DimensionScores } from '../types'

interface Props {
  dimensions: DimensionScores
}

export const DIM_CONFIG: { key: keyof DimensionScores; label: string; cssVar: string }[] = [
  { key: 'effort', label: 'Effort', cssVar: '--dim-effort' },
  { key: 'strategic', label: 'Strategic', cssVar: '--dim-strategic' },
  { key: 'impactMix', label: 'Impact', cssVar: '--dim-impact' },
  { key: 'quality', label: 'Quality', cssVar: '--dim-quality' },
  { key: 'collaboration', label: 'Collab', cssVar: '--dim-collaboration' },
  { key: 'velocity', label: 'Velocity', cssVar: '--dim-velocity' },
  { key: 'scope', label: 'Scope', cssVar: '--dim-scope' },
]

export function DimensionBar({ dimensions }: Props) {
  return (
    <div className="flex gap-1.5">
      {DIM_CONFIG.map(({ key, label, cssVar }) => (
        <div key={key} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{dimensions[key]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${dimensions[key]}%`, backgroundColor: `hsl(var(${cssVar}))` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
