/**
 * LLM-based PR analysis using Claude API.
 * Batches PRs and scores: effort, strategic alignment, impact type, quality.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/llm-score-prs.ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { GitHubPR, PRAnalysis } from '../src/types'

const dataDir = join(import.meta.dirname, '..', 'src', 'data')
const prs: GitHubPR[] = JSON.parse(
  readFileSync(join(dataDir, 'posthog-prs.json'), 'utf-8')
)

// Load existing results to resume from where we left off
const outputPath = join(dataDir, 'pr-analyses.json')
const existing: PRAnalysis[] = existsSync(outputPath)
  ? JSON.parse(readFileSync(outputPath, 'utf-8'))
  : []
const scoredNumbers = new Set(existing.map(a => a.prNumber))

const client = new Anthropic()

const BATCH_SIZE = 10
const POSTHOG_CONTEXT = `
PostHog is an open-source product analytics platform. Their north star is "become the source of truth for customer and product data" and "the default platform for startups."

Their 8 documented use cases:
1. user-navigation: Understand user navigation (Product Analytics, Web Analytics)
2. feature-adoption: Identify feature adoption drivers (Analytics + Session Replay)
3. hypothesis-validation: Validate hypotheses (Experiments / A/B Testing)
4. feature-rollouts: Controlled feature rollouts (Feature Flags)
5. user-feedback: Collect user feedback (Surveys)
6. business-outcomes: Track business outcomes (Analytics + Data Warehouse)
7. debug-issues: Debug user issues (Session Replay, Error Tracking)
8. ai-product: AI-assisted product understanding (PostHog AI, LLM Analytics)

Their 17+ product areas: product-analytics, web-analytics, session-replay, feature-flags, experiments, surveys, data-warehouse, error-tracking, llm-analytics, logs, batch-exports, workflows, posthog-ai, posthog-code, mcp-server, conversations, signals, infrastructure, devex, design-system

Current strategic priorities (hot areas): MCP/AI agents, Web Analytics, Experiments (CUPED), Session Replay improvements, DevEx, component library (Quill).

Impact types: feature (new user value), fix (reliability), refactor (code health), performance (speed), chore (maintenance/CI), docs (documentation), test (test coverage)
`

function buildPRSummary(pr: GitHubPR): string {
  const commitTypes = pr.commits.map(c => {
    const match = c.message.match(/^(\w+)(?:\(([^)]+)\))?:/)
    return match ? `${match[1]}${match[2] ? `(${match[2]})` : ''}` : null
  }).filter(Boolean)

  const fileCategories = categorizeFiles(pr.files)

  // Truncate body to 800 chars — enough for problem statement + testing plan
  const body = (pr.body || '').slice(0, 800)

  return `PR #${pr.number}: "${pr.title}"
${body ? `Description:\n${body}${pr.body && pr.body.length > 800 ? '\n[truncated]' : ''}` : 'Description: (none)'}
Files changed: ${pr.changedFiles} (+${pr.additions}/-${pr.deletions})
Directories: ${pr.directories.slice(0, 10).join(', ')}
Key files: ${pr.files.slice(0, 8).join(', ')}${pr.files.length > 8 ? ` (+${pr.files.length - 8} more)` : ''}
File categories: ${fileCategories}
Commit prefixes: ${[...new Set(commitTypes)].join(', ') || 'none'}
Labels: ${pr.labels.join(', ') || 'none'}
Reviews: ${pr.reviews.length} (${pr.reviews.filter(r => r.state === 'APPROVED').length} approvals, ${pr.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length} changes requested)
Cycle time: ${pr.timeToMerge ? (pr.timeToMerge / 60).toFixed(1) + 'h' : 'unknown'}
AI co-authors: ${pr.commits.flatMap(c => c.aiCoAuthors).join(', ') || 'none'}`
}

function categorizeFiles(files: string[]): string {
  const cats: Record<string, number> = {}
  for (const f of files) {
    if (/\.(test|spec|_test)\./i.test(f)) cats['test'] = (cats['test'] || 0) + 1
    else if (/\.(ts|tsx|js|jsx)$/.test(f)) cats['code'] = (cats['code'] || 0) + 1
    else if (/\.(py)$/.test(f)) cats['python'] = (cats['python'] || 0) + 1
    else if (/\.(css|scss|less)$/.test(f)) cats['style'] = (cats['style'] || 0) + 1
    else if (/\.(json|yaml|yml|toml|ini)$/.test(f)) cats['config'] = (cats['config'] || 0) + 1
    else if (/\.(md|mdx|txt|rst)$/.test(f)) cats['docs'] = (cats['docs'] || 0) + 1
    else if (/\.(sql)$/.test(f)) cats['sql'] = (cats['sql'] || 0) + 1
    else cats['other'] = (cats['other'] || 0) + 1
  }
  return Object.entries(cats).map(([k, v]) => `${k}:${v}`).join(', ')
}

async function scoreBatch(batch: GitHubPR[]): Promise<PRAnalysis[]> {
  const prSummaries = batch.map(buildPRSummary).join('\n\n---\n\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are an engineering analytics expert scoring PRs for strategic impact at PostHog.

${POSTHOG_CONTEXT}

Analyze each PR below. For each, return a JSON object with:
- prNumber: number
- effortHours: estimated expert-hours to complete (0.5-40 scale, consider complexity not just size)
- useCases: array of PostHog use case IDs this PR advances (can be empty for infra work)
- productArea: primary PostHog product area (must be one of the listed areas)
- impactType: one of: feature, fix, refactor, performance, chore, docs, test
- strategicScore: 0-10, how well this advances PostHog's north star. 10 = directly advances a hot strategic priority for users. 0 = routine maintenance with no user impact.
- strategicReason: one sentence explaining the strategic significance
- qualitySignals: { hasProblemStatement: bool, hasTestingPlan: bool, hasTradeoffDiscussion: bool, hasChangelog: bool } — infer from PR title, files, and review patterns
- qualityScore: 0-10 based on the quality signals and PR structure
- confidence: 0-1 how confident you are in this analysis

Return ONLY a JSON array of objects, no markdown fencing, no explanation.

PRs to analyze:

${prSummaries}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Try to parse, handling potential markdown fencing
    const cleaned = text.replace(/^```json?\s*/m, '').replace(/\s*```$/m, '').trim()
    const results: PRAnalysis[] = JSON.parse(cleaned)
    return results
  } catch (err) {
    console.error(`  Failed to parse LLM response for batch. Trying individual extraction...`)
    console.error(`  Response preview: ${text.slice(0, 200)}`)
    return []
  }
}

async function main() {
  const toScore = prs.filter(pr => !scoredNumbers.has(pr.number))
  console.log(`\nTotal PRs: ${prs.length}, already scored: ${existing.length}, to score: ${toScore.length}\n`)

  if (toScore.length === 0) {
    console.log('All PRs already scored.')
    return
  }

  const allResults = [...existing]
  const batches = Math.ceil(toScore.length / BATCH_SIZE)

  for (let i = 0; i < batches; i++) {
    const batch = toScore.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const batchNums = batch.map(pr => pr.number).join(', ')
    console.log(`Batch ${i + 1}/${batches} (PRs: ${batchNums})...`)

    try {
      const results = await scoreBatch(batch)
      allResults.push(...results)
      console.log(`  Scored ${results.length} PRs`)

      // Save after each batch (resume-safe)
      writeFileSync(outputPath, JSON.stringify(allResults, null, 2))
    } catch (err: any) {
      console.error(`  Batch failed: ${err.message}`)
      // Save what we have and continue
      writeFileSync(outputPath, JSON.stringify(allResults, null, 2))
    }

    // Rate limit: small delay between batches
    if (i < batches - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\nDone. Scored ${allResults.length} PRs total.`)
  console.log(`Saved to ${outputPath}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
