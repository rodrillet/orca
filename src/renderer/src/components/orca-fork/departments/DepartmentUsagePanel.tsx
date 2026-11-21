// orca-fork: the department's token use over 7 or 30 days, in total and per bot.
import React, { useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { Bot } from '../../../../../shared/bot-types'
import {
  formatTokenCount,
  useDepartmentUsage,
  type DepartmentUsageRange
} from './use-department-usage'

function Tile({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function DepartmentUsagePanel({ bots }: { bots: readonly Bot[] }): React.JSX.Element {
  const t = useTranslate()
  const [range, setRange] = useState<DepartmentUsageRange>('7d')
  const usage = useDepartmentUsage(bots, range)
  const dash = usage.state === 'ready' ? null : '–'
  const ranges: { id: DepartmentUsageRange; label: string }[] = [
    { id: '7d', label: t('orcaFork.departments.range7d', '7 days') },
    { id: '30d', label: t('orcaFork.departments.range30d', '30 days') }
  ]
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">
          {t('orcaFork.departments.usage', 'Token use')}
        </h2>
        {ranges.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={range === entry.id}
            onClick={() => setRange(entry.id)}
            className={cn(
              'rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
              range === entry.id && 'bg-accent text-foreground'
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile
          label={t('orcaFork.departments.usageInput', 'Input tokens')}
          value={dash ?? formatTokenCount(usage.total.inputTokens)}
        />
        <Tile
          label={t('orcaFork.departments.usageOutput', 'Output tokens')}
          value={dash ?? formatTokenCount(usage.total.outputTokens)}
        />
        <Tile
          label={t('orcaFork.departments.usageCache', 'Cache reads')}
          value={dash ?? formatTokenCount(usage.total.cacheReadTokens)}
        />
        <Tile
          label={t('orcaFork.departments.usageCost', 'Estimated cost')}
          value={
            dash ??
            (usage.total.estimatedCostUsd === null
              ? '–'
              : `US$ ${usage.total.estimatedCostUsd.toFixed(2)}`)
          }
        />
      </div>
      {usage.state === 'ready' ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {bots.map((bot) => {
            const entry = usage.byBot.get(`${bot.hostId}/${bot.id}`)
            return (
              <span key={`${bot.hostId}/${bot.id}`} className="tabular-nums">
                {bot.name}:{' '}
                {formatTokenCount((entry?.inputTokens ?? 0) + (entry?.outputTokens ?? 0))}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {usage.state === 'loading'
            ? t('orcaFork.departments.usageLoading', 'Reading usage on each machine…')
            : t(
                'orcaFork.departments.usageUnavailable',
                'Usage analytics are off or unavailable on these machines (Settings › Usage).'
              )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'orcaFork.departments.usageHint',
          "The bots' own chats; work their workers do in a project counts under that project."
        )}
      </p>
    </section>
  )
}
