/**
 * Engineering Impact Scoring Engine — 7 Dimensions
 *
 * D1: Effort (LLM)     — expert-hours shipped
 * D2: Strategic (LLM)  — alignment to PostHog's north star
 * D3: Impact Mix       — feature vs fix vs chore distribution
 * D4: Quality (LLM)    — PR quality signals
 * D5: Collaboration    — review depth, turnaround, knowledge sharing
 * D6: Velocity         — cycle time, frequency, consistency (DORA-lite)
 * D7: Scope            — breadth, cross-cutting ownership
 *
 * Each dimension → percentile-normalized to 0-100 across the cohort.
 * Composite = weighted sum.
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
// Percentile normalization
// ============================================================

function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50
  const sorted = [...distribution].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  const equal = sorted.filter(v => v === value).length
  return Math.round(((below + equal * 0.5) / sorted.length) * 100)
}

// ============================================================
// Per-engineer raw data grouping
// ============================================================

interface EngineerRaw {
  login: string
  authoredPRs: GitHubPR[]
  /** PR analyses for this engineer's authored PRs */
  analyses: PRAnalysis[]
  /** PRs this engineer reviewed (authored by someone else) */
  reviewedPRs: GitHubPR[]
}

function groupByEngineer(
  prs: GitHubPR[],
  analyses: Map<number, PRAnalysis>
): Map<string, EngineerRaw> {
  const map = new Map<string, EngineerRaw>()

  const getOrCreate = (login: string): EngineerRaw => {
    if (!map.has(login)) {
      map.set(login, { login, authoredPRs: [], analyses: [], reviewedPRs: [] })
    }
    return map.get(login)!
  }

  for (const pr of prs) {
    if (pr.author.includes('[bot]') || pr.authorType === 'Bot') continue
    const eng = getOrCreate(pr.author)
    eng.authoredPRs.push(pr)
    const analysis = analyses.get(pr.number)
    if (analysis) eng.analyses.push(analysis)

    for (const review of pr.reviews) {
      if (review.author !== pr.author && !review.author.includes('[bot]')) {
        getOrCreate(review.author).reviewedPRs.push(pr)
      }
    }
  }

  return map
}

// ============================================================
// D1: EFFORT — Total expert-hours shipped (LLM-scored)
// ============================================================

function rawEffort(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) {
    // Fallback: estimate from PR size (log-scaled)
    return eng.authoredPRs.reduce((sum, pr) => {
      const size = pr.additions + pr.deletions
      return sum + Math.max(0.5, Math.log2(size + 1) * 0.5)
    }, 0)
  }
  return eng.analyses.reduce((sum, a) => sum + a.effortHours, 0)
}

// ============================================================
// D2: STRATEGIC — Alignment to PostHog's north star (LLM-scored)
// ============================================================

function rawStrategic(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) return 5 // neutral
  // Weighted average: higher-effort PRs count more toward strategic score
  const totalEffort = eng.analyses.reduce((s, a) => s + a.effortHours, 0)
  if (totalEffort === 0) return 5
  return eng.analyses.reduce(
    (s, a) => s + a.strategicScore * (a.effortHours / totalEffort), 0
  )
}

// ============================================================
// D3: IMPACT MIX — Feature-heavy > fix-heavy > chore-heavy
// ============================================================

const IMPACT_WEIGHTS: Record<ImpactType, number> = {
  feature: 1.0,
  fix: 0.7,
  performance: 0.8,
  refactor: 0.6,
  test: 0.5,
  docs: 0.3,
  chore: 0.2,
}

function rawImpactMix(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) {
    // Fallback: infer from commit prefixes
    return eng.authoredPRs.reduce((sum, pr) => {
      const prefix = inferImpactType(pr)
      return sum + (IMPACT_WEIGHTS[prefix] || 0.5)
    }, 0) / Math.max(eng.authoredPRs.length, 1)
  }
  return eng.analyses.reduce((sum, a) => {
    return sum + (IMPACT_WEIGHTS[a.impactType] || 0.5)
  }, 0) / eng.analyses.length
}

