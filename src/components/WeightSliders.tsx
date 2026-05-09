import type { ScoreWeights } from '../types'

interface Props {
  weights: ScoreWeights
  onChange: (weights: ScoreWeights) => void
}

const PILLARS: { key: keyof ScoreWeights; label: string; color: string }[] = [
  { key: 'scope', label: 'Scope', color: '#60a5fa' },
  { key: 'depth', label: 'Depth', color: '#34d399' },
  { key: 'leverage', label: 'Leverage', color: '#fbbf24' },
  { key: 'durability', label: 'Durability', color: '#a78bfa' },
]

export function WeightSliders({ weights, onChange }: Props) {
  const handleChange = (key: keyof ScoreWeights, value: number) => {
    const newWeights = { ...weights, [key]: value }
    // Normalize so they sum to 1
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
      <h3 className="font-semibold mb-4 text-sm">Impact Weights</h3>
      <p className="text-xs text-white/40 mb-4">
        Adjust how each pillar contributes to the composite score.
        Weights auto-normalize to sum to 100%.
      </p>

      <div className="space-y-4">
        {PILLARS.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-white/60">{label}</label>
              <span className="text-xs tabular-nums text-white/40">
                {(weights[key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
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
