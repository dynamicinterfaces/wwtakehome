interface Props {
  pillars: {
    scope: number
    depth: number
    leverage: number
    durability: number
  }
}

const PILLAR_CONFIG = [
  { key: 'scope' as const, label: 'Scope', color: 'bg-blue-400' },
  { key: 'depth' as const, label: 'Depth', color: 'bg-emerald-400' },
  { key: 'leverage' as const, label: 'Leverage', color: 'bg-amber-400' },
  { key: 'durability' as const, label: 'Durability', color: 'bg-purple-400' },
]

export function PillarBar({ pillars }: Props) {
  return (
    <div className="flex gap-2">
      {PILLAR_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-white/30">
              {label}
            </span>
            <span className="text-[10px] tabular-nums text-white/50">
              {pillars[key]}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${pillars[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