function inferImpactType(pr: GitHubPR): ImpactType {
  const firstCommit = pr.commits[0]?.message || pr.title
  const match = firstCommit.match(/^(\w+)(?:\(|:)/)
  if (match) {
    const prefix = match[1].toLowerCase()
    if (prefix === 'feat') return 'feature'
    if (prefix === 'fix') return 'fix'
    if (prefix === 'refactor') return 'refactor'
    if (prefix === 'perf') return 'performance'
    if (prefix === 'chore' || prefix === 'ci') return 'chore'
    if (prefix === 'docs') return 'docs'
    if (prefix === 'test') return 'test'
  }
  // Heuristic from title
  const title = pr.title.toLowerCase()
  if (title.includes('feat') || title.includes('add') || title.includes('new')) return 'feature'
  if (title.includes('fix') || title.includes('bug')) return 'fix'
  if (title.includes('refactor')) return 'refactor'
  if (title.includes('perf') || title.includes('speed') || title.includes('optim')) return 'performance'
  if (title.includes('test')) return 'test'
  if (title.includes('doc')) return 'docs'
  return 'chore'
}

// ============================================================
// D4: QUALITY — PR quality signals (LLM-scored)
// ============================================================

function rawQuality(eng: EngineerRaw): number {
  if (eng.analyses.length === 0) return 5
  return eng.analyses.reduce((sum, a) => sum + a.qualityScore, 0) / eng.analyses.length
}

// ============================================================
// D5: COLLABORATION — Review depth, turnaround, knowledge sharing
// ============================================================

function rawCollaboration(eng: EngineerRaw): number {
  const uniqueReviewed = new Set(eng.reviewedPRs.map(pr => pr.number)).size

  // Substantive reviews (body > 20 chars)
  const substantive = eng.reviewedPRs.reduce((count, pr) => {
    return count + pr.reviews.filter(r =>
      r.author === eng.login && r.body.length > 20
    ).length
  }, 0)

  // Approvals (unblocking)
  const approvals = eng.reviewedPRs.reduce((count, pr) => {
    return count + (pr.reviews.some(r =>
      r.author === eng.login && r.state === 'APPROVED'
    ) ? 1 : 0)
  }, 0)

  // Review turnaround speed (inverse: faster = better)
  const turnarounds = eng.reviewedPRs.flatMap(pr =>
    pr.reviews
      .filter(r => r.author === eng.login)
      .map(r => {
        const prCreated = new Date(pr.createdAt).getTime()
        const reviewed = new Date(r.submittedAt).getTime()
        return (reviewed - prCreated) / 60000 // minutes
      })
  )
  const avgTurnaround = turnarounds.length > 0
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : null

  // Turnaround bonus: fast reviewers get a boost
  const turnaroundBonus = avgTurnaround !== null
    ? Math.max(0, 10 - Math.log2(avgTurnaround / 60 + 1) * 2)
    : 5

  return uniqueReviewed * 1.5 + substantive * 2 + approvals * 1 + turnaroundBonus
}

// ============================================================
// D6: VELOCITY — Cycle time, frequency, consistency (DORA-lite)
// ============================================================

function rawVelocity(eng: EngineerRaw): number {
  if (eng.authoredPRs.length === 0) return 0

  // Merge frequency (PRs per week)
  const dates = eng.authoredPRs
    .filter(pr => pr.mergedAt)
    .map(pr => new Date(pr.mergedAt!).getTime())
    .sort((a, b) => a - b)

  if (dates.length < 2) return eng.authoredPRs.length

  const spanWeeks = (dates[dates.length - 1] - dates[0]) / (7 * 24 * 60 * 60 * 1000)
  const frequency = spanWeeks > 0 ? dates.length / spanWeeks : dates.length

  // Cycle time (lower is better) — use inverse
  const cycleTimes = eng.authoredPRs
    .filter(pr => pr.timeToMerge !== null)
    .map(pr => pr.timeToMerge!)
  const avgCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : null

  // Speed score: inverse of cycle time (capped)
  const speedScore = avgCycleTime !== null
    ? Math.max(0, 20 - Math.log2(avgCycleTime / 60 + 1) * 3)
    : 10

  // Consistency: low variance in merge dates = consistent shipping
  const intervals = dates.slice(1).map((d, i) => d - dates[i])
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length
  const cv = avgInterval > 0 ? Math.sqrt(variance) / avgInterval : 1
  const consistencyScore = Math.max(0, 10 - cv * 5) // lower CV = more consistent

  return frequency * 3 + speedScore + consistencyScore
}

// ============================================================
// D7: SCOPE & OWNERSHIP — Breadth, cross-cutting influence
// ============================================================

function rawScope(eng: EngineerRaw): number {
  if (eng.authoredPRs.length === 0) return 0

  const allDirs = new Set<string>()
  let totalFiles = 0

  for (const pr of eng.authoredPRs) {
    pr.directories.forEach(d => allDirs.add(d))
    totalFiles += pr.changedFiles
  }

  const avgFiles = totalFiles / eng.authoredPRs.length

  // Cross-cutting bonus: PRs that touch multiple top-level dirs
  const crossCutting = eng.authoredPRs.filter(pr => {
    const topLevel = new Set(pr.directories.map(d => d.split('/')[0]))
    return topLevel.size >= 3
  }).length

  return allDirs.size * 2 + avgFiles * 0.3 + crossCutting * 3
}

// ============================================================
// Explanation generation
// ============================================================

function generateExplanation(eng: EngineerImpact): string {
  const { dimensions: d, metrics: m } = eng
  const parts: string[] = []

  // Sort dimensions to lead with strongest
  const dimEntries: [string, number][] = [
    ['effort', d.effort], ['strategic', d.strategic], ['impactMix', d.impactMix],
    ['quality', d.quality], ['collaboration', d.collaboration],
    ['velocity', d.velocity], ['scope', d.scope],
  ]
  dimEntries.sort((a, b) => b[1] - a[1])

  const desc: Record<string, string> = {
    effort: `Shipped ${m.totalEffortHours.toFixed(0)} expert-hours across ${m.prsAuthored} PRs`,
    strategic: `${m.useCasesAdvanced.length} PostHog use cases advanced — highly aligned with the north star`,
    impactMix: `${m.impactTypes.feature || 0} feature PRs, ${m.impactTypes.fix || 0} fixes — strong value-creation mix`,
    quality: `Consistently high-quality PRs with clear problem statements and testing plans`,
    collaboration: `${m.reviewsGiven} reviews given (${m.reviewsWithSubstance} substantive) — strong team multiplier`,
    velocity: `${m.avgCycleTime ? (m.avgCycleTime / 60).toFixed(1) + 'h' : '—'} avg cycle time, ${m.mergeFrequency.toFixed(1)} PRs/week`,
    scope: `Touches ${m.uniqueDirectories} areas of the codebase — broad architectural influence`,
  }

  // Top 2 dimensions
  parts.push(desc[dimEntries[0][0]])
  parts.push(desc[dimEntries[1][0]])

  if (m.aiPercentage > 0) {
    parts.push(`${m.aiPercentage.toFixed(0)}% AI-assisted`)
  }

  return parts.join('. ') + '.'
}

// ============================================================
// Main scoring function
// ============================================================

export function computeScores(
  prs: GitHubPR[],
  prAnalyses: PRAnalysis[],
  weights: ScoreWeights = {
    effort: 0.15, strategic: 0.20, impactMix: 0.10, quality: 0.10,
    collaboration: 0.15, velocity: 0.15, scope: 0.15,
  }
): ScoredDataset {
  // Index analyses by PR number
  const analysisMap = new Map<number, PRAnalysis>()
  for (const a of prAnalyses) analysisMap.set(a.prNumber, a)

  const engineers = groupByEngineer(prs, analysisMap)

  // Compute raw scores
  const rawScores = new Map<string, Record<keyof DimensionScores, number>>()
  for (const [login, eng] of engineers) {
    rawScores.set(login, {
      effort: rawEffort(eng),
      strategic: rawStrategic(eng),
      impactMix: rawImpactMix(eng),
      quality: rawQuality(eng),
      collaboration: rawCollaboration(eng),
      velocity: rawVelocity(eng),
      scope: rawScope(eng),
    })
  }

  // Percentile-normalize each dimension
  const distributions: Record<keyof DimensionScores, number[]> = {
    effort: [], strategic: [], impactMix: [], quality: [],
    collaboration: [], velocity: [], scope: [],
  }
  for (const raw of rawScores.values()) {
    for (const key of Object.keys(distributions) as (keyof DimensionScores)[]) {
      distributions[key].push(raw[key])
    }
  }

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
        (sum, [key, weight]) => sum + dimensions[key as keyof DimensionScores] * weight, 0
      )
    )

    // Impact type breakdown
    const impactTypes: Record<ImpactType, number> = {
      feature: 0, fix: 0, refactor: 0, performance: 0, chore: 0, docs: 0, test: 0,
    }
    for (const a of eng.analyses) {
      impactTypes[a.impactType] = (impactTypes[a.impactType] || 0) + 1
    }
    // Fill in from fallback for non-analyzed PRs
    for (const pr of eng.authoredPRs) {
      if (!analysisMap.has(pr.number)) {
        const t = inferImpactType(pr)
        impactTypes[t] = (impactTypes[t] || 0) + 1
      }
    }

    // Product areas
    const areaCounts = new Map<PostHogProductArea, number>()
    for (const a of eng.analyses) {
      areaCounts.set(a.productArea, (areaCounts.get(a.productArea) || 0) + 1)
    }
    const productAreas = [...areaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({ area, count }))

    // Use cases
    const useCasesSet = new Set<PostHogUseCase>()
    for (const a of eng.analyses) a.useCases.forEach(uc => useCasesSet.add(uc))

    // Review metrics
    const reviewsGiven = new Set(eng.reviewedPRs.map(pr => pr.number)).size
    const reviewsWithSubstance = eng.reviewedPRs.reduce((count, pr) =>
      count + pr.reviews.filter(r => r.author === login && r.body.length > 20).length, 0
    )
    const turnarounds = eng.reviewedPRs.flatMap(pr =>
      pr.reviews.filter(r => r.author === login)
        .map(r => (new Date(r.submittedAt).getTime() - new Date(pr.createdAt).getTime()) / 60000)
    )
    const avgReviewTurnaround = turnarounds.length > 0
      ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null

    // Velocity metrics
    const cycleTimes = eng.authoredPRs
      .filter(pr => pr.timeToMerge !== null).map(pr => pr.timeToMerge!)
    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null
    const mergeDates = eng.authoredPRs.filter(pr => pr.mergedAt)
      .map(pr => new Date(pr.mergedAt!).getTime()).sort((a, b) => a - b)
    const spanWeeks = mergeDates.length >= 2
      ? (mergeDates[mergeDates.length - 1] - mergeDates[0]) / (7 * 24 * 60 * 60 * 1000)
      : 1
    const mergeFrequency = spanWeeks > 0 ? mergeDates.length / spanWeeks : mergeDates.length

    const totalEffortHours = eng.analyses.length > 0
      ? eng.analyses.reduce((s, a) => s + a.effortHours, 0)
      : eng.authoredPRs.reduce((s, pr) => s + Math.max(0.5, Math.log2(pr.additions + pr.deletions + 1) * 0.5), 0)

    const aiPRs = eng.authoredPRs.filter(pr =>
      pr.commits.some(c => c.aiCoAuthors.length > 0)
    ).length

    // Top PRs by strategic value
    const topPRs = eng.analyses
      .sort((a, b) => b.strategicScore * b.effortHours - a.strategicScore * a.effortHours)
      .slice(0, 3)
      .map(a => {
        const pr = eng.authoredPRs.find(p => p.number === a.prNumber)
        return {
          number: a.prNumber,
          title: pr?.title || `PR #${a.prNumber}`,
          strategicScore: a.strategicScore,
          effortHours: a.effortHours,
        }
      })

    const totalAdditions = eng.authoredPRs.reduce((s, pr) => s + pr.additions, 0)
    const totalDeletions = eng.authoredPRs.reduce((s, pr) => s + pr.deletions, 0)
    const allDirs = new Set<string>()
    eng.authoredPRs.forEach(pr => pr.directories.forEach(d => allDirs.add(d)))

    const impact: EngineerImpact = {
      login,
      impactScore,
      dimensions,
      metrics: {
        prsAuthored: eng.authoredPRs.length,
        prsReviewed: reviewsGiven,
        totalEffortHours,
        totalAdditions,
        totalDeletions,
        avgFilesPerPR: eng.authoredPRs.reduce((s, pr) => s + pr.changedFiles, 0) / eng.authoredPRs.length,
        uniqueDirectories: allDirs.size,
        impactTypes,
        productAreas,
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
  const allCycleTimes = prs
    .filter(pr => pr.timeToMerge !== null).map(pr => pr.timeToMerge!)
    .sort((a, b) => a - b)

  const allImpactTypes: Record<ImpactType, number> = {
    feature: 0, fix: 0, refactor: 0, performance: 0, chore: 0, docs: 0, test: 0,
  }
  for (const a of prAnalyses) allImpactTypes[a.impactType]++

  const allAreaCounts = new Map<PostHogProductArea, number>()
  for (const a of prAnalyses) allAreaCounts.set(a.productArea, (allAreaCounts.get(a.productArea) || 0) + 1)

  const summary: DatasetSummary = {
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
    avgStrategicScore: prAnalyses.length > 0
      ? prAnalyses.reduce((s, a) => s + a.strategicScore, 0) / prAnalyses.length : 0,
    impactTypeDistribution: allImpactTypes,
    topProductAreas: [...allAreaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([area, count]) => ({ area, count })),
  }

  return {
    summary,
    engineers: results,
    topFive: results.slice(0, 5),
    weights,
  }
}
