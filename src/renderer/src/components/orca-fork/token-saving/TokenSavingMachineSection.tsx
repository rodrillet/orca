// orca-fork: the Machines panel's token saving for one machine: the defaults, this machine's
// workspaces, its Caveman proxy, and what the proxy recorded per bot and per department.
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { resolveTokenSaving } from '../../../../../shared/orca-fork/token-saving/token-saving'
import type {
  TokenSavingAgentStats,
  TokenSavingProxyState,
  TokenSavingStatus,
  TokenSavingTotals
} from '../../../../../shared/orca-fork/token-saving/token-saving-rpc'
import { getRuntimeTargetHostId } from '@/runtime/rpc/targets/runtime-client-target'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { useBotOrganization } from '../organization/bot-organization-store'
import { formatTokenCount, TokenSavingChoiceToggle } from './TokenSavingChoiceToggle'
import { runTokenSavingProxy, useTokenSavingHost } from './token-saving-host'
import { tokenSavingEdits, useTokenSavingSettings } from './token-saving-store'

function Title({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-muted/30 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{label}</span>
      {children}
    </div>
  )
}

function ProxyStateDot({ state }: { state: TokenSavingProxyState }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        state === 'running' && 'bg-status-success',
        state === 'unhealthy' && 'bg-status-warning',
        (state === 'stopped' || state === 'not_installed') && 'bg-muted-foreground/40'
      )}
    />
  )
}

function useProxyStateLabel(): (state: TokenSavingProxyState) => string {
  const t = useTranslate()
  return (state) => {
    switch (state) {
      case 'running':
        return t('orcaFork.tokenSaving.proxy.running', 'Proxy running')
      case 'stopped':
        return t('orcaFork.tokenSaving.proxy.stopped', 'Proxy stopped')
      case 'unhealthy':
        return t('orcaFork.tokenSaving.proxy.unhealthy', 'Proxy not answering properly')
      case 'not_installed':
        return t('orcaFork.tokenSaving.proxy.notInstalled', 'Caveman not installed')
    }
  }
}

function UsageLine({ totals }: { totals: TokenSavingTotals }): React.JSX.Element {
  const t = useTranslate()
  return (
    <span className="tabular-nums text-[11px] text-muted-foreground">
      {t(
        'orcaFork.tokenSaving.usageLine',
        '−{{saved}} · in {{input}} · out {{output}} · cache {{cache}}',
        {
          saved: formatTokenCount(totals.savedTokens),
          input: formatTokenCount(totals.inputTokens),
          output: formatTokenCount(totals.outputTokens),
          cache: formatTokenCount(totals.cacheReadTokens)
        }
      )}
    </span>
  )
}

function sumTotals(rows: readonly TokenSavingTotals[]): TokenSavingTotals {
  return rows.reduce<TokenSavingTotals>(
    (sum, row) => ({
      requests: sum.requests + row.requests,
      inputTokens: sum.inputTokens + row.inputTokens,
      outputTokens: sum.outputTokens + row.outputTokens,
      cacheReadTokens: sum.cacheReadTokens + row.cacheReadTokens,
      cacheWriteTokens: sum.cacheWriteTokens + row.cacheWriteTokens,
      savedTokens: sum.savedTokens + row.savedTokens
    }),
    {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      savedTokens: 0
    }
  )
}

