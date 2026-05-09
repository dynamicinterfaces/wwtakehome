import type { DimensionScores } from '../types'

interface Props {
  dimensions: DimensionScores
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

export function PillarBar({ dimensions }: Props) {
  return (
    <div className="flex gap-1.5">
      {DIM_CONFIG.map(({ key, label, colorVar }) => (
        <div key={key} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{dimensions[key]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dimensions[key]}%`,
                backgroundColor: `hsl(var(${colorVar}))`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
