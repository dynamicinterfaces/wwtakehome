import { Card, CardContent } from './ui/card'
import type { ScoreWeights } from '../types'

interface Props {
  weights: ScoreWeights
  onChange: (weights: ScoreWeights) => void
}

const DIMS: { key: keyof ScoreWeights; label: string; cssVar: string }[] = [
  { key: 'effort', label: 'Effort Output', cssVar: '--dim-effort' },
  { key: 'strategic', label: 'Strategic Alignment', cssVar: '--dim-strategic' },
  { key: 'impactMix', label: 'Impact Type Mix', cssVar: '--dim-impact' },
  { key: 'quality', label: 'PR Quality', cssVar: '--dim-quality' },
  { key: 'collaboration', label: 'Collaboration', cssVar: '--dim-collaboration' },
  { key: 'velocity', label: 'Velocity (DORA)', cssVar: '--dim-velocity' },
  { key: 'scope', label: 'Scope & Ownership', cssVar: '--dim-scope' },
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
          {DIMS.map(({ key, label, cssVar }) => (
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
                  background: `linear-gradient(to right, hsl(var(${cssVar})) 0%, hsl(var(${cssVar})) ${weights[key] * 100}%, hsl(var(--muted)) ${weights[key] * 100}%)`,
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
