/**
 * Engineering Impact Scoring Engine
 *
 * Impact = f(Scope, Depth, Leverage, Durability)
 *
 * Each pillar is scored 0-100 using percentile ranking within the cohort.
 * The composite score is a weighted blend of the four pillars.
 */
import type {
  GitHubPR,
  EngineerImpact,
  ScoredDataset,
  ScoreWeights,
  DatasetSummary,
} from './types'

// ============================================================
// Percentile normalization
// ============================================================

/** Rank a value within a distribution, return 0-100 percentile */
function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50
  const sorted = [...distribution].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  const equal = sorted.filter(v => v === value).length
  return Math.round(((below + equal * 0.5) / sorted.length) * 100)
}

/** Inverse percentile (lower is better, like cycle time) */
function inversePercentileRank(value: number, distribution: number[]): number {
  return 100 - percentileRank(value, distribution)
}

// ============================================================
// Per-engineer raw metric extraction
// ============================================================

interface EngineerRaw {
  login: string
  authoredPRs: GitHubPR[]
  reviewedPRs: GitHubPR[]
}

function groupByEngineer(prs: GitHubPR[]): Map<string, EngineerRaw> {
  const map = new Map<string, EngineerRaw>()

  const getOrCreate = (login: string): EngineerRaw => {
    if (!map.has(login)) {
      map.set(login, { login, authoredPRs: [], reviewedPRs: [] })
    }
    return map.get(login)!
  }

  for (const pr of prs) {
    // Skip bots
    if (pr.author.includes('[bot]') || pr.authorType === 'Bot') continue
    getOrCreate(pr.author).authoredPRs.push(pr)

    for (const review of pr.reviews) {
      if (review.author !== pr.author && !review.author.includes('[bot]')) {
        getOrCreate(review.author).reviewedPRs.push(pr)
      }
    }
  }

  return map
}

// ============================================================
// Pillar 1: SCOPE — Breadth of system change
// ============================================================

function computeScope(eng: EngineerRaw): number {
  if (eng.authoredPRs.length === 0) return 0

  // Unique directories touched across all PRs
  const allDirs = new Set<string>()
  let totalDirs = 0
  let totalFiles = 0

  for (const pr of eng.authoredPRs) {
    pr.directories.forEach(d => allDirs.add(d))
    totalDirs += pr.directories.length
    totalFiles += pr.changedFiles
  }

  // Raw scope = unique directories * avg files per PR
  // This captures both breadth (many dirs) and volume (files changed)
  const avgFilesPerPR = totalFiles / eng.authoredPRs.length
  const avgDirsPerPR = totalDirs / eng.authoredPRs.length

  // Composite raw score: weight unique dirs higher (cross-cutting > deep-in-one-dir)
  return allDirs.size * 2 + avgDirsPerPR * 3 + avgFilesPerPR * 0.5
}

// ============================================================
// Pillar 2: DEPTH — Technical complexity
// ============================================================

function computeDepth(eng: EngineerRaw): number {
  if (eng.authoredPRs.length === 0) return 0

  let totalComplexity = 0

  for (const pr of eng.authoredPRs) {
    // Heuristic complexity scoring:
    // 1. Non-trivial changes (not just config/docs)
    const codeFiles = pr.files.filter(f =>
      /\.(ts|tsx|js|jsx|py|go|rs|java|rb|cs|cpp|c|h)$/.test(f)
    ).length
    const totalFiles = pr.files.length || 1
    const codeRatio = codeFiles / totalFiles

    // 2. Balanced additions/deletions suggest refactoring (harder than pure additions)
    const total = pr.additions + pr.deletions
    const balance = total > 0
      ? 1 - Math.abs(pr.additions - pr.deletions) / total
      : 0

    // 3. Multi-file changes are generally more complex
    const fileSpread = Math.min(pr.changedFiles / 5, 1) // caps at 5 files

    // 4. Changes that touch tests alongside code show thoroughness
    const hasTests = pr.files.some(f => /\.(test|spec|_test)\./i.test(f))
    const hasCode = codeRatio > 0.3
    const testWithCode = hasTests && hasCode ? 0.2 : 0

    // 5. Review cycles indicate complexity (more back-and-forth = harder problem)
    const changesRequested = pr.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length
    const reviewComplexity = Math.min(changesRequested * 0.15, 0.3)

    // PR complexity = weighted blend
    const prComplexity =
      codeRatio * 0.3 +
      balance * 0.2 +
      fileSpread * 0.2 +
      testWithCode +
      reviewComplexity +
      Math.min(Math.log2(total + 1) / 12, 0.3) // log-scaled size

    totalComplexity += prComplexity
  }

  // Average complexity per PR, scaled by PR count (more complex PRs = more impact)
  return (totalComplexity / eng.authoredPRs.length) * Math.log2(eng.authoredPRs.length + 1) * 10
}

// ============================================================
// Pillar 3: LEVERAGE — Team multiplier effect
// ============================================================

