export function Methodology() {
  return (
    <div className="rounded-xl bg-surface-1 border border-white/5 p-8 space-y-6">
      <h2 className="text-xl font-semibold">Methodology</h2>

      <section>
        <h3 className="text-base font-semibold mb-2 text-accent-light">
          Defining "Impact"
        </h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Impact is not output volume. An engineer who ships 100 trivial PRs is less impactful
          than one who ships 10 cross-cutting architectural changes that enable the entire team.
          We define impact as <strong className="text-white/80">the measurable effect of an
          engineer's work on the codebase, team, and product durability</strong>, decomposed into
          four pillars:
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PillarCard
          name="Scope"
          color="text-blue-400"
          description="Breadth of system change. How many distinct areas of the codebase does the engineer touch? Cross-cutting changes that span multiple subsystems indicate architectural influence."
          signals={[
            'Unique directories modified across all PRs',
            'Average files changed per PR',
            'Cross-directory changes (touching frontend + backend, etc.)',
          ]}
        />
        <PillarCard
          name="Depth"
          color="text-emerald-400"
          description="Technical complexity of changes. Not lines-of-code (gameable), but cognitive complexity — refactors, balanced add/delete ratios, test coverage, and review iteration."
          signals={[
            'Code file ratio (vs config/docs)',
            'Add/delete balance (refactoring signal)',
            'Test co-changes with production code',
            'Review cycles (more iteration = harder problems)',
            'Log-scaled change size (diminishing returns)',
          ]}
        />
        <PillarCard
          name="Leverage"
          color="text-amber-400"
          description="Team multiplier effect. Engineers who review others' code, provide substantive feedback, and unblock teammates amplify the entire team's output."
          signals={[
            'Unique PRs reviewed',
            'Substantive reviews (>20 chars, not just \"LGTM\")',
            'Approval count (unblocking others)',
            'Review-to-author ratio (high = team multiplier)',
          ]}
        />
        <PillarCard
          name="Durability"
          color="text-purple-400"
          description="Work that endures. Code that gets reverted or rewritten within 21 days wasn't truly impactful. Durable code solves the problem correctly the first time."
          signals={[
            'Churn rate (files modified by others within 21 days)',
            'Merge success rate (merged vs closed)',
            'Inverse of rework frequency',
          ]}
        />
      </div>

      <section>
        <h3 className="text-base font-semibold mb-2 text-accent-light">
          Scoring Algorithm
        </h3>
        <div className="text-sm text-white/60 leading-relaxed space-y-3">
          <p>
            Each pillar produces a raw score from GitHub signals. Raw scores are then
            <strong className="text-white/80"> percentile-normalized</strong> across all
            engineers in the dataset (0-100 scale), so a score of 75 means "better than 75%
            of engineers in this repo."
          </p>
          <p>
            The composite Impact Score is a weighted sum:
          </p>
          <code className="block bg-surface-0 rounded-lg p-3 text-accent-light font-mono text-xs">
            Impact = 0.25 × Scope + 0.30 × Depth + 0.25 × Leverage + 0.20 × Durability
          </code>
          <p>
            Weights are adjustable via the sliders — different organizations may value
            different pillars. A platform team might weight Leverage higher; a greenfield
            team might weight Depth.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2 text-accent-light">
          AI Attribution
        </h3>
        <p className="text-sm text-white/60 leading-relaxed">
          AI-assisted PRs are detected via <code className="text-accent-light/80">Co-Authored-By</code>
          trailers in commit messages, matching known AI tool email patterns (GitHub Copilot,
          Cursor, Claude, Devin). This is a high-confidence signal — present only when the tool
          explicitly adds the trailer.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2 text-accent-light">
          Limitations & Anti-Patterns
        </h3>
        <p className="text-sm text-white/60 leading-relaxed">
          This system deliberately avoids gameable metrics (LOC, commit count, PR count).
          However, no metric system is perfect. Goodhart's Law applies: "When a measure
          becomes a target, it ceases to be a good measure." These scores should inform
          conversations, not replace judgment. Engineers working on hard-to-measure work
          (incident response, mentoring, architecture design) may be underrepresented by
          any Git-based metric.
        </p>
      </section>

      <section className="text-xs text-white/30 pt-4 border-t border-white/5">
        <p>
          Data source: GitHub GraphQL API. Analysis period: last 90 days of merged PRs.
          Framework draws on DORA (Google), SPACE (Microsoft Research), and DevEx (ACM Queue 2023)
          research. Percentile normalization ensures fair comparison across varying contribution levels.
        </p>
      </section>
    </div>
  )
}

function PillarCard({
  name,
  color,
  description,
  signals,
}: {
  name: string
  color: string
  description: string
  signals: string[]
}) {
  return (
    <div className="rounded-lg bg-surface-0 border border-white/5 p-4">
      <h4 className={`font-semibold mb-2 ${color}`}>{name}</h4>
      <p className="text-xs text-white/50 mb-3 leading-relaxed">{description}</p>
      <ul className="space-y-1">
        {signals.map(s => (
          <li key={s} className="text-xs text-white/40 flex items-start gap-2">
            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${color.replace('text-', 'bg-')}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
