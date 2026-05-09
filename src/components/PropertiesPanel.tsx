import { Badge } from './ui/badge'
import { DIM_CONFIG } from './DimensionBar'
import { Methodology } from './Methodology'
import type { EngineerImpact, DimensionScores } from '../types'
import type { PanelView } from '../App'

interface Props {
  view: PanelView
  engineer: EngineerImpact | null
  focusedDimension: keyof DimensionScores | null
  onClose: () => void
  onSwitchToDetail: () => void
  onSwitchToMethodology: () => void
}

function dur(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = minutes / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function PropertiesPanel({ view, engineer, focusedDimension, onClose, onSwitchToDetail, onSwitchToMethodology }: Props) {
  return (
    <div className="h-full flex flex-col w-96">
      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {view === 'detail' && engineer && (
            <>
              <span className="text-sm font-semibold text-foreground">{engineer.login}</span>
              <button
                onClick={onSwitchToMethodology}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                How scored?
              </button>
            </>
          )}
          {view === 'methodology' && (
            <>
              <span className="text-sm font-semibold text-foreground">
                {focusedDimension
                  ? DIM_CONFIG.find(d => d.key === focusedDimension)?.label + ' — How It Works'
                  : 'Scoring Methodology'
                }
              </span>
              {engineer && (
                <button
                  onClick={onSwitchToDetail}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to detail
                </button>
              )}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm px-1"
        >
          &times;
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'detail' && engineer && <DetailView engineer={engineer} />}
        {view === 'methodology' && <Methodology focusedDimension={focusedDimension} />}
      </div>
    </div>
  )
}

function DetailView({ engineer: eng }: { engineer: EngineerImpact }) {
  const { metrics, dimensions } = eng

  return (
    <div className="p-4 space-y-5">
      {/* Dimension scores */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Dimension Scores</p>
        <div className="space-y-2">
          {DIM_CONFIG.map(({ key, label, cssVar }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-16 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${dimensions[key]}%`, backgroundColor: `hsl(var(${cssVar}))` }}
                />
              </div>
              <span className="text-[11px] tabular-nums font-medium text-foreground w-7 text-right">{dimensions[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      {metrics.useCasesAdvanced.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Use Cases Advanced</p>
          <div className="flex gap-1.5 flex-wrap">
            {metrics.useCasesAdvanced.map(uc => (
              <Badge key={uc} variant="warning">{uc}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Product areas */}
      {metrics.productAreas.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Product Areas</p>
          <div className="flex gap-1.5 flex-wrap">
            {metrics.productAreas.map(pa => (
              <Badge key={pa.area} variant="secondary">{pa.area} ({pa.count})</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Top strategic PRs */}
      {eng.topPRs.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Strategic PRs</p>
          <div className="space-y-1.5">
            {eng.topPRs.map(pr => (
              <a key={pr.number}
                href={`https://github.com/PostHog/posthog/pull/${pr.number}`}
                target="_blank" rel="noopener noreferrer"
                className="block text-xs p-2 rounded-md bg-background border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-foreground/70 line-clamp-2">#{pr.number} {pr.title}</span>
                  <Badge variant="warning" className="shrink-0">{pr.strategicScore}/10</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">{pr.effortHours.toFixed(1)}h effort</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* All metrics */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Metrics</p>
        <div className="space-y-1.5">
          {([
            ['PRs Authored', metrics.prsAuthored],
            ['PRs Reviewed', metrics.prsReviewed],
            ['Total Effort', metrics.totalEffortHours.toFixed(0) + 'h'],
            ['Avg Cycle Time', dur(metrics.avgCycleTime)],
            ['Merge Freq', metrics.mergeFrequency.toFixed(1) + '/wk'],
            ['Review Turnaround', dur(metrics.avgReviewTurnaround)],
            ['Substantive Reviews', metrics.reviewsWithSubstance],
            ['Unique Dirs', metrics.uniqueDirectories],
            ['AI-Assisted PRs', metrics.aiAssistedPRs],
            ['Additions', metrics.totalAdditions.toLocaleString()],
            ['Deletions', metrics.totalDeletions.toLocaleString()],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular-nums font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
