// ============================================================
// Engineering Impact Scoring System — Type Contracts
// ============================================================

/** Raw PR data from GitHub API */
export interface GitHubPR {
  number: number
  title: string
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

/** Computed scores for a single engineer */
export interface EngineerImpact {
  login: string
  /** Composite impact score 0-100 */
  impactScore: number
  /** Individual pillar scores 0-100 */
  pillars: {
    scope: number
    depth: number
    leverage: number
    durability: number
  }
  /** Supporting metrics */
  metrics: {
    prsAuthored: number
    prsReviewed: number
    totalAdditions: number
    totalDeletions: number
    avgFilesPerPR: number
    avgDirectoriesPerPR: number
    uniqueDirectories: number
    reviewsGiven: number
    reviewsWithSubstance: number
    avgTimeToReview: number | null
    avgCycleTime: number | null
    churnRate: number
    aiAssistedPRs: number
    aiPercentage: number
  }
  /** Human-readable explanation of why this engineer is impactful */
  explanation: string
}

/** Dataset summary */
export interface DatasetSummary {
  repo: string
  dateRange: { start: string; end: string }
  totalPRs: number
  totalEngineers: number
  totalReviews: number
  totalCommits: number
  medianCycleTime: number | null
  avgPRSize: number
}

/** Full scored dataset */
export interface ScoredDataset {
  summary: DatasetSummary
  engineers: EngineerImpact[]
  topFive: EngineerImpact[]
  /** Weights used for composite score */
  weights: ScoreWeights
}

export interface ScoreWeights {
  scope: number
  depth: number
  leverage: number
  durability: number
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  scope: 0.25,
  depth: 0.30,
  leverage: 0.25,
  durability: 0.20,
}
