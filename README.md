# Engineering Impact Dashboard

An interactive dashboard that scores and visualizes the impact of software engineers on PostHog's codebase over the last 90 days.

## Live Demo

[View Dashboard](https://wwtakehome.vercel.app) *(deployed after data collection)*

## Defining "Impact"

Impact ≠ output volume. An engineer who ships 100 trivial PRs is less impactful than one who ships 10 cross-cutting architectural changes that enable the entire team.

**Impact = f(Scope, Depth, Leverage, Durability)**

| Pillar | What It Measures | Why It Matters |
|--------|-----------------|----------------|
| **Scope** | Breadth of system change — unique directories, cross-cutting PRs | Architectural influence signals senior-level impact |
| **Depth** | Technical complexity — code ratio, refactoring signals, test co-changes | Captures difficulty without rewarding verbosity |
| **Leverage** | Team multiplier — substantive reviews, unblocking others | The best engineers amplify their entire team |
| **Durability** | Work that endures — inverse churn within 21 days | Truly impactful work solves problems correctly the first time |

### Why These Four?

- **Not LOC or commit count** — gameable, rewards verbosity (Goodhart's Law)
- **Not just DORA** — DORA measures delivery speed, not substance
- **Includes team effects** — Leverage captures the multiplier effect of reviews/mentoring
- **Includes temporal signal** — Durability penalizes churn, rewarding correctness

### Scoring Algorithm

1. Each pillar produces a raw score from GitHub signals
2. Raw scores are **percentile-normalized** across all engineers (0-100 scale)
3. Composite score = weighted sum of four pillars (weights adjustable in UI)
4. Default weights: Scope 25%, Depth 30%, Leverage 25%, Durability 20%

### AI Attribution

AI-assisted PRs detected via `Co-Authored-By` commit trailers matching known AI tool patterns (GitHub Copilot, Cursor, Claude, Devin).

## Technical Approach

- **Data**: GitHub GraphQL API — PRs, commits, reviews, file changes (last 90 days)
- **Scoring**: Pure TypeScript functions, no external dependencies
- **Dashboard**: React + Vite + Tailwind + Recharts
- **Framework grounding**: DORA (Google), SPACE (Microsoft), DevEx (ACM Queue 2023)

## Running Locally

```bash
pnpm install

# Fetch fresh data (requires GITHUB_TOKEN)
GITHUB_TOKEN=ghp_... pnpm run fetch-data

# Compute scores
pnpm run compute-scores

# Start dashboard
pnpm dev
```

## Project Structure

```
scripts/
  fetch-github-data.ts    — GitHub API → JSON fixtures
  compute-scores.ts       — Score computation + CLI output
src/
  types.ts                — All type contracts
  scoring.ts              — Impact scoring engine (4 pillars)
  data/                   — Pre-fetched JSON data
  components/             — React dashboard components
  App.tsx                 — Main dashboard layout
```
