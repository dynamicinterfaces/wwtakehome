import { useState, useMemo } from 'react'
import type { ScoredDataset, ScoreWeights, PRAnalysis, DimensionScores } from './types'
import { computeScores } from './scoring'
import { EngineerList } from './components/EngineerList'
import { EngineerView } from './components/EngineerView'
import { OverviewView } from './components/OverviewView'
import { MethodologyPanel } from './components/MethodologyPanel'
import rawPRData from './data/posthog-prs.json'
import rawAnalyses from './data/pr-analyses.json'
import type { GitHubPR } from './types'

const prs = rawPRData as unknown as GitHubPR[]
const analyses = rawAnalyses as unknown as PRAnalysis[]

export function App() {
  const [weights, setWeights] = useState<ScoreWeights>({
    effort: 0.15, strategic: 0.20, impactMix: 0.10, quality: 0.10,
    collaboration: 0.15, velocity: 0.15, scope: 0.15,
  })

  const dataset: ScoredDataset = useMemo(
    () => computeScores(prs, analyses, weights),
    [weights]
  )

  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(
    dataset.topFive[0]?.login ?? null
  )
  const [focusedDimension, setFocusedDimension] = useState<keyof DimensionScores | null>(null)

  const selectedData = selectedEngineer
    ? dataset.engineers.find(e => e.login === selectedEngineer) ?? null
    : null

  const isOverview = selectedEngineer === null

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 border-b border-border">
        <div className="px-5 h-11 flex items-center gap-2">
          <h1 className="text-sm font-semibold">Engineering Impact</h1>
          <span className="text-[11px] text-muted-foreground">PostHog · 90 days · 897 PRs · 122 engineers</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: engineer list */}
        <div className="w-64 shrink-0 border-r border-border flex flex-col">
          <EngineerList
            engineers={dataset.topFive}
            allEngineers={dataset.engineers}
            summary={dataset.summary}
            selectedLogin={selectedEngineer}
            onSelect={(login: string) => { setSelectedEngineer(login); setFocusedDimension(null) }}
            onOverview={() => { setSelectedEngineer(null); setFocusedDimension(null) }}
          />
        </div>

        {/* Center: engineer detail or leaderboard */}
        <div className="flex-1 overflow-y-auto">
          {isOverview ? (
            <OverviewView dataset={dataset} onSelectEngineer={setSelectedEngineer} />
          ) : selectedData ? (
            <EngineerView
              engineer={selectedData}
              weights={weights}
              onWeightsChange={setWeights}
              focusedDimension={focusedDimension}
              onDimensionClick={setFocusedDimension}
            />
          ) : null}
        </div>

        {/* Right: methodology panel (only when engineer selected) */}
        {!isOverview && (
          <div className="w-80 shrink-0 border-l border-border overflow-y-auto">
            <MethodologyPanel
              focusedDimension={focusedDimension}
              onDimensionClick={setFocusedDimension}
              weights={weights}
              onWeightsChange={setWeights}
            />
          </div>
        )}
      </div>
    </div>
  )
}
