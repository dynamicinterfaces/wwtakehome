// ============================================================
// Engineering Impact Scoring System — Type Contracts
// 7-Dimension Framework: Effort, Strategic, Impact Type,
// Quality, Collaboration, Velocity, Scope
// ============================================================

/** Raw PR data from GitHub API */
export interface GitHubPR {
  number: number
  title: string
  body: string
  author: string
  authorType: 'User' | 'Bot'
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  isDraft: boolean
  additions: number
  deletions: number
  changedFiles: number
  labels: string[]
  reviewDecision: string | null
  /** Directories touched (extracted from file paths) */
  directories: string[]
  /** File paths changed */
  files: string[]
  /** Reviews on this PR */
  reviews: GitHubReview[]
  /** Commits in this PR */
  commits: GitHubCommit[]
  /** Linked issue numbers */
  linkedIssues: number[]
  /** Time from open to first review (minutes) */
  timeToFirstReview: number | null
  /** Time from open to merge (minutes) */
  timeToMerge: number | null
}

export interface GitHubReview {
  author: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED'
  submittedAt: string
  body: string
}

export interface GitHubCommit {
  sha: string
  message: string
  author: string
  committer: string
  additions: number
  deletions: number
  /** Detected AI co-author trailers */
  aiCoAuthors: string[]
}

// ============================================================
// PostHog Strategic Context
// ============================================================

/** PostHog's 8 documented use cases */
export type PostHogUseCase =
  | 'user-navigation'      // Understand user navigation
  | 'feature-adoption'     // Identify feature adoption drivers
  | 'hypothesis-validation' // Validate hypotheses (A/B testing)
  | 'user-feedback'        // Collect user feedback (Surveys)
  | 'business-outcomes'    // Track business outcomes
  | 'feature-rollouts'     // Controlled feature rollouts
  | 'debug-issues'         // Debug user issues
  | 'ai-product'           // AI-assisted product understanding

/** PostHog's 17+ product areas */
export type PostHogProductArea =
  | 'product-analytics'
  | 'web-analytics'
  | 'session-replay'
  | 'feature-flags'
  | 'experiments'
  | 'surveys'
  | 'data-warehouse'
  | 'error-tracking'
  | 'llm-analytics'
  | 'logs'
  | 'batch-exports'
  | 'workflows'
  | 'posthog-ai'
  | 'posthog-code'
  | 'mcp-server'
  | 'conversations'
  | 'signals'
  | 'infrastructure'
  | 'devex'
  | 'design-system'

/** Impact type from conventional commit analysis */
export type ImpactType =
  | 'feature'     // New user-facing value
  | 'fix'         // Reliability / bug fix
  | 'refactor'    // Code health / architecture
  | 'performance' // Speed / efficiency
  | 'chore'       // Maintenance / CI / deps
  | 'docs'        // Documentation
  | 'test'        // Test coverage

// ============================================================
// LLM-Scored PR Analysis
// ============================================================

/** Per-PR LLM analysis result */
export interface PRAnalysis {
  prNumber: number
  /** Estimated expert-hours to complete (Silk 1-inspired) */
  effortHours: number
  /** Which PostHog use cases this PR advances */
  useCases: PostHogUseCase[]
  /** Primary product area */
  productArea: PostHogProductArea
  /** Impact type classification */
  impactType: ImpactType
  /** Strategic alignment score 0-10 */
  strategicScore: number
  /** Why this PR is strategically important (one sentence) */
  strategicReason: string
  /** Quality signals from PR body/description */
  qualitySignals: {
    hasProblemStatement: boolean
    hasTestingPlan: boolean
    hasTradeoffDiscussion: boolean
    hasChangelog: boolean
  }
  /** Quality score 0-10 */
  qualityScore: number
  /** AI confidence in this analysis 0-1 */
  confidence: number
}

// ============================================================
// 7-Dimension Engineer Scores
// ============================================================

export interface DimensionScores {
  /** D1: LLM-estimated effort output (total expert-hours shipped) */
  effort: number
  /** D2: Strategic alignment to PostHog's north star & use cases */
  strategic: number
  /** D3: Impact type mix (features > fixes > chores) */
  impactMix: number
  /** D4: PR quality signals (problem framing, testing, tradeoffs) */
  quality: number
  /** D5: Collaboration — review depth, turnaround, knowledge sharing */
  collaboration: number
  /** D6: Velocity — cycle time, merge frequency, consistency */
  velocity: number
  /** D7: Scope & ownership — breadth, cross-cutting influence */
  scope: number
}

export interface EngineerImpact {
  login: string
  /** Composite impact score 0-100 */
  impactScore: number
  /** 7 dimension scores, each 0-100 (percentile-normalized) */
  dimensions: DimensionScores
  /** Raw values before percentile normalization — for context */
  rawValues: DimensionScores
  /** Supporting metrics */
  metrics: {
    prsAuthored: number
    prsReviewed: number
    totalEffortHours: number
    totalAdditions: number
    totalDeletions: number
    avgFilesPerPR: number
    uniqueDirectories: number
    /** Impact type breakdown */
    impactTypes: Record<ImpactType, number>
    /** Top product areas by PR count */
    productAreas: { area: PostHogProductArea; count: number }[]
    /** Use cases advanced */
    useCasesAdvanced: PostHogUseCase[]
    /** Review stats */
    reviewsGiven: number
    reviewsWithSubstance: number
    avgReviewTurnaround: number | null
    /** Velocity stats */
    avgCycleTime: number | null
    mergeFrequency: number
    /** AI attribution */
    aiAssistedPRs: number
    aiPercentage: number
  }
  /** Human-readable explanation — one sentence per top dimension */
  explanation: string
  /** Top 3 PRs by strategic value (for drill-down) */
  topPRs: { number: number; title: string; strategicScore: number; effortHours: number }[]
}

/** Dataset summary */
export interface DatasetSummary {
  repo: string
  dateRange: { start: string; end: string }
  totalPRs: number
  totalEngineers: number
  totalReviews: number
  totalCommits: number
  totalEffortHours: number
  medianCycleTime: number | null
  avgPRSize: number
  /** Aggregate strategic alignment */
  avgStrategicScore: number
  /** Impact type distribution across all PRs */
  impactTypeDistribution: Record<ImpactType, number>
  /** Top product areas by activity */
  topProductAreas: { area: PostHogProductArea; count: number }[]
}

export interface ScoreWeights {
  effort: number
  strategic: number
  impactMix: number
  quality: number
  collaboration: number
  velocity: number
  scope: number
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  effort: 0.15,
  strategic: 0.20,
  impactMix: 0.10,
  quality: 0.10,
  collaboration: 0.15,
  velocity: 0.15,
  scope: 0.15,
}

export interface ScoredDataset {
  summary: DatasetSummary
  engineers: EngineerImpact[]
  topFive: EngineerImpact[]
  weights: ScoreWeights
}
