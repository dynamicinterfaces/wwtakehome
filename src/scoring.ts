/**
 * Engineering Impact Scoring Engine — 7 Independent Dimensions
 *
 * Architecture:
 *   1. Each dimension is a standalone scoring function
 *      - Takes raw engineer data, returns a single raw number
 *      - No cross-dimension dependencies
 *      - Each has a documented rubric
 *
 *   2. Normalization layer
 *      - Percentile-ranks each raw score across the cohort (0-100)
 *
 *   3. Configuration layer
 *      - Weights define how dimensions combine into composite
 *      - Swappable — different orgs can weight differently
 */
import type {
  GitHubPR,
  PRAnalysis,
  EngineerImpact,
  ScoredDataset,
  ScoreWeights,
  DatasetSummary,
  DimensionScores,
  ImpactType,
  PostHogProductArea,
  PostHogUseCase,
} from './types'

// ============================================================
// Normalization
// ============================================================

function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50
  const sorted = [...distribution].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  const equal = sorted.filter(v => v === value).length
  return Math.round(((below + equal * 0.5) / sorted.length) * 100)
}

// ============================================================
// Data grouping
// ============================================================

interface EngineerRaw {
  login: string
  authoredPRs: GitHubPR[]
  analyses: PRAnalysis[]
  reviewedPRs: GitHubPR[]
}

function groupByEngineer(
  prs: GitHubPR[],
  analyses: Map<number, PRAnalysis>
): Map<string, EngineerRaw> {
  const map = new Map<string, EngineerRaw>()
  const getOrCreate = (login: string): EngineerRaw => {
    if (!map.has(login)) map.set(login, { login, authoredPRs: [], analyses: [], reviewedPRs: [] })
    return map.get(login)!
  }

  for (const pr of prs) {
    if (pr.author.includes('[bot]') || pr.authorType === 'Bot') continue
    const eng = getOrCreate(pr.author)
    eng.authoredPRs.push(pr)
    const a = analyses.get(pr.number)
    if (a) eng.analyses.push(a)
    for (const review of pr.reviews) {
      if (review.author !== pr.author && !review.author.includes('[bot]'))
        getOrCreate(review.author).reviewedPRs.push(pr)
    }
  }
  return map
}

// ============================================================
// D1: EFFORT — Total expert-hours shipped
// ============================================================
// Rubric: Sum of LLM-estimated expert-hours per PR.
// Measures: total complexity-adjusted output, not volume.
// Data: LLM effortHours field (0.5–40h per PR).
// Higher = more complex work shipped.

function scoreEffort(eng: EngineerRaw): number {
  return eng.analyses.reduce((sum, a) => sum + a.effortHours, 0)
}

// ============================================================
// D2: STRATEGIC ALIGNMENT — Advances PostHog's north star
// ============================================================
// Rubric: Effort-weighted average of per-PR strategic scores.
// A 20h PR scoring 8/10 counts 4× more than a 5h PR scoring 8/10.
// Data: LLM strategicScore (0–10) × effortHours.
// Measures: how much of this engineer's output moves the product forward.

function scoreStrategic(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) return 0
  const totalEffort = eng.analyses.reduce((s, a) => s + a.effortHours, 0)
  if (totalEffort === 0) return 0
  return eng.analyses.reduce(
    (s, a) => s + a.strategicScore * (a.effortHours / totalEffort), 0
  )
}

// ============================================================
// D3: IMPACT TYPE MIX — Value creation vs maintenance ratio
// ============================================================
// Rubric: Weighted average of impact types across all PRs.
// Weights: feature=1.0, perf=0.8, fix=0.7, refactor=0.6,
//          test=0.5, docs=0.3, chore=0.2
// Measures: proportion of work creating new user value.
// Note: Chores are necessary — this dimension is one of seven,
// not a standalone judgment.

const IMPACT_WEIGHTS: Record<ImpactType, number> = {
  feature: 1.0, performance: 0.8, fix: 0.7,
  refactor: 0.6, test: 0.5, docs: 0.3, chore: 0.2,
}