function computeLeverage(eng: EngineerRaw): number {
  // Reviews given (unique PRs reviewed)
  const uniqueReviewed = new Set(eng.reviewedPRs.map(pr => pr.number)).size

  // Substantive reviews (reviews with body > 20 chars)
  const substantiveReviews = eng.reviewedPRs.reduce((count, pr) => {
    const engReviews = pr.reviews.filter(r =>
      r.author === eng.login && r.body.length > 20
    )
    return count + engReviews.length
  }, 0)

  // Approvals given (unblocking others)
  const approvals = eng.reviewedPRs.reduce((count, pr) => {
    const approved = pr.reviews.some(r =>
      r.author === eng.login && r.state === 'APPROVED'
    )
    return count + (approved ? 1 : 0)
  }, 0)

  // Review-to-author ratio (high = team multiplier)
  const ratio = eng.authoredPRs.length > 0
    ? uniqueReviewed / eng.authoredPRs.length
    : uniqueReviewed

  // Composite leverage score
  return (
    uniqueReviewed * 1.5 +
    substantiveReviews * 2 +
    approvals * 1 +
    ratio * 10
  )
}

// ============================================================
// Pillar 4: DURABILITY — Work that endures
// ============================================================

function computeDurability(eng: EngineerRaw, allPRs: GitHubPR[]): number {
  if (eng.authoredPRs.length === 0) return 50 // neutral default

  // Check if any of this engineer's files were modified by subsequent PRs
  // within 21 days (indicating churn / rework)
  let totalFiles = 0
  let churnedFiles = 0

  for (const pr of eng.authoredPRs) {
    if (!pr.mergedAt) continue
    const mergedTime = new Date(pr.mergedAt).getTime()
    const churnWindow = 21 * 24 * 60 * 60 * 1000 // 21 days

    for (const file of pr.files) {
      totalFiles++
      // Check if this file was modified in a later PR within 21 days
      const wasChurned = allPRs.some(laterPR =>
        laterPR.number !== pr.number &&
        laterPR.author !== eng.login && // self-iteration doesn't count as churn
        laterPR.mergedAt &&
        new Date(laterPR.mergedAt).getTime() > mergedTime &&
        new Date(laterPR.mergedAt).getTime() < mergedTime + churnWindow &&
        laterPR.files.includes(file)
      )
      if (wasChurned) churnedFiles++
    }
  }

  const churnRate = totalFiles > 0 ? churnedFiles / totalFiles : 0

  // Inverse: low churn = high durability
  // Also factor in: merged (not closed) ratio
  const mergedRatio = eng.authoredPRs.filter(pr => pr.mergedAt).length / eng.authoredPRs.length

  return (1 - churnRate) * 70 + mergedRatio * 30
}

// ============================================================
// Composite scoring
// ============================================================

function generateExplanation(eng: EngineerImpact): string {
  const parts: string[] = []
  const { pillars, metrics } = eng

  // Lead with strongest pillar
  const pillarEntries = Object.entries(pillars) as [string, number][]
  pillarEntries.sort((a, b) => b[1] - a[1])
  const strongest = pillarEntries[0]

  const pillarDescriptions: Record<string, string> = {
    scope: `works across ${metrics.uniqueDirectories} different areas of the codebase, averaging ${metrics.avgFilesPerPR.toFixed(1)} files per PR`,
    depth: `tackles complex changes with ${metrics.prsAuthored} PRs averaging ${(metrics.totalAdditions / Math.max(metrics.prsAuthored, 1)).toFixed(0)} additions each`,
    leverage: `multiplies team output with ${metrics.reviewsGiven} reviews (${metrics.reviewsWithSubstance} substantive) across others' PRs`,
    durability: `ships code that sticks — ${((1 - metrics.churnRate) * 100).toFixed(0)}% of changed files remain untouched after 21 days`,
  }

  parts.push(pillarDescriptions[strongest[0]] || '')

  // AI attribution
  if (metrics.aiPercentage > 0) {
    parts.push(`${metrics.aiPercentage.toFixed(0)}% of PRs include AI-assisted commits`)
  }

  // Cycle time
  if (metrics.avgCycleTime !== null) {
    const hours = metrics.avgCycleTime / 60
    if (hours < 24) {
      parts.push(`avg cycle time of ${hours.toFixed(1)}h`)
    } else {
      parts.push(`avg cycle time of ${(hours / 24).toFixed(1)} days`)
    }
  }

  return parts.join('. ') + '.'
}

