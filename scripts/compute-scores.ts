/**
 * Compute impact scores from fetched GitHub data.
 * Usage: npx tsx scripts/compute-scores.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { computeScores } from '../src/scoring'
import type { GitHubPR } from '../src/types'

const dataDir = join(import.meta.dirname, '..', 'src', 'data')
const prs: GitHubPR[] = JSON.parse(
  readFileSync(join(dataDir, 'posthog-prs.json'), 'utf-8')
)

console.log(`Loaded ${prs.length} PRs`)

const dataset = computeScores(prs)

console.log(`\n=== Dataset Summary ===`)
console.log(`Repo: ${dataset.summary.repo}`)
console.log(`PRs: ${dataset.summary.totalPRs}`)
console.log(`Engineers: ${dataset.summary.totalEngineers}`)
console.log(`Reviews: ${dataset.summary.totalReviews}`)
console.log(`Median Cycle Time: ${dataset.summary.medianCycleTime ? (dataset.summary.medianCycleTime / 60).toFixed(1) + 'h' : '—'}`)

console.log(`\n=== Top 5 Most Impactful Engineers ===`)
for (const eng of dataset.topFive) {
  console.log(`\n#${dataset.topFive.indexOf(eng) + 1} ${eng.login} — Impact: ${eng.impactScore}`)
  console.log(`  Scope: ${eng.pillars.scope} | Depth: ${eng.pillars.depth} | Leverage: ${eng.pillars.leverage} | Durability: ${eng.pillars.durability}`)
  console.log(`  ${eng.metrics.prsAuthored} PRs authored, ${eng.metrics.prsReviewed} reviewed`)
  console.log(`  ${eng.explanation}`)
}

writeFileSync(
  join(dataDir, 'scored-dataset.json'),
  JSON.stringify(dataset, null, 2)
)
console.log(`\nSaved scored dataset to src/data/scored-dataset.json`)
