import type { EngineerImpact } from '../types'
import { PillarBar } from './PillarBar'

interface Props {
  engineers: EngineerImpact[]
  selectedLogin: string | null
  onSelect: (login: string | null) => void
}

const RANK_COLORS = [
  'from-amber-400 to-amber-600',
  'from-gray-300 to-gray-400',
  'from-orange-400 to-orange-600',
  'from-accent-light to-accent',
  'from-accent-light to-accent',
]

const USE_CASE_LABELS: Record<string, string> = {
  'user-navigation': 'Navigation',
  'feature-adoption': 'Adoption',
  'hypothesis-validation': 'Experiments',
  'user-feedback': 'Surveys',
  'business-outcomes': 'Business',
  'feature-rollouts': 'Flags',
  'debug-issues': 'Debug',
  'ai-product': 'AI',
}

export function TopEngineers({ engineers, selectedLogin, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Top 5 Most Impactful Engineers</h2>

      {engineers.map((eng, i) => {
        const isSelected = eng.login === selectedLogin
        return (
          <button
            key={eng.login}
            onClick={() => onSelect(isSelected ? null : eng.login)}
            className={`w-full text-left rounded-xl border transition-all ${
              isSelected
                ? 'bg-accent/10 border-accent/30 ring-1 ring-accent/20'
                : 'bg-surface-1 border-white/5 hover:border-white/15 hover:bg-surface-2'
            } p-5`}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center text-surface-0 font-bold text-sm`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{eng.login}</span>
                    {eng.metrics.productAreas.slice(0, 2).map(pa => (
                      <span key={pa.area} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                        {pa.area}
                      </span>
                    ))}
                    {eng.metrics.aiPercentage > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                        {eng.metrics.aiPercentage.toFixed(0)}% AI
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-bold tabular-nums">
                    {eng.impactScore}
                  </span>
                </div>

                <p className="text-sm text-white/50 mb-3 line-clamp-2">
                  {eng.explanation}
                </p>

                <PillarBar dimensions={eng.dimensions} />

                <div className="flex gap-3 mt-3 text-xs text-white/40 flex-wrap">
                  <span>{eng.metrics.prsAuthored} PRs</span>
                  <span>{eng.metrics.totalEffortHours.toFixed(0)}h effort</span>
                  <span>{eng.metrics.prsReviewed} reviews</span>
                  {eng.metrics.useCasesAdvanced.length > 0 && (
                    <span className="text-amber-400/60">
                      {eng.metrics.useCasesAdvanced.map(uc => USE_CASE_LABELS[uc] || uc).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
