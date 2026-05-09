import * as React from 'react'
import { cn } from '../../lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-row items-center justify-between space-y-0', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm font-medium text-muted-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent, CardDescription }
