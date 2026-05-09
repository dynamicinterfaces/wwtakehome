import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { PillarBar } from './PillarBar'
import type { EngineerImpact } from '../types'

interface Props {
  engineers: EngineerImpact[]
  selectedLogin: string | null
  onSelect: (login: string | null) => void
}

const RANK_STYLES = [
  'bg-amber-500 text-black',
  'bg-zinc-400 text-black',
  'bg-orange-500 text-black',
  'bg-primary text-primary-foreground',
  'bg-primary text-primary-foreground',
]

export function TopEngineers({ engineers, selectedLogin, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Top 5 Most Impactful Engineers</h2>

      {engineers.map((eng, i) => {
        const isSelected = eng.login === selectedLogin
        return (
          <Card
            key={eng.login}
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-primary/40 border-primary/30' : 'hover:border-border/80'
            }`}
            onClick={() => onSelect(isSelected ? null : eng.login)}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full ${RANK_STYLES[i]} flex items-center justify-center font-bold text-sm`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{eng.login}</span>
                    {eng.metrics.productAreas.slice(0, 2).map(pa => (
                      <Badge key={pa.area} variant="secondary">{pa.area}</Badge>
                    ))}
                    {eng.metrics.aiPercentage > 0 && (
                      <Badge variant="purple">{eng.metrics.aiPercentage.toFixed(0)}% AI</Badge>
                    )}
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-foreground">{eng.impactScore}</span>
                </div>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{eng.explanation}</p>

                <PillarBar dimensions={eng.dimensions} />

                <div className="flex gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                  <span>{eng.metrics.prsAuthored} PRs</span>
                  <span>{eng.metrics.totalEffortHours.toFixed(0)}h effort</span>
                  <span>{eng.metrics.prsReviewed} reviews</span>
                  {eng.metrics.useCasesAdvanced.length > 0 && (
                    <span className="text-chart-3">
                      {eng.metrics.useCasesAdvanced.length} use case{eng.metrics.useCasesAdvanced.length > 1 ? 's' : ''} advanced
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
