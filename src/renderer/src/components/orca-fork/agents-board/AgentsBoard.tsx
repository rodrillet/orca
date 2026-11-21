// orca-fork: the Agents board: every bot's items and workers on every paired machine, in four columns,
// with cards dragged between columns to change an item's status.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ListTodo, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { openBotItem } from '@/components/bots/items/bot-item-open'
import { setBotItemsStatus } from '@/components/bots/items/use-bot-items'
import { openBotHome, openBotHomeTab, useBots } from '@/lib/bot-catalog'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import { setAgentsTasksViewOpen } from '../agents-tasks/agents-tasks-view-state'
import {
  AGENTS_BOARD_COLUMNS,
  filterAgentsBoardCards,
  itemStatusForColumn,
  sortAgentsBoardColumn,
  type AgentsBoardCard as Card,
  type AgentsBoardCardFacets,
  type AgentsBoardColumn
} from './agents-board-model'
import { AgentsBoardBotFeed, type AgentsBoardBotReport } from './AgentsBoardBotFeed'
import { AgentsBoardCard } from './AgentsBoardCard'
import { AgentsBoardColumnView } from './AgentsBoardColumn'
import { countOptions, useBotTags, useHostLabels } from './agents-board-facets'
import { AgentsBoardToolbar, type AgentsBoardFilterOptions } from './AgentsBoardToolbar'
import { updateAgentsBoardPrefs, useAgentsBoardPrefs } from './agents-board-prefs'

type Reports = ReadonlyMap<string, AgentsBoardBotReport>

