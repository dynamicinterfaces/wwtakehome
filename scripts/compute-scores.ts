/**
 * Compute 7-dimension impact scores from GitHub data + LLM analyses.
 * Usage: npx tsx scripts/compute-scores.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { computeScores } from '../src/scoring'
import type { GitHubPR, PRAnalysis } from '../src/types'

const dataDir = join(import.meta.dirname, '..', 'src', 'data')
const prs: GitHubPR[] = JSON.parse(readFileSync(join(dataDir, 'posthog-prs.json'), 'utf-8'))

const analysisPath = join(dataDir, 'pr-analyses.json')
const analyses: PRAnalysis[] = existsSync(analysisPath)
  ? JSON.parse(readFileSync(analysisPath, 'utf-8'))
  : []

console.log(`Loaded ${prs.length} PRs, ${analyses.length} LLM analyses`)

const dataset = computeScores(prs, analyses)

console.log(`\n=== Dataset Summary ===`)
console.log(`Repo: ${dataset.summary.repo}`)
console.log(`PRs: ${dataset.summary.totalPRs} | Engineers: ${dataset.summary.totalEngineers}`)
console.log(`Total Effort: ${dataset.summary.totalEffortHours.toFixed(0)}h`)
console.log(`Avg Strategic: ${dataset.summary.avgStrategicScore.toFixed(1)}/10`)
console.log(`Median Cycle: ${dataset.summary.medianCycleTime ? (dataset.summary.medianCycleTime / 60).toFixed(1) + 'h' : '—'}`)

console.log(`\n=== Top 5 ===`)
for (const [i, eng] of dataset.topFive.entries()) {
  const d = eng.dimensions
  console.log(`\n#${i + 1} ${eng.login} — ${eng.impactScore}`)
  console.log(`  Eff:${d.effort} Str:${d.strategic} Mix:${d.impactMix} Qual:${d.quality} Col:${d.collaboration} Vel:${d.velocity} Sco:${d.scope}`)
  console.log(`  ${eng.metrics.prsAuthored} PRs, ${eng.metrics.totalEffortHours.toFixed(0)}h effort, ${eng.metrics.prsReviewed} reviews`)
  console.log(`  ${eng.explanation}`)
}

writeFileSync(join(dataDir, 'scored-dataset.json'), JSON.stringify(dataset, null, 2))
console.log(`\nSaved to src/data/scored-dataset.json`)
