import { Badge } from './ui/badge'
import type { EngineerImpact } from '../types'

interface Props {
  engineers: EngineerImpact[]
  allEngineers: EngineerImpact[]
  selectedLogin: string | null
  onSelect: (login: string | null) => void
}

export function EngineerList({ engineers, allEngineers, selectedLogin, onSelect }: Props) {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Top 5 Engineers
        </h2>
      </div>

      <div className="flex-1">
        {engineers.map((eng, i) => {
          const isSelected = eng.login === selectedLogin
          return (
            <button
              key={eng.login}
              onClick={() => onSelect(isSelected ? null : eng.login)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                isSelected
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'hover:bg-secondary/50'
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
                  <div className="flex items-center gap-1.5 mt-1">
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

      {/* Summary */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[10px] text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Total engineers</span>
            <span className="tabular-nums">{allEngineers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Showing top</span>
            <span className="tabular-nums">{engineers.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