export function AgentsBoard({
  viewSwitch,
  headerActions,
  onClose,
  onNavigate
}: {
  viewSwitch?: React.ReactNode
  headerActions?: React.ReactNode
  onClose?: () => void
  /** The board opened something elsewhere in the window: an in-window host closes itself. */
  onNavigate?: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const bots = useBots()
  const prefs = useAgentsBoardPrefs()
  const [query, setQuery] = useState('')
  const [reports, setReports] = useState<Reports>(() => new Map())
  const [overrides, setOverrides] = useState<ReadonlyMap<string, AgentsBoardColumn>>(
    () => new Map()
  )
  const [dragged, setDragged] = useState<Card | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(
    () => installWindowVisibilityInterval({ run: () => setNow(Date.now()), intervalMs: 30_000 }),
    []
  )

  const onReport = useCallback((botKey: string, report: AgentsBoardBotReport | null) => {
    setReports((previous) => {
      if ((previous.get(botKey) ?? null) === report) {
        return previous
      }
      const next = new Map(previous)
      if (report) {
        next.set(botKey, report)
      } else {
        next.delete(botKey)
      }
      return next
    })
  }, [])

  const botsByKey = useMemo(
    () => new Map(bots.map((bot) => [botSidebarEntryKey(bot), bot])),
    [bots]
  )
  const hostIds = useMemo(() => [...new Set(bots.map((bot) => bot.hostId))].sort(), [bots])
  const hostLabels = useHostLabels(hostIds)
  const { tagsOf, tagLabel } = useBotTags()

  const allCards = useMemo(() => {
    const cards: Card[] = []
    for (const report of reports.values()) {
      for (const card of report.cards) {
        const column = overrides.get(card.key)
        cards.push(column ? { ...card, column } : card)
      }
    }
    return cards
  }, [reports, overrides])

  // An optimistic move ends once the host's read agrees with it.
  useEffect(() => {
    if (overrides.size === 0) {
      return
    }
    const settled = [...overrides].filter(([key, column]) =>
      [...reports.values()].some((report) =>
        report.cards.some((card) => card.key === key && card.column === column)
      )
    )
    if (settled.length > 0) {
      setOverrides((previous) => {
        const next = new Map(previous)
        settled.forEach(([key]) => next.delete(key))
        return next
      })
    }
  }, [reports, overrides])

  const facets = useCallback(
    (card: Card): AgentsBoardCardFacets => {
      const bot = botsByKey.get(card.botKey)
      return { hostId: bot?.hostId ?? '', botName: bot?.name ?? '', tags: tagsOf(card.botKey) }
    },
    [botsByKey, tagsOf]
  )

  const options = useMemo((): AgentsBoardFilterOptions => {
    return {
      workspaces: countOptions(
        allCards.flatMap((card) => (card.workspace ? [card.workspace] : [])),
        (id) => id
      ),
      hosts: countOptions(
        allCards.map((card) => facets(card).hostId),
        (id) => hostLabels[id] ?? id
      ),
      bots: countOptions(
        allCards.map((card) => card.botKey),
        (id) => botsByKey.get(id)?.name ?? id
      ),
      tags: countOptions(
        allCards.flatMap((card) => facets(card).tags).filter((id) => tagLabel.has(id)),
        (id) => tagLabel.get(id) ?? id
      )
    }
  }, [allCards, facets, hostLabels, botsByKey, tagLabel])

  const shownCards = useMemo(
    () => filterAgentsBoardCards(allCards, facets, prefs.filters, query),
    [allCards, facets, prefs.filters, query]
  )
  const columns = useMemo(() => {
    const grouped = new Map<AgentsBoardColumn, Card[]>(AGENTS_BOARD_COLUMNS.map((c) => [c, []]))
    for (const card of shownCards) {
      grouped.get(card.column)?.push(card)
    }
    return AGENTS_BOARD_COLUMNS.map(
      (column) => [column, sortAgentsBoardColumn(grouped.get(column) ?? [])] as const
    )
  }, [shownCards])

  const move = useCallback(
    (card: Card, column: AgentsBoardColumn) => {
      const bot = botsByKey.get(card.botKey)
      if (card.kind !== 'item' || !card.itemUid || !bot || card.column === column) {
        return
      }
      setOverrides((previous) => new Map(previous).set(card.key, column))
      setBotItemsStatus(bot, [card.itemUid], itemStatusForColumn(column)).catch(
        (error: unknown) => {
          setOverrides((previous) => {
            const next = new Map(previous)
            next.delete(card.key)
            return next
          })
          toast.error(t('orcaFork.agentsBoard.moveFailed', "Couldn't move the card"), {
            description: error instanceof Error ? error.message : undefined
          })
        }
      )
    },
    [botsByKey, t]
  )

  const dropCard = useCallback(
    (key: string, column: AgentsBoardColumn) => {
      const card = allCards.find((candidate) => candidate.key === key)
      if (card) {
        move(card, column)
      }
      setDragged(null)
    },
    [allCards, move]
  )

  const open = useCallback(
    (card: Card) => {
      const bot = botsByKey.get(card.botKey)
      if (!bot) {
        return
      }
      if (card.kind === 'item' && card.itemUid) {
        if (openBotHome(bot)) {
          openBotItem(bot, card.itemUid)
        }
      } else {
        void openBotHomeTab(bot)
      }
      onNavigate?.()
    },
    [botsByKey, onNavigate]
  )

  const openInTasks = (): void => {
    useAppStore.getState().openTaskPage()
    setAgentsTasksViewOpen(true)
    onNavigate?.()
  }

  const loading = bots.length > 0 && reports.size < bots.length
  const renderCard = (card: Card, bot: Bot): React.ReactNode => (
    <AgentsBoardCard
      card={card}
      bot={bot}
      presence={reports.get(card.botKey)?.presence ?? null}
      hostLabel={hostLabels[bot.hostId] ?? bot.hostId}
      now={now}
      dragging={dragged?.key === card.key}
      onOpen={open}
      onMove={move}
      onDragStart={setDragged}
      onDragEnd={() => setDragged(null)}
    />
  )

  return (
    <TooltipProvider>
      <div className="relative flex h-full w-full flex-col text-foreground">
        {bots.map((bot) => (
          <AgentsBoardBotFeed
            key={botSidebarEntryKey(bot)}
            bot={bot}
            now={now}
            onReport={onReport}
          />
        ))}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
          <h1 className="text-[13px] font-semibold">{t('dashboardPopout.title', 'Agents')}</h1>
          <span className="text-[11px] text-muted-foreground">
            {t('dashboardPopout.total', '{{count}} total', { count: allCards.length })}
          </span>
          {viewSwitch}
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={openInTasks}>
              <ListTodo className="size-3.5" />
              {t('orcaFork.agentsBoard.openInTasks', 'Agents in Tasks')}
            </Button>
            {headerActions}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={t('dashboardPopout.close', 'Close dashboard')}
                className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
        <AgentsBoardToolbar
          options={options}
          filters={prefs.filters}
          onFiltersChange={(filters) => updateAgentsBoardPrefs({ filters })}
          query={query}
          onQueryChange={setQuery}
          shown={shownCards.length}
          total={allCards.length}
        />
        {bots.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t('orcaFork.agentsTasks.empty', 'No bots on this computer or its paired servers yet.')}
          </div>
        ) : (
          <div className="scrollbar-sleek flex min-h-0 flex-1 overflow-x-auto p-3">
            <div className="mx-auto flex w-full max-w-[1280px] gap-3">
              {columns.map(([column, cards]) => (
                <AgentsBoardColumnView
                  key={column}
                  column={column}
                  cards={cards}
                  botsByKey={botsByKey}
                  dragged={dragged}
                  onDropCard={dropCard}
                  renderCard={renderCard}
                />
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="pointer-events-none absolute right-4 bottom-3 text-[11px] text-muted-foreground">
            {t('orcaFork.agentsTasks.loading', 'Loading…')}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
