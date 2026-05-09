export function Methodology() {
  return (
    <div className="p-6 space-y-6">

      <section>
        <h3 className="text-base font-semibold mb-2 text-primary">Defining "Impact"</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Impact is not output volume. We define it as <strong className="text-foreground">the measurable
          effect of an engineer's work on PostHog's product, team, and strategic direction</strong>.
          Unlike pure metric aggregation (DORA, SPACE), we use LLM analysis to understand
          <em> what</em> was built — not just how fast. And unlike any existing tool, we score
          alignment to PostHog's own documented use cases and north star.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DimCard name="Effort Output" color="text-rose-400" tag="LLM"
          description="Expert-hours shipped — how long would this take a senior PostHog engineer? Inspired by WorkWeave's Silk 1 model but transparent."
          signals={['LLM reads PR title, files, commit messages', 'Estimates complexity, not just LOC', 'Log-scaled fallback when LLM unavailable']}
        />
        <DimCard name="Strategic Alignment" color="text-amber-400" tag="LLM + PostHog"
          description="Does this PR advance PostHog's north star? Scored against their 8 documented use cases, 17 product areas, and current strategic priorities."
          signals={['Maps PRs to use cases (analytics, replay, flags, AI...)', 'Weights hot areas higher (MCP, Web Analytics, Experiments)', 'Effort-weighted: big strategic PRs count more']}
        />
        <DimCard name="Impact Type Mix" color="text-emerald-400" tag="LLM + Commits"
          description="Features create new value, fixes ensure reliability. A healthy mix weighted toward features signals forward progress."
          signals={['Conventional commit prefix classification', 'LLM override for ambiguous PRs', 'Weighted: feature > fix > refactor > chore']}
        />
        <DimCard name="PR Quality" color="text-cyan-400" tag="LLM"
          description="Quality of the engineering process — problem framing, testing rigor, tradeoff discussion. Not code style, but engineering communication."
          signals={['Problem statement explains user-visible impact', 'Testing plan is specific (not just &quot;tested locally&quot;)', 'Tradeoffs explicitly discussed', 'Changelog entry present']}
        />
        <DimCard name="Collaboration" color="text-blue-400" tag="SPACE-C"
          description="Team multiplier effect from the SPACE framework's Communication dimension. Engineers who review deeply and respond fast amplify everyone."
          signals={['Unique PRs reviewed', 'Substantive reviews (not just LGTM)', 'Review turnaround speed', 'Approval count (unblocking others)']}
        />
        <DimCard name="Velocity" color="text-violet-400" tag="DORA-lite"
          description="Shipping cadence from DORA metrics — cycle time, merge frequency, and consistency. Fast AND consistent beats fast-but-bursty."
          signals={['Cycle time (open → merge)', 'Merge frequency (PRs/week)', 'Consistency (low variance in shipping cadence)', 'Inverse log-scaled cycle time']}
        />
        <DimCard name="Scope & Ownership" color="text-pink-400" tag="Git"
          description="Breadth of system influence. Cross-cutting changes spanning frontend + backend + infra signal architectural impact."
          signals={['Unique directories touched', 'Cross-cutting PRs (3+ top-level dirs)', 'Average files per PR', 'Breadth across product areas']}
        />
      </div>

      <section>
        <h3 className="text-base font-semibold mb-2 text-primary">Scoring Algorithm</h3>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>
            Each dimension produces a raw score. Raw scores are <strong className="text-foreground">percentile-normalized</strong> across
            all engineers (0-100), so 75 = "better than 75% of engineers." The composite is:
          </p>
          <code className="block bg-background rounded-lg p-3 text-primary font-mono text-xs leading-relaxed">
            Impact = 0.15×Effort + 0.20×Strategic + 0.10×ImpactMix + 0.10×Quality<br/>
            {'       '}+ 0.15×Collaboration + 0.15×Velocity + 0.15×Scope
          </code>
          <p>
            Strategic Alignment gets the highest default weight (20%) because it answers the
            question no other tool does: <em>"Is this engineer driving the product forward?"</em>
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2 text-primary">The Gap We Fill</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No existing platform — WorkWeave, Jellyfish, Swarmia, LinearB, or DX — maps PRs
          to a company's documented use cases or north star. Jellyfish maps to Jira epics
          (requires structure). WorkWeave scores effort (not alignment). DX measures experience
          (not direction). We score PostHog PRs against their own 8 use cases, 17 product teams,
          and 5 company values — something no existing tool does.
        </p>
      </section>

      <section className="text-xs text-muted-foreground pt-4 border-t border-border">
        Data: GitHub GraphQL API, 90 days of merged PRs. LLM: Claude Sonnet 4 for effort/strategic/quality scoring.
        Frameworks: DORA (Google), SPACE (Microsoft), DevEx (ACM 2023), Silk 1 (WorkWeave, for inspiration).
      </section>
    </div>
  )
}

function DimCard({ name, color, tag, description, signals }: {
  name: string; color: string; tag: string; description: string; signals: string[]
}) {
  return (
    <div className="rounded-lg bg-background border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className={`font-semibold text-sm ${color}`}>{name}</h4>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground uppercase tracking-wider">{tag}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{description}</p>
      <ul className="space-y-1">
        {signals.map(s => (
          <li key={s} className="text-[11px] text-muted-foreground flex items-start gap-2">
            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${color.replace('text-', 'bg-')}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