function scoreImpactMix(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) return 0.5
  return eng.analyses.reduce(
    (sum, a) => sum + (IMPACT_WEIGHTS[a.impactType] || 0.5), 0
  ) / eng.analyses.length
}

// ============================================================
// D4: PR QUALITY — Engineering communication rigor
// ============================================================
// Rubric: Average LLM quality score across PRs.
// LLM evaluates (from real PR body, not inferred):
//   - Problem statement explains user-visible impact
//   - Testing plan is specific
//   - Tradeoffs explicitly discussed
//   - Changelog entry present
// Data: LLM qualityScore (0–10).
// Measures: engineering communication, not code style.

function scoreQuality(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) return 0
  return eng.analyses.reduce((sum, a) => sum + a.qualityScore, 0) / eng.analyses.length
}

// ============================================================
// D5: COLLABORATION — Team multiplier effect (SPACE-C)
// ============================================================
// Rubric: Composite of four review signals:
//   1. Unique PRs reviewed (breadth of input)
//   2. Substantive reviews — body > 50 chars (depth of input)
//   3. Approvals given (unblocking velocity)
//   4. Review turnaround — log-inverse of avg response time
// Data: GitHub review objects (state, body, timestamps).
// Measures: how much this engineer amplifies the team.

function scoreCollaboration(eng: EngineerRaw): number {
  const uniqueReviewed = new Set(eng.reviewedPRs.map(pr => pr.number)).size
  const substantive = eng.reviewedPRs.reduce((count, pr) =>
    count + pr.reviews.filter(r => r.author === eng.login && r.body.length > 50).length, 0
  )
  const approvals = eng.reviewedPRs.reduce((count, pr) =>
    count + (pr.reviews.some(r => r.author === eng.login && r.state === 'APPROVED') ? 1 : 0), 0
  )
  const turnarounds = eng.reviewedPRs.flatMap(pr =>
    pr.reviews.filter(r => r.author === eng.login)
      .map(r => (new Date(r.submittedAt).getTime() - new Date(pr.createdAt).getTime()) / 60000)
  )
  const avgTurnaround = turnarounds.length > 0
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null
  const turnaroundScore = avgTurnaround !== null
    ? Math.max(0, 10 - Math.log2(avgTurnaround / 60 + 1) * 2) : 0

  return uniqueReviewed * 1.5 + substantive * 2 + approvals * 1 + turnaroundScore
}

// ============================================================
// D6: VELOCITY — Shipping cadence (DORA-lite)
// ============================================================
// Rubric: Three DORA-inspired sub-signals:
//   1. Merge frequency — PRs/week (higher = faster delivery)
//   2. Cycle time — log-inverse of avg open-to-merge (lower = better)
//   3. Consistency — inverse coefficient of variation of merge intervals
// Each sub-signal is balanced equally within this dimension.
// Data: PR timestamps (createdAt, mergedAt).
// Measures: how reliably this engineer ships.

function scoreVelocity(eng: EngineerRaw): number {
  const dates = eng.authoredPRs
    .filter(pr => pr.mergedAt)
    .map(pr => new Date(pr.mergedAt!).getTime())
    .sort((a, b) => a - b)

  if (dates.length < 2) return 0

  // Sub-signal 1: frequency (PRs/week), capped at 20
  const spanWeeks = (dates[dates.length - 1] - dates[0]) / (7 * 24 * 60 * 60 * 1000)
  const frequency = spanWeeks > 0 ? Math.min(dates.length / spanWeeks, 20) : dates.length

  // Sub-signal 2: speed (inverse cycle time), 0-10 scale
  const cycleTimes = eng.authoredPRs
    .filter(pr => pr.timeToMerge !== null).map(pr => pr.timeToMerge!)
  const avgCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null
  const speedScore = avgCycleTime !== null
    ? Math.max(0, 10 - Math.log2(avgCycleTime / 60 + 1) * 2) : 5

  // Sub-signal 3: consistency (inverse CV), 0-10 scale
  const intervals = dates.slice(1).map((d, i) => d - dates[i])
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((s, iv) => s + Math.pow(iv - avgInterval, 2), 0) / intervals.length
  const cv = avgInterval > 0 ? Math.sqrt(variance) / avgInterval : 1
  const consistencyScore = Math.max(0, 10 - cv * 5)

  // Equal blend of three sub-signals
  return frequency + speedScore + consistencyScore
}

