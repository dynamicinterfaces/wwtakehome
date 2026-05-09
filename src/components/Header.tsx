interface HeaderProps {
  onMethodologyClick: () => void
  showMethodology: boolean
}

export function Header({ onMethodologyClick, showMethodology }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-surface-1/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Engineering Impact Dashboard
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            PostHog/posthog — Last 90 days
          </p>
        </div>
        <button
          onClick={onMethodologyClick}
          className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          {showMethodology ? 'Hide' : 'Show'} Methodology
        </button>
      </div>
    </header>
  )
}
