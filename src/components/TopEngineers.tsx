import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { DimensionBar } from './DimensionBar'
import type { EngineerImpact } from '../types'

interface Props {
  engineers: EngineerImpact[]
  selectedLogin: string | null
  onSelect: (login: string | null) => void
  onScoreClick: () => void
}

const RANK_STYLES = [
  'bg-[hsl(var(--dim-strategic))] text-black',
  'bg-zinc-400 text-black',
  'bg-[hsl(var(--dim-effort))] text-white',
  'bg-secondary text-secondary-foreground',
  'bg-secondary text-secondary-foreground',
]

export function TopEngineers({ engineers, selectedLogin, onSelect, onScoreClick }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Top 5 Most Impactful Engineers</h2>

      {engineers.map((eng, i) => {
        const isSelected = eng.login === selectedLogin
        return (
          <Card
            key={eng.login}
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-1 ring-primary/40 border-primary/30' : 'hover:border-border/80'
            }`}
            onClick={() => onSelect(isSelected ? null : eng.login)}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-9 h-9 rounded-full ${RANK_STYLES[i]} flex items-center justify-center font-bold text-xs`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{eng.login}</span>
                    {eng.metrics.productAreas.slice(0, 2).map(pa => (
                      <Badge key={pa.area} variant="secondary">{pa.area}</Badge>
                    ))}
                    {eng.metrics.aiPercentage > 0 && (
                      <Badge variant="purple">{eng.metrics.aiPercentage.toFixed(0)}% AI</Badge>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onScoreClick() }}
                    className="text-xl font-bold tabular-nums text-foreground hover:text-primary transition-colors cursor-help"
                    title="How is this scored?"
                  >
                    {eng.impactScore}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{eng.explanation}</p>

                <DimensionBar dimensions={eng.dimensions} />

                <div className="flex gap-3 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
                  <span>{eng.metrics.prsAuthored} PRs</span>
                  <span>{eng.metrics.totalEffortHours.toFixed(0)}h effort</span>
                  <span>{eng.metrics.prsReviewed} reviews</span>
                  {eng.metrics.useCasesAdvanced.length > 0 && (
                    <span className="text-[hsl(var(--dim-strategic))]">
                      {eng.metrics.useCasesAdvanced.length} use case{eng.metrics.useCasesAdvanced.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