export function computeScores(
  prs: GitHubPR[],
  weights: ScoreWeights = { scope: 0.25, depth: 0.30, leverage: 0.25, durability: 0.20 }
): ScoredDataset {
  const engineers = groupByEngineer(prs)

  // Compute raw scores for each engineer
  const rawScores = new Map<string, { scope: number; depth: number; leverage: number; durability: number }>()

  for (const [login, eng] of engineers) {
    rawScores.set(login, {
      scope: computeScope(eng),
      depth: computeDepth(eng),
      leverage: computeLeverage(eng),
      durability: computeDurability(eng, prs),
    })
  }

  // Percentile-normalize each pillar across all engineers
  const allScope = [...rawScores.values()].map(r => r.scope)
  const allDepth = [...rawScores.values()].map(r => r.depth)
  const allLeverage = [...rawScores.values()].map(r => r.leverage)
  const allDurability = [...rawScores.values()].map(r => r.durability)

  const results: EngineerImpact[] = []

  for (const [login, eng] of engineers) {
    const raw = rawScores.get(login)!

    const pillars = {
      scope: percentileRank(raw.scope, allScope),
      depth: percentileRank(raw.depth, allDepth),
      leverage: percentileRank(raw.leverage, allLeverage),
      durability: percentileRank(raw.durability, allDurability),
    }

    const impactScore = Math.round(
      pillars.scope * weights.scope +
      pillars.depth * weights.depth +
      pillars.leverage * weights.leverage +
      pillars.durability * weights.durability
    )

    // Compute supporting metrics
    const reviewsGiven = eng.reviewedPRs.length
    const reviewsWithSubstance = eng.reviewedPRs.reduce((count, pr) => {
      return count + pr.reviews.filter(r => r.author === login && r.body.length > 20).length
    }, 0)

    const cycleTimes = eng.authoredPRs
      .filter(pr => pr.timeToMerge !== null)
      .map(pr => pr.timeToMerge!)
    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : null

    const reviewTimes = eng.reviewedPRs
      .flatMap(pr => pr.reviews
        .filter(r => r.author === login)
        .map(r => {
          const prCreated = new Date(pr.createdAt).getTime()
          const reviewed = new Date(r.submittedAt).getTime()
          return Math.round((reviewed - prCreated) / 60000)
        })
      )
    const avgTimeToReview = reviewTimes.length > 0
      ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
      : null

    const totalAdditions = eng.authoredPRs.reduce((s, pr) => s + pr.additions, 0)
    const totalDeletions = eng.authoredPRs.reduce((s, pr) => s + pr.deletions, 0)
    const allDirs = new Set<string>()
    eng.authoredPRs.forEach(pr => pr.directories.forEach(d => allDirs.add(d)))

    const aiPRs = eng.authoredPRs.filter(pr =>
      pr.commits.some(c => c.aiCoAuthors.length > 0)
    ).length

    // Churn rate (simplified)
    let totalFiles = 0
    let churnedFiles = 0
    for (const pr of eng.authoredPRs) {
      if (!pr.mergedAt) continue
      const mergedTime = new Date(pr.mergedAt).getTime()
      const window = 21 * 24 * 60 * 60 * 1000
      for (const file of pr.files) {
        totalFiles++
        if (prs.some(lpr =>
          lpr.number !== pr.number &&
          lpr.author !== login &&
          lpr.mergedAt &&
          new Date(lpr.mergedAt).getTime() > mergedTime &&
          new Date(lpr.mergedAt).getTime() < mergedTime + window &&
          lpr.files.includes(file)
        )) churnedFiles++
      }
    }

    const impact: EngineerImpact = {
      login,
      impactScore,
      pillars,
      metrics: {
        prsAuthored: eng.authoredPRs.length,
        prsReviewed: new Set(eng.reviewedPRs.map(pr => pr.number)).size,
        totalAdditions,
        totalDeletions,
        avgFilesPerPR: eng.authoredPRs.reduce((s, pr) => s + pr.changedFiles, 0) / eng.authoredPRs.length,
        avgDirectoriesPerPR: eng.authoredPRs.reduce((s, pr) => s + pr.directories.length, 0) / eng.authoredPRs.length,
        uniqueDirectories: allDirs.size,
        reviewsGiven,
        reviewsWithSubstance,
        avgTimeToReview,
        avgCycleTime,
        churnRate: totalFiles > 0 ? churnedFiles / totalFiles : 0,
        aiAssistedPRs: aiPRs,
        aiPercentage: eng.authoredPRs.length > 0 ? (aiPRs / eng.authoredPRs.length) * 100 : 0,
      },
      explanation: '', // filled below
    }

    impact.explanation = generateExplanation(impact)
    results.push(impact)
  }

  // Sort by impact score descending
  results.sort((a, b) => b.impactScore - a.impactScore)

  // Summary stats
  const allCycleTimes = prs
    .filter(pr => pr.timeToMerge !== null)
    .map(pr => pr.timeToMerge!)
    .sort((a, b) => a - b)

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
    medianCycleTime: allCycleTimes.length > 0
      ? allCycleTimes[Math.floor(allCycleTimes.length / 2)]
      : null,
    avgPRSize: prs.reduce((s, pr) => s + pr.additions + pr.deletions, 0) / prs.length,
  }

  return {
    summary,
    engineers: results,
    topFive: results.slice(0, 5),
    weights,
  }
}

