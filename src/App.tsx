import { useState, useMemo } from 'react'
import type { ScoredDataset, ScoreWeights } from './types'
import { computeScores } from './scoring'
import { Header } from './components/Header'
import { SummaryCards } from './components/SummaryCards'
import { TopEngineers } from './components/TopEngineers'
import { EngineerDetail } from './components/EngineerDetail'
import { Methodology } from './components/Methodology'
import { WeightSliders } from './components/WeightSliders'
import rawPRData from './data/posthog-prs.json'
import type { GitHubPR } from './types'

const prs = rawPRData as unknown as GitHubPR[]

export function App() {
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null)
  const [weights, setWeights] = useState<ScoreWeights>({
    scope: 0.25,
    depth: 0.30,
    leverage: 0.25,
    durability: 0.20,
  })
  const [showMethodology, setShowMethodology] = useState(false)

  const dataset: ScoredDataset = useMemo(
    () => computeScores(prs, weights),
    [weights]
  )

  const selectedData = dataset.engineers.find(e => e.login === selectedEngineer)

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Header
        onMethodologyClick={() => setShowMethodology(!showMethodology)}
        showMethodology={showMethodology}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <SummaryCards summary={dataset.summary} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <TopEngineers
              engineers={dataset.topFive}
              selectedLogin={selectedEngineer}
              onSelect={setSelectedEngineer}
            />
          </div>

          <div className="space-y-6">
            <WeightSliders weights={weights} onChange={setWeights} />
            {selectedData && (
              <EngineerDetail engineer={selectedData} />
            )}
          </div>
        </div>

        {showMethodology && <Methodology />}
      </main>
    </div>
  )
}
