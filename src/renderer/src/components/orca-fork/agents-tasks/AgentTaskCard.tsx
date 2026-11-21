// orca-fork: one bot in the Tasks Agents view: what it is doing now, its open items, its workers' PRs.
import React from 'react'
import { ExternalLink, GitPullRequest, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { BotRowLineView, useBotRowLine } from '@/components/bots/BotRowActivityLine'
import { useBotNow } from '@/components/bots/use-bot-now'
import { useBotItems } from '@/components/bots/items/use-bot-items'
import { openBotItem } from '@/components/bots/items/bot-item-open'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { openBotHome, openBotHomeTab } from '@/lib/bot-catalog'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { cn } from '@/lib/class-names'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { foldBotStatus } from '../../../../../shared/bots/bot-row-status'
import { folderWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'
import {
  formatBotItemNumber,
  isOpenBotItemStatus,
  type BotItem,
  type BotItemStatus
} from '../../../../../shared/bots/bot-items'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotWorkerSummary } from '../../../../../shared/bots/bot-work-list'
import type { FolderWorkspace } from '../../../../../shared/folder-workspaces/folder-workspace-types'
import type { WorktreeStatus } from '../../../../../shared/worktree/row-display/worktree-status-rollup'
import { useBotWorkList } from './use-bot-work-list'

const SHOWN_ITEMS = 5
const SHOWN_WORKERS = 5

const ITEM_ORDER: Record<BotItemStatus, number> = {
  needs_you: 0,
  working: 1,
  planned: 2,
  done: 3,
  canceled: 4
}

function itemStatusLabel(t: Translate, status: BotItemStatus): string {
  switch (status) {
    case 'needs_you':
      return t('orcaFork.agentsTasks.item.needsYou', 'Needs you')
    case 'working':
      return t('orcaFork.agentsTasks.item.working', 'Working')
    case 'planned':
      return t('orcaFork.agentsTasks.item.planned', 'Planned')
    case 'done':
      return t('orcaFork.agentsTasks.item.done', 'Done')
    case 'canceled':
      return t('orcaFork.agentsTasks.item.canceled', 'Canceled')
  }
}

function workerStateLabel(t: Translate, worker: BotWorkerSummary): string {
  if (worker.state === 'working') {
    return worker.idle
      ? t('orcaFork.agentsTasks.worker.waiting', 'Waiting')
      : t('orcaFork.agentsTasks.worker.working', 'Working')
  }
  switch (worker.state) {
    case 'completed':
      return t('orcaFork.agentsTasks.worker.done', 'Done')
    case 'failed':
      return t('orcaFork.agentsTasks.worker.failed', 'Failed')
    case 'stopped':
      return t('orcaFork.agentsTasks.worker.stopped', 'Stopped')
    case 'unverifiable':
    case null:
      return t('orcaFork.agentsTasks.worker.unknown', 'Out of contact')
  }
}

function prLabel(t: Translate, pr: NonNullable<BotWorkerSummary['pr']>): string {
  if (pr.state === 'merged') {
    return t('orcaFork.agentsTasks.pr.merged', 'merged')
  }
  if (pr.state === 'closed') {
    return t('orcaFork.agentsTasks.pr.closed', 'closed')
  }
  const checks =
    pr.checks === 'success'
      ? t('orcaFork.agentsTasks.pr.ciGreen', 'CI green')
      : pr.checks === 'failure'
        ? t('orcaFork.agentsTasks.pr.ciFailing', 'CI failing')
        : pr.checks === 'pending'
          ? t('orcaFork.agentsTasks.pr.ciRunning', 'CI running')
          : t('orcaFork.agentsTasks.pr.noCi', 'no CI')
  const review =
    pr.review === 'APPROVED'
      ? t('orcaFork.agentsTasks.pr.approved', 'approved')
      : pr.review === 'CHANGES_REQUESTED'
        ? t('orcaFork.agentsTasks.pr.changes', 'changes requested')
        : null
  return review ? `${checks} · ${review}` : checks
}

function prTone(pr: NonNullable<BotWorkerSummary['pr']>): string {
  if (pr.state === 'merged') {
    return 'text-workspace-status-done'
  }
  if (pr.state === 'closed') {
    return 'text-muted-foreground'
  }
  return pr.checks === 'failure'
    ? 'text-destructive'
    : pr.checks === 'success'
      ? 'text-status-success'
      : 'text-muted-foreground'
}

function AgentNowLine({ bot, home }: { bot: Bot; home: FolderWorkspace }): React.JSX.Element {
  const { line, limit, now } = useBotRowLine(bot, home)
  return <BotRowLineView line={line} limit={limit} unread={false} now={now} />
}

export function AgentTaskCard({
  bot,
  home,
  hostLabel
}: {
  bot: Bot
  home: FolderWorkspace | null
  hostLabel: string
}): React.JSX.Element {
  const t = useTranslate()
  const offline = useBotHostOffline(bot.hostId)
  const homeStatus = useWorktreeActivityStatus(folderWorkspaceKey(bot.folderWorkspaceId))
  const now = useBotNow(offline ? null : bot)
  const items = useBotItems(offline ? null : bot)
  const work = useBotWorkList(bot)

  const openItems = (items.read?.items ?? [])
    .filter((item) => isOpenBotItemStatus(item.status))
    .sort((a, b) => ITEM_ORDER[a.status] - ITEM_ORDER[b.status] || b.updatedAt - a.updatedAt)
  const needsYouItems = openItems.filter((item) => item.status === 'needs_you').length
  const workers = [...(work?.items ?? [])].sort(
    (a, b) =>
      Number(b.state === 'working') - Number(a.state === 'working') ||
      (b.startedAt ?? 0) - (a.startedAt ?? 0)
  )
  const runningWorkers = workers.filter((worker) => worker.state === 'working').length

  const folded = foldBotStatus(homeStatus, bot.paused)
  const status: WorktreeStatus =
    now.needsYou > 0 || needsYouItems > 0 || folded === 'permission'
      ? 'permission'
      : now.working > 0 || folded === 'working'
        ? 'working'
        : folded
  const statusText = offline
    ? t('orcaFork.agentsTasks.offline', 'Offline')
    : bot.paused
      ? t('orcaFork.agentsTasks.paused', 'Paused')
      : status === 'permission'
        ? t('orcaFork.agentsTasks.needsYou', 'Needs you')
        : status === 'working'
          ? t('orcaFork.agentsTasks.working', 'Working')
          : t('orcaFork.agentsTasks.idle', 'Idle')

  const openItem = (item: BotItem): void => {
    if (openBotHome(bot)) {
      openBotItem(bot, item.uid)
    }
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-md border border-border/50 bg-card p-3 shadow-sm',
        (offline || bot.paused) && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <BotAvatar bot={bot} className="size-9 shrink-0 rounded-md text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{bot.name}</span>
            {offline ? null : <StatusIndicator status={status} />}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {statusText} · {hostLabel}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('orcaFork.agentsTasks.openChat', 'Open chat')}
          title={t('orcaFork.agentsTasks.openChat', 'Open chat')}
          disabled={offline}
          onClick={() => void openBotHomeTab(bot)}
        >
          <MessageSquare className="size-3.5" />
        </Button>
      </div>

      {home && !offline ? <AgentNowLine bot={bot} home={home} /> : null}

      <section className="flex min-w-0 flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('orcaFork.agentsTasks.items', 'Open items')} · {openItems.length}
        </div>
        {openItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            {items.state === 'loading' && !offline
              ? t('orcaFork.agentsTasks.loading', 'Loading…')
              : t('orcaFork.agentsTasks.noItems', 'No open items')}
          </div>
        ) : (
          openItems.slice(0, SHOWN_ITEMS).map((item) => (
            <button
              key={item.uid}
              type="button"
              onClick={() => openItem(item)}
              className="flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-accent"
            >
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatBotItemNumber(item.number)}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span
                className={cn(
                  'shrink-0',
                  item.status === 'needs_you' ? 'text-status-warning-text' : 'text-muted-foreground'
                )}
              >
                {itemStatusLabel(t, item.status)}
              </span>
            </button>
          ))
        )}
        {openItems.length > SHOWN_ITEMS ? (
          <div className="px-1 text-xs text-muted-foreground">
            {t('orcaFork.agentsTasks.more', '+{{value0}} more', {
              value0: openItems.length - SHOWN_ITEMS
            })}
          </div>
        ) : null}
      </section>

      <section className="flex min-w-0 flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('orcaFork.agentsTasks.workers', 'Workers')} · {runningWorkers}/{workers.length}
        </div>
        {workers.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            {t('orcaFork.agentsTasks.noWorkers', 'No workers')}
          </div>
        ) : (
          workers.slice(0, SHOWN_WORKERS).map((worker) => (
            <div key={worker.id} className="flex min-w-0 items-center gap-2 px-1 py-0.5 text-xs">
              <span
                className={cn(
                  'shrink-0',
                  worker.state === 'working'
                    ? 'text-foreground'
                    : worker.state === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {workerStateLabel(t, worker)}
              </span>
              <span className="min-w-0 flex-1 truncate" title={worker.title}>
                {worker.title}
              </span>
              {worker.pr ? (
                <button
                  type="button"
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded px-1 hover:bg-accent',
                    prTone(worker.pr)
                  )}
                  title={worker.pr.url}
                  onClick={(event) => {
                    if (worker.pr) {
                      openAppHttpLink(worker.pr.url, { event })
                    }
                  }}
                >
                  <GitPullRequest className="size-3" />#{worker.pr.number} · {prLabel(t, worker.pr)}
                  <ExternalLink className="size-3" />
                </button>
              ) : worker.server ? (
                <span className="shrink-0 text-muted-foreground">{worker.server}</span>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
