interface HeaderProps {
  onMethodologyClick: () => void
  showMethodology: boolean
}

export function Header({ onMethodologyClick, showMethodology }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Engineering Impact Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            PostHog/posthog — Last 90 days — 7-dimension analysis
          </p>
        </div>
        <button
          onClick={onMethodologyClick}
          className="px-4 py-2 text-sm rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground transition-colors"
        >
          {showMethodology ? 'Hide' : 'Show'} Methodology
        </button>
      </div>
    </header>
  )
}
