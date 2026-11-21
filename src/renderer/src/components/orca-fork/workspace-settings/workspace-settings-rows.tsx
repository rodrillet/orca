// orca-fork: the rows, titles and empty lines every workspace-settings tab is built from.
import React from 'react'
import { cn } from '@/lib/class-names'

export function SettingsSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>
}

export function SettingsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function SettingsRow({
  leading,
  title,
  detail,
  children,
  className
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  detail?: React.ReactNode
  /** Actions on the row's right. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50',
        className
      )}
    >
      {leading ? <span className="relative flex shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        {detail ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
      {children ? <span className="flex shrink-0 items-center gap-1">{children}</span> : null}
    </div>
  )
}
