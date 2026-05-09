import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { DatasetSummary } from '../types'

interface Props {
  summary: DatasetSummary
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

function dur(minutes: number | null): string {
  if (minutes === null) return '—'
  const h = minutes / 60
  return h < 24 ? h.toFixed(1) + 'h' : (h / 24).toFixed(1) + 'd'
}

export function SummaryCards({ summary }: Props) {
  const cards = [
    {
      title: 'Merged PRs',
      value: fmt(summary.totalPRs),
      desc: `${summary.totalEngineers} engineers`,
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>,
    },
    {
      title: 'Expert-Hours',
      value: fmt(summary.totalEffortHours),
      desc: 'LLM-estimated effort',
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      title: 'Median Cycle Time',
      value: dur(summary.medianCycleTime),
      desc: 'open → merge (DORA)',
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    },
    {
      title: 'Strategic Score',
      value: summary.avgStrategicScore.toFixed(1) + '/10',
      desc: 'north star alignment',
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader>
            <CardTitle>{c.title}</CardTitle>
            {c.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{c.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
