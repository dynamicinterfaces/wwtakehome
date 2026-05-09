import type { DimensionScores } from '../types'

interface Props {
  dimensions: DimensionScores
}

const DIM_CONFIG = [
  { key: 'effort' as const, label: 'Effort', color: 'bg-rose-400' },
  { key: 'strategic' as const, label: 'Strategic', color: 'bg-amber-400' },
  { key: 'impactMix' as const, label: 'Impact', color: 'bg-emerald-400' },
  { key: 'quality' as const, label: 'Quality', color: 'bg-cyan-400' },
  { key: 'collaboration' as const, label: 'Collab', color: 'bg-blue-400' },
  { key: 'velocity' as const, label: 'Velocity', color: 'bg-violet-400' },
  { key: 'scope' as const, label: 'Scope', color: 'bg-pink-400' },
]

export function PillarBar({ dimensions }: Props) {
  return (
    <div className="flex gap-1.5">
      {DIM_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-white/30 truncate">
              {label}
            </span>
            <span className="text-[9px] tabular-nums text-white/50">
              {dimensions[key]}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${dimensions[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
