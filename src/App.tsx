import { useState, useMemo } from 'react'
import type { ScoredDataset, ScoreWeights, PRAnalysis, DimensionScores } from './types'
import { computeScores } from './scoring'
import { EngineerList } from './components/EngineerList'
import { ScoreDashboard } from './components/ScoreDashboard'
import { PropertiesPanel } from './components/PropertiesPanel'
import rawPRData from './data/posthog-prs.json'
import rawAnalyses from './data/pr-analyses.json'
import type { GitHubPR } from './types'

const prs = rawPRData as unknown as GitHubPR[]
const analyses = rawAnalyses as unknown as PRAnalysis[]

export type PanelView = 'none' | 'detail' | 'methodology'

export function App() {
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null)
  const [panelView, setPanelView] = useState<PanelView>('none')
  const [focusedDimension, setFocusedDimension] = useState<keyof DimensionScores | null>(null)
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

  const selectedData = dataset.engineers.find(e => e.login === selectedEngineer) ?? null

  const handleSelectEngineer = (login: string | null) => {
    setSelectedEngineer(login)
    if (login) setPanelView('detail')
    else setPanelView('none')
    setFocusedDimension(null)
  }

  const handleScoreClick = () => {
    setPanelView('detail')
    setFocusedDimension(null)
  }

  const handleDimensionClick = (dim: keyof DimensionScores) => {
    setFocusedDimension(dim)
    setPanelView('methodology')
  }

  const handleClosePanel = () => {
    setPanelView('none')
    setFocusedDimension(null)
  }

  const panelOpen = panelView !== 'none'

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-xl z-50">
        <div className="px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight">Engineering Impact</h1>
            <span className="text-[11px] text-muted-foreground">PostHog/posthog</span>
            <span className="text-[11px] text-muted-foreground">90 days</span>
          </div>
          <button
            onClick={handleScoreClick}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            How scores work
          </button>
        </div>
      </header>

      {/* 3-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Engineer list */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
          <EngineerList
            engineers={dataset.topFive}
            allEngineers={dataset.engineers}
            summary={dataset.summary}
            selectedLogin={selectedEngineer}
            onSelect={handleSelectEngineer}
          />
        </div>

        {/* Center: Score dashboard */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <ScoreDashboard
              engineer={selectedData}
              weights={weights}
              onScoreClick={handleScoreClick}
              onDimensionClick={handleDimensionClick}
            />
          </div>
        </div>

        {/* Right: Properties panel (slides in) */}
        <div className={`shrink-0 border-l border-border overflow-y-auto transition-all duration-200 ${
          panelOpen ? 'w-96' : 'w-0'
        }`}>
          {panelOpen && (
            <PropertiesPanel
              view={panelView}
              engineer={selectedData}
              focusedDimension={focusedDimension}
              onClose={handleClosePanel}
              onSwitchToDetail={() => setPanelView('detail')}
              onSwitchToMethodology={() => setPanelView('methodology')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
