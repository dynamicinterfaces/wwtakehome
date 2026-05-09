/**
 * Fetch PostHog GitHub data for the last 90 days.
 * Usage: GITHUB_TOKEN=ghp_... npx tsx scripts/fetch-github-data.ts
 */
import { graphql } from '@octokit/graphql'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { GitHubPR, GitHubReview, GitHubCommit } from '../src/types'

const OWNER = 'PostHog'
const REPO = 'posthog'
const DAYS = 90
const SINCE = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()

const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('Set GITHUB_TOKEN env var')
  process.exit(1)
}

const gql = graphql.defaults({ headers: { authorization: `token ${token}` } })

const PR_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: 25
      after: $cursor
      states: [MERGED, CLOSED]
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        author { login ... on Bot { login } }
        createdAt
        mergedAt
        closedAt
        isDraft
        additions
        deletions
        changedFiles
        reviewDecision
        labels(first: 10) { nodes { name } }
        files(first: 100) { nodes { path additions deletions } }
        reviews(first: 50) {
          nodes {
            author { login }
            state
            submittedAt
            body
          }
        }
        commits(first: 100) {
          nodes {
            commit {
              message
              author { name email user { login } }
              committer { name email user { login } }
              additions
              deletions
            }
          }
        }
        closingIssuesReferences(first: 5) {
          nodes { number }
        }
      }
    }
  }
}
`

interface RawPR {
  number: number
  title: string
  author: { login: string } | null
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  isDraft: boolean
  additions: number
  deletions: number
  changedFiles: number
  reviewDecision: string | null
  labels: { nodes: { name: string }[] }
  files: { nodes: { path: string; additions: number; deletions: number }[] }
  reviews: { nodes: { author: { login: string } | null; state: string; submittedAt: string; body: string }[] }
  commits: { nodes: { commit: { message: string; author: { name: string; email: string; user: { login: string } | null }; committer: { name: string; email: string; user: { login: string } | null }; additions: number; deletions: number } }[] }
  closingIssuesReferences: { nodes: { number: number }[] }
}

const AI_EMAILS: Record<string, string> = {
  'copilot-ai@github.com': 'GitHub Copilot',
  'noreply@cursor.com': 'Cursor',
  'noreply@anthropic.com': 'Claude',
  'devin-ai@cognition.ai': 'Devin',
  '49699333+dependabot[bot]@users.noreply.github.com': 'Dependabot',
}

function extractAiCoAuthors(message: string): string[] {
  const trailers: string[] = []
  const coAuthorRegex = /Co-[Aa]uthored-[Bb]y:\s*(.+?)\s*<(.+?)>/g
  let match
  while ((match = coAuthorRegex.exec(message)) !== null) {
    const email = match[2].toLowerCase()
    const name = match[1].trim()
    if (AI_EMAILS[email]) {
      trailers.push(AI_EMAILS[email])
    } else if (/\b(bot|ai|copilot|cursor|claude|devin|codeium|windsurf)\b/i.test(name)) {
      trailers.push(name)
    }
  }
  return trailers
}

function extractDirectories(files: string[]): string[] {
  const dirs = new Set<string>()
  for (const f of files) {
    const parts = f.split('/')
    if (parts.length > 1) {
      // top-level directory
      dirs.add(parts[0])
      // second-level for more granularity
      if (parts.length > 2) dirs.add(parts.slice(0, 2).join('/'))
    }
  }
  return [...dirs]
}

function transformPR(raw: RawPR): GitHubPR {
  const filePaths = raw.files.nodes.map(f => f.path)
  const directories = extractDirectories(filePaths)

  const reviews: GitHubReview[] = raw.reviews.nodes
    .filter(r => r.author)
    .map(r => ({
      author: r.author!.login,
      state: r.state as GitHubReview['state'],
      submittedAt: r.submittedAt,
      body: r.body || '',
    }))

  const commits: GitHubCommit[] = raw.commits.nodes.map(c => ({
    sha: '',
    message: c.commit.message,
    author: c.commit.author.user?.login || c.commit.author.name,
    committer: c.commit.committer.user?.login || c.commit.committer.name,
    additions: c.commit.additions,
    deletions: c.commit.deletions,
    aiCoAuthors: extractAiCoAuthors(c.commit.message),
  }))

  // Time to first review
  const prCreated = new Date(raw.createdAt).getTime()
  const firstReview = reviews.length > 0
    ? Math.min(...reviews.map(r => new Date(r.submittedAt).getTime()))
    : null
  const timeToFirstReview = firstReview
    ? Math.round((firstReview - prCreated) / 60000)
    : null

  // Time to merge
  const timeToMerge = raw.mergedAt
    ? Math.round((new Date(raw.mergedAt).getTime() - prCreated) / 60000)
    : null

  return {
    number: raw.number,
    title: raw.title,
    author: raw.author?.login || 'unknown',
    authorType: 'User', // simplified
    createdAt: raw.createdAt,
    mergedAt: raw.mergedAt,
    closedAt: raw.closedAt,
    isDraft: raw.isDraft,
    additions: raw.additions,
    deletions: raw.deletions,
    changedFiles: raw.changedFiles,
    labels: raw.labels.nodes.map(l => l.name),
    directories,
    files: filePaths,
    reviews,
    commits,
    linkedIssues: raw.closingIssuesReferences.nodes.map(i => i.number),
    reviewDecision: raw.reviewDecision,
    timeToFirstReview,
    timeToMerge,
  }
}

async function fetchWithRetry(query: string, vars: Record<string, any>, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await gql(query, vars)
    } catch (err: any) {
      if (i < retries - 1) {
        const wait = (i + 1) * 5000
        console.log(`  Retry ${i + 1}/${retries} after ${wait / 1000}s...`)
        await new Promise(r => setTimeout(r, wait))
      } else {
        throw err
      }
    }
  }
}

async function fetchAllPRs(): Promise<GitHubPR[]> {
  const allPRs: GitHubPR[] = []
  let cursor: string | null = null
  let page = 0

  while (true) {
    page++
    console.log(`Fetching page ${page}... (cursor: ${cursor ? cursor.slice(0, 10) + '...' : 'start'})`)

    let result: any
    try {
      result = await fetchWithRetry(PR_QUERY, {
        owner: OWNER,
        repo: REPO,
        cursor,
      })
    } catch (err: any) {
      console.log(`  Failed after retries: ${err.message?.slice(0, 100)}. Saving what we have.`)
      break
    }

    const prs: RawPR[] = result.repository.pullRequests.nodes
    const pageInfo = result.repository.pullRequests.pageInfo

    // Filter by date
    for (const pr of prs) {
      if (new Date(pr.createdAt) < new Date(SINCE)) {
        console.log(`Reached PRs before ${SINCE}, stopping.`)
        return allPRs
      }
      allPRs.push(transformPR(pr))
    }

    console.log(`  Got ${prs.length} PRs, total: ${allPRs.length}`)

    if (!pageInfo.hasNextPage) break
    cursor = pageInfo.endCursor
  }

  return allPRs
}

async function main() {
  console.log(`\nFetching PostHog PRs from last ${DAYS} days (since ${SINCE})...\n`)

  const prs = await fetchAllPRs()
  const mergedPRs = prs.filter(pr => pr.mergedAt !== null)

  console.log(`\nTotal PRs fetched: ${prs.length}`)
  console.log(`Merged PRs: ${mergedPRs.length}`)

  // Unique authors
  const authors = new Set(mergedPRs.map(pr => pr.author))
  console.log(`Unique authors: ${authors.size}`)

  // AI attribution stats
  const aiPRs = mergedPRs.filter(pr =>
    pr.commits.some(c => c.aiCoAuthors.length > 0)
  )
  console.log(`PRs with AI co-authors: ${aiPRs.length}`)

  // Save data
  const outDir = join(import.meta.dirname, '..', 'src', 'data')
  mkdirSync(outDir, { recursive: true })

  writeFileSync(
    join(outDir, 'posthog-prs.json'),
    JSON.stringify(mergedPRs, null, 2)
  )
  console.log(`\nSaved ${mergedPRs.length} merged PRs to src/data/posthog-prs.json`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
