import { Card } from './ui/card'
import { DIM_CONFIG } from './DimensionBar'
import type { ScoredDataset } from '../types'

interface Props {
  dataset: ScoredDataset
  onSelectEngineer: (login: string) => void
}

export function OverviewView({ dataset, onSelectEngineer }: Props) {
  const { engineers, summary } = dataset
  const top = engineers.slice(0, 20) // show top 20 in leaderboard

  // Compute dimension averages, highs, lows across top 5
  const dimStats = DIM_CONFIG.map(({ key, label }) => {
    const values = engineers.map(e => e.dimensions[key])
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)
    const topVal = dataset.topFive.reduce((s, e) => s + e.dimensions[key], 0) / dataset.topFive.length
    return { key, label, avg, max, min, topVal }
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Leaderboard Overview</h2>
        <p className="text-xs text-muted-foreground">
          {summary.totalPRs} merged PRs · {summary.totalEngineers} engineers · {summary.totalEffortHours.toFixed(0)} expert-hours · median cycle {(summary.medianCycleTime! / 60).toFixed(1)}h
        </p>
      </div>

      {/* Dimension averages table */}
      <Card className="p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Dimension Averages (all {engineers.length} engineers)</p>
        <div className="space-y-2">
          {dimStats.map(({ key, label, avg, max, min, topVal }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden relative">
                {/* Average marker */}
                <div className="h-full rounded-full bg-primary/30" style={{ width: `${avg}%` }} />
                {/* Top 5 average overlay */}
                <div className="absolute top-0 h-full rounded-full bg-primary/70" style={{ width: `${topVal}%` }} />
              </div>
              <div className="flex gap-2 text-[10px] tabular-nums shrink-0">
                <span className="text-muted-foreground w-6 text-right" title="Min">{Math.round(min)}</span>
                <span className="text-foreground font-medium w-6 text-right" title="Avg">{Math.round(avg)}</span>
                <span className="text-primary w-6 text-right" title="Top 5 avg">{Math.round(topVal)}</span>
                <span className="text-muted-foreground w-6 text-right" title="Max">{Math.round(max)}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 text-[9px] text-muted-foreground mt-1">
            <span>min</span><span>avg</span><span className="text-primary">top5</span><span>max</span>
          </div>
        </div>
      </Card>

      {/* Leaderboard table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Leaderboard — Top 20</p>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-[9px] text-muted-foreground uppercase tracking-wider">
          <span className="w-6">#</span>
          <span className="flex-1">Engineer</span>
          {DIM_CONFIG.map(({ key, shortLabel }) => (
            <span key={key} className="w-10 text-right">{shortLabel}</span>
          ))}
          <span className="w-12 text-right font-semibold">Score</span>
        </div>

        {/* Data rows */}
        {top.map((eng, i) => (
          <button
            key={eng.login}
            onClick={() => onSelectEngineer(eng.login)}
            className="w-full flex items-center gap-2 px-4 py-2 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors text-left"
          >
            <span className="w-6 text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-medium truncate">{eng.login}</span>
            </div>
            {DIM_CONFIG.map(({ key }) => {
              const v = eng.dimensions[key]
              return (
                <span key={key} className={`w-10 text-right text-[11px] tabular-nums ${
                  v >= 90 ? 'text-primary font-semibold' : v >= 70 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {v}
                </span>
              )
            })}
            <span className="w-12 text-right text-sm font-bold tabular-nums">{eng.impactScore}</span>
          </button>
        ))}
      </Card>

      {/* Impact type distribution */}
      <Card className="p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Repo-Wide Impact Types</p>
        <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mb-2">
          {Object.entries(summary.impactTypeDistribution)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const total = Object.values(summary.impactTypeDistribution).reduce((a, b) => a + b, 0)
              return (
                <div key={type} className="bg-primary rounded-sm"
                  style={{ width: `${(count / total) * 100}%`, opacity: type === 'feature' ? 1 : type === 'fix' ? 0.7 : 0.4 }}
                  title={`${type}: ${count}`} />
              )
            })}
        </div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(summary.impactTypeDistribution).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
            .map(([t, c]) => <span key={t} className="text-[10px] text-muted-foreground">{t}: {c}</span>)}
        </div>
      </Card>
    </div>
  )
}
