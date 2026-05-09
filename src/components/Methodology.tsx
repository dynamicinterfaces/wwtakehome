import { useState } from 'react'
import type { DimensionScores } from '../types'

interface Props {
  focusedDimension?: keyof DimensionScores | null
}

// Map dimension keys to display config
const DIM_CARDS: {
  key: keyof DimensionScores
  name: string
  color: string
  cssVar: string
  tag: string
  description: string
  signals: string[]
}[] = [
  {
    key: 'effort', name: 'Effort Output', color: 'text-[hsl(var(--dim-effort))]', cssVar: '--dim-effort', tag: 'LLM',
    description: 'Expert-hours shipped — how long would this take a senior PostHog engineer? Inspired by Silk 1 but transparent.',
    signals: ['LLM reads PR title, body, files, commit messages', 'Estimates complexity, not just LOC', 'Log-scaled fallback when LLM unavailable'],
  },
  {
    key: 'strategic', name: 'Strategic Alignment', color: 'text-[hsl(var(--dim-strategic))]', cssVar: '--dim-strategic', tag: 'LLM + PostHog',
    description: "Does this PR advance PostHog's north star? Scored against their 8 use cases, 17 product areas, and current priorities.",
    signals: ['Maps PRs to use cases (analytics, replay, flags, AI...)', 'Weights hot areas higher (MCP, Web Analytics, Experiments)', 'Effort-weighted: big strategic PRs count more'],
  },
  {
    key: 'impactMix', name: 'Impact Type Mix', color: 'text-[hsl(var(--dim-impact))]', cssVar: '--dim-impact', tag: 'LLM + Commits',
    description: 'Features create new value, fixes ensure reliability. A healthy mix weighted toward features signals forward progress.',
    signals: ['Conventional commit prefix classification', 'LLM override for ambiguous PRs', 'Weighted: feature > fix > refactor > chore'],
  },
  {
    key: 'quality', name: 'PR Quality', color: 'text-[hsl(var(--dim-quality))]', cssVar: '--dim-quality', tag: 'LLM + Body',
    description: 'Engineering communication rigor — problem framing, testing plans, tradeoff discussion. Scored from real PR descriptions.',
    signals: ['Problem statement (+2.5)', 'Testing plan (+3.0)', 'Tradeoff discussion (+2.5)', 'Changelog entry (+2.0)'],
  },
  {
    key: 'collaboration', name: 'Collaboration', color: 'text-[hsl(var(--dim-collaboration))]', cssVar: '--dim-collaboration', tag: 'SPACE-C',
    description: 'Team multiplier. Reviews scored on quality (questions, code suggestions, pushback), not just volume. Bots filtered.',
    signals: ['Review quality score (0-4 per review)', 'Questions asked = engagement', 'Code blocks = actionable', 'CHANGES_REQUESTED = courage'],
  },
  {
    key: 'velocity', name: 'Velocity', color: 'text-[hsl(var(--dim-velocity))]', cssVar: '--dim-velocity', tag: 'DORA',
    description: 'Shipping cadence — cycle time, merge frequency, consistency. Three DORA-inspired sub-signals, equally weighted.',
    signals: ['Merge frequency (PRs/week, capped at 20)', 'Cycle time (inverse log)', 'Consistency (low CV = steady shipper)'],
  },
  {
    key: 'scope', name: 'Scope & Ownership', color: 'text-[hsl(var(--dim-scope))]', cssVar: '--dim-scope', tag: 'Git',
    description: 'Breadth of system influence. Cross-cutting changes spanning multiple subsystems signal architectural impact.',
    signals: ['Unique directories touched', 'Cross-cutting PRs (3+ top-level dirs, ×5 bonus)', 'Product area diversity'],
  },
]

export function Methodology({ focusedDimension }: Props) {
  return (
    <div className="p-4 space-y-5">
      <section>
        <h3 className="text-sm font-semibold mb-2 text-primary">Defining "Impact"</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Impact is not output volume. We define it as <strong className="text-foreground">the
          measurable effect of an engineer's work on PostHog's product, team, and strategic
          direction</strong>. We use LLM analysis to understand <em>what</em> was built — not just how fast.
        </p>
      </section>

      {/* Collapsible dimension cards */}
      <section>
        <h3 className="text-sm font-semibold mb-2 text-primary">7 Dimensions</h3>
        <div className="space-y-1">
          {DIM_CARDS.map(dim => (
            <CollapsibleDim
              key={dim.key}
              dim={dim}
              defaultOpen={focusedDimension === dim.key}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 text-primary">Scoring Algorithm</h3>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            Each dimension produces a raw score, then <strong className="text-foreground">percentile-normalized</strong> across
            all 122 engineers (0-100). The composite is a weighted sum:
          </p>
          <code className="block bg-background rounded-md p-2.5 text-primary font-mono text-[10px] leading-relaxed">
            Impact = 0.15×Effort + 0.20×Strategic + 0.10×Impact + 0.10×Quality<br/>
            {'       '}+ 0.15×Collab + 0.15×Velocity + 0.15×Scope
          </code>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 text-primary">The Gap We Fill</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No existing platform maps PRs to a company's documented use cases.
          WorkWeave scores effort (not alignment). Jellyfish needs Jira structure.
          DX measures experience (not direction). We score against PostHog's own
          8 use cases and 17 product areas.
        </p>
      </section>

      <section className="text-[10px] text-muted-foreground pt-3 border-t border-border">
        Data: GitHub GraphQL API, 90 days, 897 merged PRs. LLM: Claude Sonnet 4
        (real PR bodies, not inferred). Frameworks: DORA, SPACE, DevEx, Silk 1.
      </section>
    </div>
  )
}

function CollapsibleDim({ dim, defaultOpen }: {
  dim: typeof DIM_CARDS[number]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(var(${dim.cssVar}))` }} />
          <span className={`text-xs font-medium ${dim.color}`}>{dim.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wider">{dim.tag}</span>
        </div>
        <span className="text-muted-foreground text-[10px]">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground mt-2 mb-2 leading-relaxed">{dim.description}</p>
          <ul className="space-y-0.5">
            {dim.signals.map(s => (
              <li key={s} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: `hsl(var(${dim.cssVar}))` }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