// ============================================================
// D7: SCOPE & OWNERSHIP — Breadth of system influence
// ============================================================
// Rubric: Three sub-signals:
//   1. Unique directories touched (breadth)
//   2. Cross-cutting PRs — touching 3+ top-level dirs (architectural reach)
//   3. Product area diversity — LLM-classified distinct product areas
// Data: File paths from GitHub + LLM product area classification.
// Measures: architectural influence and ownership breadth.

function scoreScope(eng: EngineerRaw): number {
  if (eng.authoredPRs.length === 0) return 0

  const allDirs = new Set<string>()
  for (const pr of eng.authoredPRs) pr.directories.forEach(d => allDirs.add(d))

  const crossCutting = eng.authoredPRs.filter(pr => {
    const topLevel = new Set(pr.directories.map(d => d.split('/')[0]))
    return topLevel.size >= 3
  }).length

  const productAreas = new Set(eng.analyses.map(a => a.productArea))

  return allDirs.size * 2 + crossCutting * 5 + productAreas.size * 3
}

// ============================================================
// Utility: infer impact type from commit message (fallback only)
// ============================================================

function inferImpactType(pr: GitHubPR): ImpactType {
  const msg = pr.commits[0]?.message || pr.title
  const match = msg.match(/^(\w+)(?:\(|:)/)
  if (match) {
    const p = match[1].toLowerCase()
    if (p === 'feat') return 'feature'
    if (p === 'fix') return 'fix'
    if (p === 'refactor') return 'refactor'
    if (p === 'perf') return 'performance'
    if (p === 'chore' || p === 'ci') return 'chore'
    if (p === 'docs') return 'docs'
    if (p === 'test') return 'test'
  }
  return 'chore'
}

// ============================================================
// Explanation generation
// ============================================================

function generateExplanation(eng: EngineerImpact): string {
  const { dimensions: d, metrics: m } = eng
  const entries: [string, number][] = [
    ['effort', d.effort], ['strategic', d.strategic], ['impactMix', d.impactMix],
    ['quality', d.quality], ['collaboration', d.collaboration],
    ['velocity', d.velocity], ['scope', d.scope],
  ]
  entries.sort((a, b) => b[1] - a[1])

  const desc: Record<string, string> = {
    effort: `Shipped ${m.totalEffortHours.toFixed(0)} expert-hours across ${m.prsAuthored} PRs`,
    strategic: `${m.useCasesAdvanced.length} PostHog use cases advanced — highly aligned with the north star`,
    impactMix: `${m.impactTypes.feature || 0} features, ${m.impactTypes.fix || 0} fixes — strong value-creation mix`,
    quality: `Consistently high-quality PRs with clear problem statements and testing plans`,
    collaboration: `${m.reviewsGiven} reviews (${m.reviewsWithSubstance} substantive) — strong team multiplier`,
    velocity: `${m.avgCycleTime ? (m.avgCycleTime / 60).toFixed(1) + 'h' : '—'} avg cycle time, ${m.mergeFrequency.toFixed(1)} PRs/week`,
    scope: `Touches ${m.uniqueDirectories} areas of the codebase — broad architectural influence`,
  }

  const parts = [desc[entries[0][0]], desc[entries[1][0]]]
  if (m.aiPercentage > 0) parts.push(`${m.aiPercentage.toFixed(0)}% AI-assisted`)
  return parts.join('. ') + '.'
}

// ============================================================
// Main: compute independent scores → normalize → configure → composite
// ============================================================

export function computeScores(
  prs: GitHubPR[],
  prAnalyses: PRAnalysis[],
  weights: ScoreWeights = {
    effort: 0.15, strategic: 0.20, impactMix: 0.10, quality: 0.10,
    collaboration: 0.15, velocity: 0.15, scope: 0.15,
  }
): ScoredDataset {
  const analysisMap = new Map<number, PRAnalysis>()
  for (const a of prAnalyses) analysisMap.set(a.prNumber, a)

  const engineers = groupByEngineer(prs, analysisMap)

  // STEP 1: Compute independent raw scores
  const rawScores = new Map<string, Record<keyof DimensionScores, number>>()
  for (const [login, eng] of engineers) {
    rawScores.set(login, {
      effort: scoreEffort(eng),
      strategic: scoreStrategic(eng),
      impactMix: scoreImpactMix(eng),
      quality: scoreQuality(eng),
      collaboration: scoreCollaboration(eng),
      velocity: scoreVelocity(eng),
      scope: scoreScope(eng),
    })
  }

  // STEP 2: Percentile-normalize each dimension independently
  const distributions: Record<keyof DimensionScores, number[]> = {
    effort: [], strategic: [], impactMix: [], quality: [],
    collaboration: [], velocity: [], scope: [],
  }
  for (const raw of rawScores.values()) {
    for (const key of Object.keys(distributions) as (keyof DimensionScores)[]) {
      distributions[key].push(raw[key])
    }
  }

  // STEP 3: Build engineer results with configured composite
  const results: EngineerImpact[] = []

  for (const [login, eng] of engineers) {
    const raw = rawScores.get(login)!

    const dimensions: DimensionScores = {
      effort: percentileRank(raw.effort, distributions.effort),
      strategic: percentileRank(raw.strategic, distributions.strategic),
      impactMix: percentileRank(raw.impactMix, distributions.impactMix),
      quality: percentileRank(raw.quality, distributions.quality),
      collaboration: percentileRank(raw.collaboration, distributions.collaboration),
      velocity: percentileRank(raw.velocity, distributions.velocity),
      scope: percentileRank(raw.scope, distributions.scope),
    }

    const impactScore = Math.round(
      Object.entries(weights).reduce(
        (sum, [key, w]) => sum + dimensions[key as keyof DimensionScores] * w, 0
      )
    )

    // --- Metrics assembly (read-only from raw data, no scoring logic) ---
    const impactTypes: Record<ImpactType, number> = {
      feature: 0, fix: 0, refactor: 0, performance: 0, chore: 0, docs: 0, test: 0,
    }
    for (const a of eng.analyses) impactTypes[a.impactType]++
    for (const pr of eng.authoredPRs) {
      if (!analysisMap.has(pr.number)) impactTypes[inferImpactType(pr)]++
    }

    const areaCounts = new Map<PostHogProductArea, number>()
    for (const a of eng.analyses) areaCounts.set(a.productArea, (areaCounts.get(a.productArea) || 0) + 1)

    const useCasesSet = new Set<PostHogUseCase>()
    for (const a of eng.analyses) a.useCases.forEach(uc => useCasesSet.add(uc))

    const reviewsGiven = new Set(eng.reviewedPRs.map(pr => pr.number)).size
    const reviewsWithSubstance = eng.reviewedPRs.reduce((c, pr) =>
      c + pr.reviews.filter(r => r.author === login && r.body.length > 50).length, 0
    )
    const turnarounds = eng.reviewedPRs.flatMap(pr =>
      pr.reviews.filter(r => r.author === login)
        .map(r => (new Date(r.submittedAt).getTime() - new Date(pr.createdAt).getTime()) / 60000)
    )
    const avgReviewTurnaround = turnarounds.length > 0
      ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null

    const cycleTimes = eng.authoredPRs.filter(pr => pr.timeToMerge !== null).map(pr => pr.timeToMerge!)
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null
    const mergeDates = eng.authoredPRs.filter(pr => pr.mergedAt)
      .map(pr => new Date(pr.mergedAt!).getTime()).sort((a, b) => a - b)
    const spanWeeks = mergeDates.length >= 2
      ? (mergeDates[mergeDates.length - 1] - mergeDates[0]) / (7 * 24 * 60 * 60 * 1000) : 1
    const mergeFrequency = spanWeeks > 0 ? mergeDates.length / spanWeeks : mergeDates.length

    const totalEffortHours = eng.analyses.reduce((s, a) => s + a.effortHours, 0)
    const aiPRs = eng.authoredPRs.filter(pr => pr.commits.some(c => c.aiCoAuthors.length > 0)).length
    const allDirs = new Set<string>()
    eng.authoredPRs.forEach(pr => pr.directories.forEach(d => allDirs.add(d)))

    const topPRs = eng.analyses
      .sort((a, b) => b.strategicScore * b.effortHours - a.strategicScore * a.effortHours)
      .slice(0, 3)
      .map(a => ({
        number: a.prNumber,
        title: eng.authoredPRs.find(p => p.number === a.prNumber)?.title || `PR #${a.prNumber}`,
        strategicScore: a.strategicScore,
        effortHours: a.effortHours,
      }))

    const impact: EngineerImpact = {
      login,
      impactScore,
      dimensions,
      metrics: {
        prsAuthored: eng.authoredPRs.length,
        prsReviewed: reviewsGiven,
        totalEffortHours,
        totalAdditions: eng.authoredPRs.reduce((s, pr) => s + pr.additions, 0),
        totalDeletions: eng.authoredPRs.reduce((s, pr) => s + pr.deletions, 0),
        avgFilesPerPR: eng.authoredPRs.reduce((s, pr) => s + pr.changedFiles, 0) / eng.authoredPRs.length,
        uniqueDirectories: allDirs.size,
        impactTypes,
        productAreas: [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).map(([area, count]) => ({ area, count })),
        useCasesAdvanced: [...useCasesSet],
        reviewsGiven,
        reviewsWithSubstance,
        avgReviewTurnaround,
        avgCycleTime,
        mergeFrequency,
        aiAssistedPRs: aiPRs,
        aiPercentage: eng.authoredPRs.length > 0 ? (aiPRs / eng.authoredPRs.length) * 100 : 0,
      },
      explanation: '',
      topPRs,
    }
    impact.explanation = generateExplanation(impact)
    results.push(impact)
  }

  results.sort((a, b) => b.impactScore - a.impactScore)

  // Summary
  const allCycleTimes = prs.filter(pr => pr.timeToMerge !== null).map(pr => pr.timeToMerge!).sort((a, b) => a - b)
  const allImpactTypes: Record<ImpactType, number> = { feature: 0, fix: 0, refactor: 0, performance: 0, chore: 0, docs: 0, test: 0 }
  for (const a of prAnalyses) allImpactTypes[a.impactType]++
  const allAreaCounts = new Map<PostHogProductArea, number>()
  for (const a of prAnalyses) allAreaCounts.set(a.productArea, (allAreaCounts.get(a.productArea) || 0) + 1)

  return {
    summary: {
      repo: 'PostHog/posthog',
      dateRange: {
        start: prs.length > 0 ? prs[prs.length - 1].createdAt : '',
        end: prs.length > 0 ? prs[0].createdAt : '',
      },
      totalPRs: prs.length,
      totalEngineers: results.length,
      totalReviews: prs.reduce((s, pr) => s + pr.reviews.length, 0),
      totalCommits: prs.reduce((s, pr) => s + pr.commits.length, 0),
      totalEffortHours: prAnalyses.reduce((s, a) => s + a.effortHours, 0),
      medianCycleTime: allCycleTimes.length > 0 ? allCycleTimes[Math.floor(allCycleTimes.length / 2)] : null,
      avgPRSize: prs.reduce((s, pr) => s + pr.additions + pr.deletions, 0) / prs.length,
      avgStrategicScore: prAnalyses.length > 0 ? prAnalyses.reduce((s, a) => s + a.strategicScore, 0) / prAnalyses.length : 0,
      impactTypeDistribution: allImpactTypes,
      topProductAreas: [...allAreaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([area, count]) => ({ area, count })),
    },
    engineers: results,
    topFive: results.slice(0, 5),
    weights,
  }
}
