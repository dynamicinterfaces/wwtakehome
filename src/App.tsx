import { useState, useMemo } from 'react'
import type { ScoredDataset, ScoreWeights, PRAnalysis } from './types'
import { computeScores } from './scoring'
import { SummaryCards } from './components/SummaryCards'
import { TopEngineers } from './components/TopEngineers'
import { EngineerDetail } from './components/EngineerDetail'
import { Methodology } from './components/Methodology'
import { WeightSliders } from './components/WeightSliders'
import rawPRData from './data/posthog-prs.json'
import rawAnalyses from './data/pr-analyses.json'
import type { GitHubPR } from './types'

const prs = rawPRData as unknown as GitHubPR[]
const analyses = rawAnalyses as unknown as PRAnalysis[]

export function App() {
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null)
  const [showMethodology, setShowMethodology] = useState(false)
  const [weights, setWeights] = useState<ScoreWeights>({
    effort: 0.15,
    strategic: 0.20,
    impactMix: 0.10,
    quality: 0.10,
    collaboration: 0.15,
    velocity: 0.15,
    scope: 0.15,
  })

  const dataset: ScoredDataset = useMemo(
    () => computeScores(prs, analyses, weights),
    [weights]
  )

  const selectedData = dataset.engineers.find(e => e.login === selectedEngineer)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight">Engineering Impact</h1>
            <span className="text-xs text-muted-foreground">PostHog/posthog</span>
            <span className="text-xs text-muted-foreground">90 days</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMethodology(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              How scores work
            </button>
          </div>
        </div>
      </header>

      {/* Main content — single page, no scroll beyond viewport */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <SummaryCards summary={dataset.summary} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopEngineers
              engineers={dataset.topFive}
              selectedLogin={selectedEngineer}
              onSelect={setSelectedEngineer}
              onScoreClick={() => setShowMethodology(true)}
            />
          </div>

          <div className="space-y-4">
            <WeightSliders weights={weights} onChange={setWeights} />
            {selectedData && <EngineerDetail engineer={selectedData} />}
          </div>
        </div>
      </main>

      {/* Methodology overlay */}
      {showMethodology && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowMethodology(false)}
          />
          <div className="relative max-w-4xl w-full max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm rounded-t-xl">
              <span className="text-sm font-semibold">How Scores Work</span>
              <button
                onClick={() => setShowMethodology(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none px-2"
              >
                &times;
              </button>
            </div>
            <Methodology />
          </div>
        </div>
      )}
    </div>
  )
}
