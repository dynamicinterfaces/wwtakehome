import { useState } from 'react'
import { Badge } from './ui/badge'
import type { EngineerImpact, DatasetSummary } from '../types'

interface Props {
  engineers: EngineerImpact[]
  allEngineers: EngineerImpact[]
  summary: DatasetSummary
  selectedLogin: string | null
  onSelect: (login: string) => void
  onOverview: () => void
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

export function EngineerList({ engineers, allEngineers, summary, selectedLogin, onSelect, onOverview }: Props) {
  const [showAll, setShowAll] = useState(false)
  const displayList = showAll ? allEngineers : engineers

  return (
    <div className="flex flex-col h-full">
      {/* Overview toggle */}
      <button
        onClick={onOverview}
        className={`w-full px-4 py-2.5 text-left text-xs font-medium border-b border-border transition-colors ${
          selectedLogin === null ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
      >
        Leaderboard Overview
      </button>

      {/* Summary stats */}
      <div className="px-4 py-2.5 border-b border-border">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">PRs</span>
            <span className="font-semibold tabular-nums">{fmt(summary.totalPRs)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Effort</span>
            <span className="font-semibold tabular-nums">{fmt(summary.totalEffortHours)}h</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Cycle</span>
            <span className="font-semibold tabular-nums">{dur(summary.medianCycleTime)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Strategic</span>
            <span className="font-semibold tabular-nums">{summary.avgStrategicScore.toFixed(1)}/10</span>
          </div>
        </div>
      </div>

      {/* List header with toggle */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {showAll ? `All ${allEngineers.length} Engineers` : 'Top 5'}
        </h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          {showAll ? 'Top 5' : `All ${allEngineers.length}`}
        </button>
      </div>

      {/* Engineer rows — dynamically ranked */}
      <div className="flex-1 overflow-y-auto">
        {displayList.map((eng, i) => {
          const isSelected = eng.login === selectedLogin
          const isTop5 = i < 5
          return (
            <button
              key={eng.login}
              onClick={() => onSelect(eng.login)}
              className={`w-full text-left px-4 py-2 border-b border-border transition-colors ${
                isSelected
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'hover:bg-secondary/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isTop5 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`} style={isTop5 ? { opacity: 1 - i * 0.12 } : undefined}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${isTop5 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {eng.login}
                    </span>
                    <span className={`text-xs tabular-nums ml-2 ${isTop5 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {eng.impactScore}
                    </span>
                  </div>
                  {isTop5 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{eng.metrics.prsAuthored} PRs</span>
                      <span className="text-[9px] text-muted-foreground">{eng.metrics.totalEffortHours.toFixed(0)}h</span>
                      {eng.metrics.aiPercentage > 0 && (
                        <Badge variant="outline" className="text-[7px] px-1 py-0">{eng.metrics.aiPercentage.toFixed(0)}%AI</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
