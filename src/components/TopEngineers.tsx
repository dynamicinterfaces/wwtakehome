import type { EngineerImpact } from '../types'
import { PillarBar } from './PillarBar'

interface Props {
  engineers: EngineerImpact[]
  selectedLogin: string | null
  onSelect: (login: string | null) => void
}

const RANK_COLORS = [
  'from-amber-400 to-amber-600',   // 1st
  'from-gray-300 to-gray-400',     // 2nd
  'from-orange-400 to-orange-600', // 3rd
  'from-accent-light to-accent',   // 4th
  'from-accent-light to-accent',   // 5th
]

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
              {/* Rank badge */}
              <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center text-surface-0 font-bold text-sm`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{eng.login}</span>
                    {eng.metrics.aiPercentage > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                        {eng.metrics.aiPercentage.toFixed(0)}% AI-assisted
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

                <PillarBar pillars={eng.pillars} />

                <div className="flex gap-4 mt-3 text-xs text-white/40">
                  <span>{eng.metrics.prsAuthored} PRs authored</span>
                  <span>{eng.metrics.prsReviewed} PRs reviewed</span>
                  <span>{formatNumber(eng.metrics.totalAdditions + eng.metrics.totalDeletions)} lines changed</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}
