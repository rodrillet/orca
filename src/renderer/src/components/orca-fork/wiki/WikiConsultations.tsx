// orca-fork: the wiki's consultations: who read a page, when, and from which chat or task. One row per
// read, grouped by day; the workspace log, one page's and one agent's all use these rows.
import React from 'react'
import { ListChecks, MessageSquare } from 'lucide-react'
import { openBotSession } from '@/components/bots/bot-session-open'
import { readHostBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import {
  wikiActorKey,
  type WikiActor,
  type WikiConsultation,
  type WikiView
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import { closeWikiPage, showWikiCenter } from './wiki-view-state'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'

const DAY = 86_400_000

function dayKey(at: number): string {
  const date = new Date(at)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function useDayLabel(): (at: number) => string {
  const t = useTranslate()
  return (at) => {
    const today = dayKey(Date.now())
    if (dayKey(at) === today) {
      return t('orcaFork.wiki.today', 'Today')
    }
    if (dayKey(at + DAY) === today) {
      return t('orcaFork.wiki.yesterday', 'Yesterday')
    }
    return uiDateTimeFormat({ weekday: 'long', day: 'numeric', month: 'long' }).format(at)
  }
}

function openChat(hostId: ExecutionHostId, by: WikiActor, chatId: string): void {
  const bot = by.kind === 'bot' ? readHostBots(hostId).find((entry) => entry.id === by.botId) : null
  if (bot) {
    closeWikiPage()
    openBotSession(bot, chatId)
  }
}

/** "from Fix the CI · task Ship the release": the chat opens it (a bot's), the task is named. */
export function ConsultationSource({
  view,
  hostId
}: {
  view: WikiView
  hostId: ExecutionHostId
}): React.JSX.Element | null {
  const t = useTranslate()
  if (!view.chatId && !view.taskTitle) {
    return null
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      {view.chatId ? (
        <button
          type="button"
          disabled={view.by.kind !== 'bot'}
          onClick={() => view.chatId && openChat(hostId, view.by, view.chatId)}
          className="flex min-w-0 items-center gap-1 rounded-full border border-border px-1.5 py-px text-2xs text-muted-foreground enabled:hover:bg-accent enabled:hover:text-foreground"
          title={t('orcaFork.wiki.openChat', 'Open the chat')}
        >
          <MessageSquare className="size-3 shrink-0" />
          <span className="max-w-[16rem] truncate">
            {view.chatTitle || t('orcaFork.wiki.aChat', 'a chat')}
          </span>
        </button>
      ) : null}
      {view.taskTitle ? (
        <span
          className="flex min-w-0 items-center gap-1 rounded-full border border-border px-1.5 py-px text-2xs text-muted-foreground"
          title={view.taskId ?? undefined}
        >
          <ListChecks className="size-3 shrink-0" />
          <span className="max-w-[16rem] truncate">{view.taskTitle}</span>
        </span>
      ) : null}
    </span>
  )
}

function ConsultationRow({
  entry,
  hostId,
  showPage,
  showReader
}: {
  entry: WikiConsultation
  hostId: ExecutionHostId
  showPage: boolean
  showReader: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const time = uiDateTimeFormat({ hour: '2-digit', minute: '2-digit' }).format(entry.at)
  return (
    <li className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <WikiActorAvatar actor={entry.by} hostId={hostId} className="mt-0.5 size-6" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px]">
          {showReader ? (
            <button
              type="button"
              className="font-medium hover:underline"
              onClick={() => showWikiCenter({ kind: 'readers', actorKey: wikiActorKey(entry.by) })}
            >
              {actorName(entry.by)}
            </button>
          ) : null}
          {showPage ? (
            <>
              <span className="text-muted-foreground">
                {showReader ? t('orcaFork.wiki.consulted', 'read') : null}
              </span>
              <button
                type="button"
                disabled={entry.trashed}
                onClick={() => showWikiCenter({ kind: 'page', slug: entry.slug })}
                className="min-w-0 truncate font-medium enabled:hover:underline disabled:text-muted-foreground disabled:line-through"
              >
                {entry.title}
              </button>
              {entry.folder ? (
                <span className="truncate text-2xs text-muted-foreground">
                  {entry.folder.split('/').join(' / ')}
                </span>
              ) : null}
            </>
          ) : null}
        </span>
        <ConsultationSource view={entry} hostId={hostId} />
      </div>
      <span
        className="shrink-0 pt-0.5 text-2xs tabular-nums text-muted-foreground"
        title={wikiWhen(entry.at)}
      >
        {time}
      </span>
    </li>
  )
}

export function ConsultationLog({
  entries,
  hostId,
  showPage = true,
  showReader = true,
  empty
}: {
  entries: readonly WikiConsultation[]
  hostId: ExecutionHostId
  showPage?: boolean
  showReader?: boolean
  empty: string
}): React.JSX.Element {
  const dayLabel = useDayLabel()
  if (entries.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">{empty}</p>
  }
  const days: { key: string; at: number; entries: WikiConsultation[] }[] = []
  for (const entry of entries) {
    const key = dayKey(entry.at)
    const day = days.at(-1)
    if (day?.key === key) {
      day.entries.push(entry)
    } else {
      days.push({ key, at: entry.at, entries: [entry] })
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-0.5">
          <h4 className="px-2 text-2xs font-medium text-muted-foreground first-letter:uppercase">
            {dayLabel(day.at)}
          </h4>
          <ul className="flex flex-col">
            {day.entries.map((entry) => (
              <ConsultationRow
                key={`${wikiActorKey(entry.by)}:${entry.pageId}:${entry.at}`}
                entry={entry}
                hostId={hostId}
                showPage={showPage}
                showReader={showReader}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Readers as bars: who reads this most (agentes.chat's "Agents that use this page"). */
export function ReaderBars({
  readers,
  hostId,
  limit = 6
}: {
  readers: readonly { actor: WikiActor; count: number; lastAt?: number }[]
  hostId: ExecutionHostId
  limit?: number
}): React.JSX.Element {
  const actorName = useWikiActorName()
  const max = Math.max(1, ...readers.map((reader) => reader.count))
  return (
    <ul className="flex flex-col gap-1">
      {readers.slice(0, limit).map((reader) => (
        <li key={wikiActorKey(reader.actor)}>
          <button
            type="button"
            onClick={() =>
              showWikiCenter({ kind: 'readers', actorKey: wikiActorKey(reader.actor) })
            }
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
          >
            <WikiActorAvatar actor={reader.actor} hostId={hostId} />
            <span className="w-28 min-w-0 truncate font-medium">{actorName(reader.actor)}</span>
            <span
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((reader.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-7 shrink-0 text-right tabular-nums text-muted-foreground">
              {reader.count}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
