// orca-fork: a card opened beside the board, as agentes.chat's task panel: who did it and where, its
// state and times, what came of it (each worker's report and PR), its full item activity (status
// changes, comments, worker results), and what it left in the Drive and the Wiki.
import React, { useEffect, useRef } from 'react'
import { ExternalLink, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BotItemView } from '@/components/bots/items/BotItemView'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import { formatBotItemNumber, type BotItem } from '../../../../../shared/bots/bot-items'
import type { OrchestrationSessionWorker } from '../../../../../shared/orchestration-session-workers'
import { AgentPrBadge } from './AgentPrBadge'
import { agentsBoardColumnLabel } from './AgentsBoardCard'
import { AgentsBoardDetailSources } from './AgentsBoardDetailSources'
import { ResultTab } from './AgentsBoardDetailResult'
import type { AgentsBoardCard } from './agents-board-model'
import { formatBoardClock, formatBoardDuration } from './agents-board-time'
import { PresenceBotAvatar } from './PresenceBotAvatar'
import type { BotPresence } from './use-bot-presence'

function Fact({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-[12px] text-foreground">{children}</dd>
    </div>
  )
}

export function AgentsBoardDetail({
  card,
  bot,
  item,
  record,
  presence,
  hostLabel,
  now,
  onOpenInBot,
  onOpenChat,
  onClose
}: {
  card: AgentsBoardCard
  bot: Bot
  item: BotItem | null
  record: OrchestrationSessionWorker | null
  presence: BotPresence | null
  hostLabel: string
  now: number
  onOpenInBot: (card: AgentsBoardCard) => void
  onOpenChat: (card: AgentsBoardCard) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const panel = useRef<HTMLElement | null>(null)

  // Escape closes the panel before the board's own Escape (on document) closes the whole board.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }
      const target = event.target instanceof Element ? event.target : null
      // A menu or dialog over the panel takes its own Escape.
      if (target?.closest('[role="menu"], [role="dialog"]:not([data-agents-board-detail])')) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  useEffect(() => {
    panel.current?.focus({ preventScroll: true })
  }, [card.key])

  const meta = [presence?.label ?? null, hostLabel, card.workspace].filter(Boolean).join(' · ')
  const madeBy =
    item?.madeBy?.name ??
    (item ? (item.owner.name ?? bot.name) : (record?.agent ?? card.agent ?? null))
  const duration =
    card.startedAt !== null
      ? formatBoardDuration((card.finishedAt ?? now) - card.startedAt, t)
      : null
  const filesTab = <AgentsBoardDetailSources card={card} bot={bot} item={item} now={now} />

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={card.title}
      data-agents-board-detail=""
      className="absolute inset-y-0 right-0 z-20 flex w-[min(460px,100%)] flex-col border-l border-border bg-background shadow-xl outline-none"
    >
      <header className="flex shrink-0 items-start gap-2.5 border-b border-border px-3 py-2.5">
        <PresenceBotAvatar
          bot={bot}
          presence={presence?.presence ?? null}
          className="mt-0.5 size-8 shrink-0 rounded-md text-sm"
        />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[13px] leading-snug font-semibold">
            {card.number !== null ? (
              <span className="mr-1 font-normal text-muted-foreground tabular-nums">
                {formatBotItemNumber(card.number)}
              </span>
            ) : null}
            {card.title}
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {bot.name}
            {meta ? ` · ${meta}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('orcaFork.agentsBoard.detail.close', 'Close')}
          className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </header>

      <dl className="grid shrink-0 grid-cols-3 gap-x-3 gap-y-2 border-b border-border px-3 py-2.5">
        <Fact label={t('orcaFork.agentsBoard.detail.status', 'Status')}>
          {agentsBoardColumnLabel(t, card.column)}
        </Fact>
        <Fact label={t('orcaFork.agentsBoard.detail.started', 'Started')}>
          {card.startedAt !== null ? formatBoardClock(card.startedAt, now) : '—'}
        </Fact>
        <Fact label={t('orcaFork.agentsBoard.detail.finished', 'Finished')}>
          {card.finishedAt !== null ? formatBoardClock(card.finishedAt, now) : '—'}
        </Fact>
        <Fact label={t('orcaFork.agentsBoard.detail.duration', 'Duration')}>{duration ?? '—'}</Fact>
        <Fact label={t('orcaFork.agentsBoard.detail.by', 'By')}>{madeBy ?? '—'}</Fact>
        <Fact label={t('orcaFork.agentsBoard.detail.pr', 'PR')}>
          {card.pr ? <AgentPrBadge pr={card.pr} className="-ml-1" /> : '—'}
        </Fact>
        {card.doneMeans ? (
          <div className="col-span-3 flex min-w-0 flex-col gap-0.5">
            <dt className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('orcaFork.agentsBoard.card.doneMeans', 'Done means')}
            </dt>
            <dd className="line-clamp-3 text-[12px] text-foreground/90">{card.doneMeans}</dd>
          </div>
        ) : null}
      </dl>

      <Tabs
        key={card.key}
        defaultValue={card.kind === 'item' ? 'activity' : 'result'}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList variant="line" className="mx-3 mt-1 shrink-0 self-start">
          {card.kind === 'item' ? (
            <TabsTrigger value="activity">
              {t('orcaFork.agentsBoard.detail.activity', 'Activity')}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="result">
            {t('orcaFork.agentsBoard.detail.result', 'Result')}
          </TabsTrigger>
          <TabsTrigger value="files">
            {t('orcaFork.agentsBoard.detail.files', 'Drive & Wiki')}
          </TabsTrigger>
        </TabsList>
        {card.kind === 'item' && card.itemUid ? (
          <TabsContent value="activity" className="flex min-h-0 flex-1 flex-col">
            <BotItemView bot={bot} uid={card.itemUid} listed={item ?? undefined} />
          </TabsContent>
        ) : null}
        <TabsContent value="result" className="min-h-0 flex-1">
          <div className="scrollbar-sleek h-full overflow-y-auto px-3 py-3">
            <ResultTab card={card} item={item} record={record} now={now} />
          </div>
        </TabsContent>
        <TabsContent value="files" className="min-h-0 flex-1">
          <div className="scrollbar-sleek h-full overflow-y-auto px-3 py-3">{filesTab}</div>
        </TabsContent>
      </Tabs>

      <footer className="flex shrink-0 items-center justify-end gap-1.5 border-t border-border px-3 py-2">
        {card.kind === 'item' ? (
          <Button variant="ghost" size="xs" onClick={() => onOpenInBot(card)}>
            <ExternalLink className="size-3.5" />
            {t('orcaFork.agentsBoard.detail.openInBot', 'Open in the bot')}
          </Button>
        ) : null}
        <Button variant="outline" size="xs" onClick={() => onOpenChat(card)}>
          <MessageSquare className="size-3.5" />
          {t('orcaFork.agentsTasks.openChat', 'Open chat')}
        </Button>
      </footer>
    </aside>
  )
}
