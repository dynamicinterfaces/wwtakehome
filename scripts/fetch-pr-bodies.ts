/**
 * Fetch PR bodies for existing PR data.
 * Merges body text into posthog-prs.json.
 *
 * Usage: GITHUB_TOKEN=ghp_... npx tsx scripts/fetch-pr-bodies.ts
 */
import { graphql } from '@octokit/graphql'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { GitHubPR } from '../src/types'

const token = process.env.GITHUB_TOKEN
if (!token) { console.error('Set GITHUB_TOKEN'); process.exit(1) }

const gql = graphql.defaults({ headers: { authorization: `token ${token}` } })

const dataDir = join(import.meta.dirname, '..', 'src', 'data')
const prs: GitHubPR[] = JSON.parse(readFileSync(join(dataDir, 'posthog-prs.json'), 'utf-8'))

const BATCH = 50

const QUERY = `
query($owner: String!, $repo: String!, $numbers: [Int!]!) {
  repository(owner: $owner, name: $repo) {
    pullRequests: issueOrPullRequest_list: _: placeholder
  }
}
`

// GitHub GraphQL doesn't let us batch PR lookups by number easily,
// so use individual node lookups batched into one query
function buildBatchQuery(numbers: number[]): string {
  const fragments = numbers.map((n, i) =>
    `pr${i}: pullRequest(number: ${n}) { number body }`
  ).join('\n    ')
  return `query { repository(owner: "PostHog", name: "posthog") { ${fragments} } }`
}

async function fetchBodies() {
  const missing = prs.filter(pr => !pr.body || pr.body === '')
  console.log(`Total PRs: ${prs.length}, missing body: ${missing.length}`)

  if (missing.length === 0) {
    console.log('All PRs already have bodies.')
    return
  }

  const batches = Math.ceil(missing.length / BATCH)

  for (let i = 0; i < batches; i++) {
    const batch = missing.slice(i * BATCH, (i + 1) * BATCH)
    const query = buildBatchQuery(batch.map(pr => pr.number))

    console.log(`Batch ${i + 1}/${batches} (${batch.length} PRs)...`)

    try {
      const result: any = await gql(query)
      const repo = result.repository

      for (let j = 0; j < batch.length; j++) {
        const data = repo[`pr${j}`]
        if (data) {
          const pr = prs.find(p => p.number === data.number)
          if (pr) pr.body = (data.body || '').slice(0, 2000) // cap at 2k chars
        }
      }
    } catch (err: any) {
      console.error(`  Batch failed: ${err.message?.slice(0, 100)}`)
      // Try individual fetches for this batch
      for (const pr of batch) {
        try {
          const result: any = await gql(`query {
            repository(owner: "PostHog", name: "posthog") {
              pullRequest(number: ${pr.number}) { number body }
            }
          }`)
          const found = prs.find(p => p.number === pr.number)
          if (found && result.repository.pullRequest) {
            found.body = (result.repository.pullRequest.body || '').slice(0, 2000)
          }
        } catch { /* skip individual failures */ }
      }
    }

    // Save after each batch
    writeFileSync(join(dataDir, 'posthog-prs.json'), JSON.stringify(prs, null, 2))
  }

  const withBody = prs.filter(pr => pr.body && pr.body.length > 0).length
  console.log(`\nDone. ${withBody}/${prs.length} PRs now have bodies.`)
}

fetchBodies().catch(err => { console.error(err); process.exit(1) })
