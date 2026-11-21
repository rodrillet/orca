// orca-fork: tokens the department's bots spent in their own chats, read from each machine's usage
// analytics (`usage.call`, which every orca-server has): its per-project breakdown, matched to the bots'
// home folders. Work their workers do in project worktrees is counted under those projects instead.
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { botHostTarget } from '@/lib/bot-hosts'
import { readBots } from '@/lib/bot-catalog'
import { selectFolderWorkspaceOnHost } from '@/store/folder-workspaces/folder-workspace-record-index'
import type { Bot } from '../../../../../shared/bot-types'
import type { ClaudeUsageBreakdownRow } from '../../../../../shared/agent-usage/analytics/claude-usage-types'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'

export type DepartmentUsageRange = '7d' | '30d'

export type DepartmentBotUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  turns: number
  estimatedCostUsd: number | null
}

export type DepartmentUsage = {
  state: 'loading' | 'ready' | 'unavailable'
  byBot: Map<string, DepartmentBotUsage>
  total: DepartmentBotUsage
}

const PROVIDERS = ['claudeUsage', 'codexUsage'] as const
// A machine's first usage read rescans its transcripts, which can take minutes.
const USAGE_TIMEOUT_MS = 5 * 60_000

function emptyUsage(): DepartmentBotUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, turns: 0, estimatedCostUsd: null }
}

function add(into: DepartmentBotUsage, row: ClaudeUsageBreakdownRow): void {
  into.inputTokens += row.inputTokens
  into.outputTokens += row.outputTokens
  into.cacheReadTokens += row.cacheReadTokens
  into.turns += row.turns
  if (row.estimatedCostUsd !== null) {
    into.estimatedCostUsd = (into.estimatedCostUsd ?? 0) + row.estimatedCostUsd
  }
}

function readRows(value: unknown): ClaudeUsageBreakdownRow[] {
  return Array.isArray(value)
    ? value.filter(
        (row): row is ClaudeUsageBreakdownRow =>
          typeof row === 'object' && row !== null && 'key' in row && 'inputTokens' in row
      )
    : []
}

const comparable = (path: string): string => path.replace(/\\/g, '/').replace(/\/+$/, '')

/** Whether a breakdown row is the bot's home: its folder workspace, or a chat run in its folder. */
function rowIsHome(
  row: ClaudeUsageBreakdownRow,
  folderWorkspaceId: string,
  folderPath: string | null
) {
  if (row.key.endsWith(folderWorkspaceId)) {
    return true
  }
  return (
    folderPath !== null &&
    row.key.startsWith('cwd:') &&
    comparable(row.key.slice('cwd:'.length)) === comparable(folderPath)
  )
}

async function hostRows(hostId: ExecutionHostId, range: DepartmentUsageRange) {
  const results = await Promise.allSettled(
    PROVIDERS.map((provider) =>
      callRuntimeRpc<unknown>(
        botHostTarget(hostId),
        'usage.call',
        {
          method: `${provider}:getBreakdown`,
          params: { scope: 'all', range, kind: 'project' }
        },
        { timeoutMs: USAGE_TIMEOUT_MS }
      )
    )
  )
  const rows = results.flatMap((result) =>
    result.status === 'fulfilled' ? readRows(result.value) : []
  )
  return { rows, answered: results.some((result) => result.status === 'fulfilled') }
}

export function useDepartmentUsage(
  bots: readonly Bot[],
  range: DepartmentUsageRange
): DepartmentUsage {
  const [usage, setUsage] = useState<DepartmentUsage>({
    state: 'loading',
    byBot: new Map(),
    total: emptyUsage()
  })
  const signature = bots.map((bot) => `${bot.hostId}/${bot.id}`).join('|')
  // The bots' identities (signature), not their objects, decide when to read again.
  useEffect(() => {
    const keys = new Set(signature.split('|'))
    const bots = readBots().filter((bot) => keys.has(`${bot.hostId}/${bot.id}`))
    let cancelled = false
    setUsage((current) => ({ ...current, state: 'loading' }))
    const hostIds = [...new Set(bots.map((bot) => bot.hostId))]
    void Promise.all(
      hostIds.map(async (hostId) => [hostId, await hostRows(hostId, range)] as const)
    )
      .then((answers) => {
        if (cancelled) {
          return
        }
        const state = useAppStore.getState()
        const byHost = new Map(answers)
        const byBot = new Map<string, DepartmentBotUsage>()
        const total = emptyUsage()
        for (const bot of bots) {
          const folderPath =
            selectFolderWorkspaceOnHost(state, bot.folderWorkspaceId, bot.hostId)?.folderPath ??
            null
          const botUsage = emptyUsage()
          for (const row of byHost.get(bot.hostId)?.rows ?? []) {
            if (rowIsHome(row, bot.folderWorkspaceId, folderPath)) {
              add(botUsage, row)
              add(total, row)
            }
          }
          byBot.set(`${bot.hostId}/${bot.id}`, botUsage)
        }
        const answered = answers.some(([, answer]) => answer.answered)
        setUsage({ state: answered ? 'ready' : 'unavailable', byBot, total })
      })
      .catch(() => {
        if (!cancelled) {
          setUsage({ state: 'unavailable', byBot: new Map(), total: emptyUsage() })
        }
      })
    return () => {
      cancelled = true
    }
  }, [signature, range])
  return usage
}

/** "1.2M", "34k", "980". */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${Math.round(count / 1000)}k`
  }
  return String(count)
}
