import { Badge } from './ui/badge'
import type { EngineerImpact, DatasetSummary } from '../types'

interface Props {
  engineers: EngineerImpact[]
  allEngineers: EngineerImpact[]
  summary: DatasetSummary
  selectedLogin: string | null
  onSelect: (login: string | null) => void
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

function dur(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = minutes / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function EngineerList({ engineers, allEngineers, summary, selectedLogin, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Summary stats */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">PRs</p>
            <p className="text-lg font-bold tabular-nums">{fmt(summary.totalPRs)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Effort</p>
            <p className="text-lg font-bold tabular-nums">{fmt(summary.totalEffortHours)}h</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cycle Time</p>
            <p className="text-lg font-bold tabular-nums">{dur(summary.medianCycleTime)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Strategic</p>
            <p className="text-lg font-bold tabular-nums">{summary.avgStrategicScore.toFixed(1)}<span className="text-xs text-muted-foreground">/10</span></p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{summary.totalEngineers} engineers &middot; 90 days</p>
      </div>

      {/* Engineer list header */}
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Top 5 Engineers
        </h2>
      </div>

      {/* Engineer rows */}
      <div className="flex-1 overflow-y-auto">
        {engineers.map((eng, i) => {
          const isSelected = eng.login === selectedLogin
          return (
            <button
              key={eng.login}
              onClick={() => onSelect(isSelected ? null : eng.login)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                isSelected
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'hover:bg-secondary/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? 'bg-[hsl(var(--dim-strategic))] text-black'
                  : i === 1 ? 'bg-zinc-400 text-black'
                  : i === 2 ? 'bg-[hsl(var(--dim-effort))] text-white'
                  : 'bg-secondary text-secondary-foreground'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{eng.login}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground ml-2">{eng.impactScore}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{eng.metrics.prsAuthored} PRs</span>
                    <span className="text-[10px] text-muted-foreground">{eng.metrics.totalEffortHours.toFixed(0)}h</span>
                    {eng.metrics.aiPercentage > 0 && (
                      <Badge variant="purple" className="text-[8px] px-1 py-0">{eng.metrics.aiPercentage.toFixed(0)}% AI</Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
