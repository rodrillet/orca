// orca-fork: one column of the Agents board, which takes an item card dropped on it.
import React, { useState } from 'react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type { AgentsBoardCard as Card, AgentsBoardColumn } from './agents-board-model'
import { AGENTS_BOARD_DRAG_TYPE, agentsBoardColumnLabel } from './AgentsBoardCard'

export function AgentsBoardColumnView({
  column,
  cards,
  botsByKey,
  dragged,
  onDropCard,
  renderCard
}: {
  column: AgentsBoardColumn
  cards: Card[]
  botsByKey: Map<string, Bot>
  dragged: Card | null
  onDropCard: (key: string, column: AgentsBoardColumn) => void
  renderCard: (card: Card, bot: Bot) => React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const label = agentsBoardColumnLabel(t, column)
  const [over, setOver] = useState(false)
  const accepts = dragged !== null && dragged.kind === 'item' && dragged.column !== column

  return (
    <section
      aria-label={label}
      data-agents-board-column={column}
      onDragOver={(event) => {
        if (!accepts || !event.dataTransfer.types.includes(AGENTS_BOARD_DRAG_TYPE)) {
          return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false)
        }
      }}
      onDrop={(event) => {
        setOver(false)
        const key = event.dataTransfer.getData(AGENTS_BOARD_DRAG_TYPE)
        if (key && accepts) {
          event.preventDefault()
          onDropCard(key, column)
        }
      }}
      className={cn(
        'flex min-w-[248px] flex-1 flex-col rounded-xl border bg-muted/30 transition-colors',
        over
          ? 'border-ring bg-accent/40'
          : accepts
            ? 'border-dashed border-border'
            : 'border-border/60'
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto rounded-full bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">
          {cards.length}
        </span>
      </header>
      <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {cards.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            {accepts
              ? t('orcaFork.agentsBoard.dropHere', 'Drop here')
              : t('dashboardPopout.bucket.empty', 'None')}
          </p>
        ) : (
          cards.map((card) => {
            const bot = botsByKey.get(card.botKey)
            return bot ? (
              <React.Fragment key={card.key}>{renderCard(card, bot)}</React.Fragment>
            ) : null
          })
        )}
      </div>
    </section>
  )
}
