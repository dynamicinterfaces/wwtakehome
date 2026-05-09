import { Card, CardContent } from './ui/card'
import type { ScoreWeights } from '../types'

interface Props {
  weights: ScoreWeights
  onChange: (weights: ScoreWeights) => void
}

const DIMS: { key: keyof ScoreWeights; label: string; colorVar: string }[] = [
  { key: 'effort', label: 'Effort Output', colorVar: '--chart-5' },
  { key: 'strategic', label: 'Strategic Alignment', colorVar: '--chart-3' },
  { key: 'impactMix', label: 'Impact Type Mix', colorVar: '--chart-2' },
  { key: 'quality', label: 'PR Quality', colorVar: '--chart-6' },
  { key: 'collaboration', label: 'Collaboration', colorVar: '--chart-1' },
  { key: 'velocity', label: 'Velocity (DORA)', colorVar: '--chart-4' },
  { key: 'scope', label: 'Scope & Ownership', colorVar: '--chart-7' },
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
    <Card>
      <CardContent>
        <h3 className="font-semibold text-sm text-foreground mb-1">Impact Weights</h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          Adjust how each dimension contributes. Weights auto-normalize.
        </p>

        <div className="space-y-3">
          {DIMS.map(({ key, label, colorVar }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] text-muted-foreground">{label}</label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {(weights[key] * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range" min={0} max={100}
                value={weights[key] * 100}
                onChange={e => handleChange(key, Number(e.target.value) / 100)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(var(${colorVar})) 0%, hsl(var(${colorVar})) ${weights[key] * 100}%, hsl(var(--muted)) ${weights[key] * 100}%)`,
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