function Savings({
  stats,
  bots,
  hostId
}: {
  stats: NonNullable<TokenSavingStatus['stats']>
  bots: readonly Bot[]
  hostId: string
}): React.JSX.Element {
  const t = useTranslate()
  const organization = useBotOrganization()
  const botOf = (row: TokenSavingAgentStats): Bot | null =>
    row.botId ? (bots.find((b) => b.id === row.botId && b.hostId === hostId) ?? null) : null
  const departments = new Map<string, { name: string; rows: TokenSavingAgentStats[] }>()
  for (const row of stats.agents) {
    const bot = botOf(row)
    const placement = bot ? organization.placements[botSidebarEntryKey(bot)] : undefined
    const department = placement
      ? organization.departments.find((d) => d.id === placement.departmentId)
      : undefined
    if (department) {
      const entry = departments.get(department.id) ?? { name: department.name, rows: [] }
      entry.rows.push(row)
      departments.set(department.id, entry)
    }
  }
  return (
    <>
      <Title>
        {t('orcaFork.tokenSaving.savingsTitle', 'Last {{days}} days through the proxy', {
          days: stats.days
        })}
      </Title>
      <div className="flex flex-col gap-0.5 px-3 py-1.5">
        <span className="text-xs text-foreground">
          {t(
            'orcaFork.tokenSaving.savedTotal',
            '{{saved}} context tokens removed in {{requests}} model calls',
            {
              saved: formatTokenCount(stats.total.savedTokens),
              requests: stats.total.requests
            }
          )}
        </span>
        <UsageLine totals={stats.total} />
      </div>
      {stats.agents.length === 0 ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          {t('orcaFork.tokenSaving.noTraffic', 'No agent has gone through the proxy yet.')}
        </p>
      ) : (
        <ul>
          {stats.agents.map((row) => {
            const bot = botOf(row)
            return (
              <li key={row.slug} className="flex items-center gap-2 px-3 py-1">
                {bot ? <BotAvatar bot={bot} className="size-5 shrink-0" /> : null}
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {bot?.name ??
                    (row.slug === 'orca'
                      ? t('orcaFork.tokenSaving.otherAgents', 'Workers and other chats')
                      : row.slug)}
                </span>
                <UsageLine totals={row} />
              </li>
            )
          })}
        </ul>
      )}
      {departments.size > 0 ? (
        <>
          <Title>{t('orcaFork.tokenSaving.byDepartment', 'By department')}</Title>
          <ul>
            {[...departments.entries()].map(([id, entry]) => (
              <li key={id} className="flex items-center gap-2 px-3 py-1">
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {entry.name}
                </span>
                <UsageLine totals={sumTotals(entry.rows)} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  )
}

export function TokenSavingMachineSection({
  target,
  bots,
  open
}: {
  target: RuntimeClientTarget
  bots: readonly Bot[]
  open: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const settings = useTokenSavingSettings()
  const workspaces = useForkWorkspaces()
  const { result, refresh } = useTokenSavingHost(target, open)
  const proxyLabel = useProxyStateLabel()
  const [busy, setBusy] = useState(false)
  const hostId = getRuntimeTargetHostId(target)
  const global = resolveTokenSaving({ global: settings.global })
  const workspacesHere = workspaces.workspaces.filter((ws) => ws.hostId === hostId)

  const proxyAction = async (action: 'start' | 'stop' | 'restart'): Promise<void> => {
    setBusy(true)
    const outcome = await runTokenSavingProxy(target, action)
    setBusy(false)
    refresh()
    if (!outcome?.ok) {
      toast.error(
        t(
          'orcaFork.tokenSaving.proxy.failed',
          'The Caveman proxy did not do that. See ~/.caveman/proxy.log on that machine.'
        )
      )
    }
  }

  return (
    <div className="flex flex-col border-t border-border/50">
      <Title>{t('orcaFork.tokenSaving.title', 'Token saving (Caveman)')}</Title>
      <Row label={t('orcaFork.tokenSaving.globalLabel', 'Every agent, by default')}>
        <TokenSavingChoiceToggle
          choice={global.enabled}
          allowInherit={false}
          onChange={(choice) => tokenSavingEdits.global(choice)}
          label={t('orcaFork.tokenSaving.globalLabel', 'Every agent, by default')}
        />
      </Row>
      {workspacesHere.map((ws) => (
        <Row
          key={ws.id}
          label={t('orcaFork.tokenSaving.workspaceLabel', 'Workspace {{name}}', { name: ws.name })}
        >
          <TokenSavingChoiceToggle
            choice={settings.workspaces[ws.id]}
            inherited={global}
            onChange={(choice) => tokenSavingEdits.workspace(ws.id, choice)}
            label={ws.name}
          />
        </Row>
      ))}
      <Row label={t('orcaFork.tokenSaving.modeLabel', 'Proxy mode')}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={settings.proxyMode}
          onValueChange={(next) => {
            if (next === 'compress' || next === 'record') {
              tokenSavingEdits.proxyMode(next)
            }
          }}
        >
          <ToggleGroupItem value="compress">
            {t('orcaFork.tokenSaving.modeCompress', 'Compress')}
          </ToggleGroupItem>
          <ToggleGroupItem value="record">
            {t('orcaFork.tokenSaving.modeRecord', 'Measure only')}
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>
      {result === null ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          {t('orcaFork.resourceMonitor.loading', 'Loading…')}
        </p>
      ) : result.status === 'unsupported' ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
          {t(
            'orcaFork.tokenSaving.stockServer',
            "This server runs the stock orca-server: token saving there needs the fork's server."
          )}
        </p>
      ) : result.status === 'unreachable' ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          {t('orcaFork.resourceMonitor.unreachable', 'This machine is not answering right now.')}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <ProxyStateDot state={result.data.proxy.state} />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">
              {proxyLabel(result.data.proxy.state)}
              {result.data.proxy.state === 'running' ? (
                <span className="text-muted-foreground"> · {result.data.proxy.url}</span>
              ) : null}
            </span>
            {result.data.proxy.state === 'not_installed' ? null : result.data.proxy.state ===
              'running' ? (
              result.data.proxy.managed ? (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => void proxyAction('restart')}
                  >
                    {t('orcaFork.tokenSaving.proxy.restart', 'Restart')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => void proxyAction('stop')}
                  >
                    {t('orcaFork.tokenSaving.proxy.stop', 'Stop')}
                  </Button>
                </>
              ) : null
            ) : (
              <Button
                variant="outline"
                size="xs"
                disabled={busy}
                onClick={() => void proxyAction('start')}
              >
                {t('orcaFork.tokenSaving.proxy.start', 'Start')}
              </Button>
            )}
          </div>
          {result.data.installed ? null : (
            <p className="px-3 pb-1.5 text-[11px] text-muted-foreground">
              {t(
                'orcaFork.tokenSaving.installHint',
                "Agents here still answer tersely. To also compress context and record savings, install Caveman's runtime in {{dir}}.",
                { dir: result.data.binDirectory }
              )}
            </p>
          )}
          {result.data.stats ? (
            <Savings stats={result.data.stats} bots={bots} hostId={hostId} />
          ) : null}
        </>
      )}
    </div>
  )
}
