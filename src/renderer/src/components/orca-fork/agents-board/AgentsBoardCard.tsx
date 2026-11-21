// orca-fork: one card on the Agents board: the bot's face and presence, the work, its PR and where it runs.
import React from 'react'
import { FolderGit2, MoreHorizontal, Server, Workflow } from 'lucide-react'
import { AgentQuestionIcon } from '@/components/agent/status/AgentQuestionIcon'
import { AgentWorkingSpinner } from '@/components/agent/status/AgentWorkingSpinner'
import { BotAvatar } from '@/components/bots/BotAvatar'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { formatStartedAgo } from '@/components/dashboard/board/AgentKanbanCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/class-names'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { formatBotItemNumber } from '../../../../../shared/bots/bot-items'
import type { Bot } from '../../../../../shared/bot-types'
import { AgentPrBadge } from './AgentPrBadge'
import {
  AGENTS_BOARD_COLUMNS,
  type AgentsBoardCard as Card,
  type AgentsBoardColumn
} from './agents-board-model'
import type { BotPresence } from './use-bot-presence'

export const AGENTS_BOARD_DRAG_TYPE = 'application/x-orca-fork-agents-card'

export function agentsBoardColumnLabel(t: Translate, column: AgentsBoardColumn): string {
  switch (column) {
    case 'todo':
      return t('orcaFork.agentsBoard.column.todo', 'To do')
    case 'doing':
      return t('orcaFork.agentsBoard.column.doing', 'In progress')
    case 'needs_you':
      return t('orcaFork.agentsBoard.column.needsYou', 'Needs you')
    case 'done':
      return t('orcaFork.agentsBoard.column.done', 'Done')
  }
}

function workerStateWords(t: Translate, card: Card): string | null {
  switch (card.workerState) {
    case 'waiting':
      return t('orcaFork.agentsTasks.worker.waiting', 'Waiting')
    case 'failed':
      return t('orcaFork.agentsTasks.worker.failed', 'Failed')
    case 'stopped':
      return t('orcaFork.agentsTasks.worker.stopped', 'Stopped')
    case 'unverifiable':
      return t('orcaFork.agentsTasks.worker.unknown', 'Out of contact')
    default:
      return null
  }
}

export function AgentsBoardCard({
  card,
  bot,
  presence,
  hostLabel,
  now,
  dragging,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd
}: {
  card: Card
  bot: Bot
  presence: BotPresence | null
  hostLabel: string
  now: number
  dragging: boolean
  onOpen: (card: Card) => void
  onMove: (card: Card, column: AgentsBoardColumn) => void
  onDragStart: (card: Card) => void
  onDragEnd: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const movable = card.kind === 'item'
  const needsYou = card.column === 'needs_you'
  const done = card.column === 'done'
  const stateWords = workerStateWords(t, card)

  return (
    <div
      draggable={movable}
      onDragStart={(event) => {
        event.dataTransfer.setData(AGENTS_BOARD_DRAG_TYPE, card.key)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(card)
      }}
      onDragEnd={onDragEnd}
      data-agents-board-card={card.key}
      className={cn(
        'group relative flex w-full flex-col gap-1.5 overflow-hidden rounded-lg border p-2.5 text-left transition-colors',
        movable && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
        needsYou
          ? 'border-agent-question/40 bg-agent-question/[0.06] hover:border-agent-question/60 hover:bg-agent-question/10'
          : done
            ? 'border-emerald-500/40 bg-emerald-500/[0.06] hover:border-emerald-500/60 hover:bg-emerald-500/10'
            : 'border-border/60 bg-card hover:border-border hover:bg-accent/40'
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <span className="relative inline-flex shrink-0">
          <BotAvatar bot={bot} className="size-5 rounded-[5px] text-[10px]" />
          {presence && !presence.offline ? (
            <span
              className="absolute -right-1 -bottom-1 inline-flex rounded-full bg-card p-px"
              title={presence.label}
            >
              <StatusIndicator status={presence.status} showTooltip={false} />
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'min-w-0 truncate text-[11px] text-muted-foreground',
            presence?.offline && 'line-through'
          )}
          title={presence ? `${bot.name} · ${presence.label}` : bot.name}
        >
          {bot.name}
        </span>
        {card.number !== null ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatBotItemNumber(card.number)}
          </span>
        ) : (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded bg-muted-foreground/10 px-1 text-[10px] text-muted-foreground"
            title={t('orcaFork.agentsBoard.worker', 'Worker')}
          >
            <Workflow className="size-2.5" />
            {card.agent ?? t('orcaFork.agentsBoard.worker', 'Worker')}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {card.live ? <AgentWorkingSpinner /> : null}
          {movable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('orcaFork.agentsBoard.moveTo', 'Move to…')}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:opacity-100"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>
                  {t('orcaFork.agentsBoard.moveTo', 'Move to…')}
                </DropdownMenuLabel>
                {AGENTS_BOARD_COLUMNS.filter((column) => column !== card.column).map((column) => (
                  <DropdownMenuItem key={column} onSelect={() => onMove(card, column)}>
                    {agentsBoardColumnLabel(t, column)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(card)}
        className="flex w-full flex-col gap-1.5 text-left focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="line-clamp-3 w-full text-[12.5px] leading-snug text-foreground">
          {card.title}
        </span>
        {card.detail ? (
          <span className="flex w-full items-start gap-1 rounded-md bg-agent-question/15 px-1.5 py-1 text-[11px] text-agent-question-text ring-1 ring-inset ring-agent-question/25">
            <AgentQuestionIcon className="mt-px size-3 shrink-0" />
            <span className="line-clamp-2">{card.detail}</span>
          </span>
        ) : null}
        {stateWords ? (
          <span
            className={cn(
              'text-[11px]',
              card.workerState === 'failed' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {stateWords}
          </span>
        ) : null}
      </button>

      {card.pr ? (
        <div className="flex w-full min-w-0 text-[11px]">
          <AgentPrBadge pr={card.pr} className="-ml-1" />
        </div>
      ) : null}
      <div className="flex w-full min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex min-w-0 shrink items-center gap-1" title={hostLabel}>
          <Server className="size-3 shrink-0" />
          <span className="truncate">{hostLabel}</span>
        </span>
        {card.workspace ? (
          <span className="inline-flex min-w-0 shrink items-center gap-1" title={card.workspace}>
            <FolderGit2 className="size-3 shrink-0" />
            <span className="truncate">{card.workspace}</span>
          </span>
        ) : null}
        {card.at > 0 ? (
          <span className="ml-auto shrink-0 pl-1 tabular-nums">
            {formatStartedAgo(card.at, now, t)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
