import type { ScoreWeights } from '../types'

interface Props {
  weights: ScoreWeights
  onChange: (weights: ScoreWeights) => void
}

const DIMS: { key: keyof ScoreWeights; label: string; color: string }[] = [
  { key: 'effort', label: 'Effort Output', color: '#fb7185' },
  { key: 'strategic', label: 'Strategic Alignment', color: '#fbbf24' },
  { key: 'impactMix', label: 'Impact Type Mix', color: '#34d399' },
  { key: 'quality', label: 'PR Quality', color: '#22d3ee' },
  { key: 'collaboration', label: 'Collaboration', color: '#60a5fa' },
  { key: 'velocity', label: 'Velocity (DORA)', color: '#a78bfa' },
  { key: 'scope', label: 'Scope & Ownership', color: '#f472b6' },
]

export function WeightSliders({ weights, onChange }: Props) {
  const handleChange = (key: keyof ScoreWeights, value: number) => {
    const newWeights = { ...weights, [key]: value }
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0)
    if (total > 0) {
      for (const k of Object.keys(newWeights) as (keyof ScoreWeights)[]) {
        newWeights[k] = newWeights[k] / total
      }
    }
    onChange(newWeights)
  }

  return (
    <div className="rounded-xl bg-surface-1 border border-white/5 p-5">
      <h3 className="font-semibold mb-1 text-sm">Impact Weights</h3>
      <p className="text-[10px] text-white/40 mb-4">
        Adjust how each dimension contributes. Weights auto-normalize.
      </p>

      <div className="space-y-3">
        {DIMS.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[11px] text-white/60">{label}</label>
              <span className="text-[10px] tabular-nums text-white/40">
                {(weights[key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range" min={0} max={100}
              value={weights[key] * 100}
              onChange={e => handleChange(key, Number(e.target.value) / 100)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${weights[key] * 100}%, rgba(255,255,255,0.05) ${weights[key] * 100}%)`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
