import { useState, useMemo } from 'react'
import type { ScoredDataset, ScoreWeights, PRAnalysis, DimensionScores } from './types'
import { computeScores } from './scoring'
import { EngineerList } from './components/EngineerList'
import { EngineerView } from './components/EngineerView'
import { OverviewView } from './components/OverviewView'
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

  // null = overview, string = specific engineer
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(
    dataset.topFive[0]?.login ?? null
  )
  const [expandedDimension, setExpandedDimension] = useState<keyof DimensionScores | null>(null)

  const selectedData = selectedEngineer
    ? dataset.engineers.find(e => e.login === selectedEngineer) ?? null
    : null

  const handleDimensionClick = (dim: keyof DimensionScores) => {
    setExpandedDimension(expandedDimension === dim ? null : dim)
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border">
        <div className="px-5 h-11 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Engineering Impact</h1>
            <span className="text-[11px] text-muted-foreground">PostHog · 90 days · 897 PRs · 122 engineers</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Stats + Engineers + Overview toggle */}
        <div className="w-64 shrink-0 border-r border-border flex flex-col">
          <EngineerList
            engineers={dataset.topFive}
            allEngineers={dataset.engineers}
            summary={dataset.summary}
            selectedLogin={selectedEngineer}
            onSelect={(login) => { setSelectedEngineer(login); setExpandedDimension(null) }}
            onOverview={() => { setSelectedEngineer(null); setExpandedDimension(null) }}
          />
        </div>

        {/* Main content: either engineer detail or overview */}
        <div className="flex-1 overflow-y-auto">
          {selectedData ? (
            <EngineerView
              engineer={selectedData}
              weights={weights}
              onWeightsChange={setWeights}
              expandedDimension={expandedDimension}
              onDimensionClick={handleDimensionClick}
            />
          ) : (
            <OverviewView dataset={dataset} onSelectEngineer={setSelectedEngineer} />
          )}
        </div>
      </div>
    </div>
  )
}
