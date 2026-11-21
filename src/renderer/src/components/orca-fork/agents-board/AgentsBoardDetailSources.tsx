// orca-fork: the detail drawer's Drive & Wiki tab: files the work's chat and bot saved and wiki pages
// written while it ran. Read only while the tab shows.
import React, { useMemo, useState } from 'react'
import { BookOpen, HardDrive } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotItem } from '../../../../../shared/bots/bot-items'
import { DEFAULT_FORK_WIKI_WORKSPACE_ID } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { useDriveData, type DriveEntry } from '../drive/drive-host-data'
import { DriveKindIcon } from '../drive/ForkDriveThumbnail'
import { ForkDrivePreview } from '../drive/ForkDrivePreview'
import { useWikiList, type WikiTarget } from '../wiki/wiki-rpc'
import { useActiveWikiTarget } from '../wiki/use-active-wiki-target'
import { openWikiPage } from '../wiki/wiki-view-state'
import { useWikiActorName, wikiWhen } from '../wiki/WikiActor'
import { cardWindow, driveFilesForCard, wikiPagesForCard } from './agents-board-detail-sources'
import type { AgentsBoardCard } from './agents-board-model'
import { formatBoardClock } from './agents-board-time'

const NO_HANDLERS = { onOpen: () => undefined }

function DriveFiles({
  card,
  bot,
  item,
  now
}: {
  card: AgentsBoardCard
  bot: Bot
  item: BotItem | null
  now: number
}): React.JSX.Element {
  const t = useTranslate()
  const data = useDriveData(null, bot.hostId)
  const [previewing, setPreviewing] = useState<DriveEntry | null>(null)
  const files = useMemo(
    () => driveFilesForCard(data.files, bot, item?.chat.id ?? null, cardWindow(card, now)),
    [data.files, bot, item, card, now]
  )
  const unsupported = data.hosts.some((host) => host.state === 'unsupported')
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <HardDrive className="size-3.5" />
        {t('orcaFork.drive.title', 'Drive')}
        {files.length > 0 ? <span className="tabular-nums">· {files.length}</span> : null}
      </h3>
      {!data.loaded ? (
        <p className="text-[12px] text-muted-foreground">
          {t('orcaFork.agentsTasks.loading', 'Loading…')}
        </p>
      ) : unsupported ? (
        <p className="text-[12px] text-muted-foreground">
          {t(
            'orcaFork.agentsBoard.detail.driveUnsupported',
            "This machine's orca-server has no Drive."
          )}
        </p>
      ) : files.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          {t('orcaFork.agentsBoard.detail.noFiles', 'No files saved during this work.')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => setPreviewing(file)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <DriveKindIcon
                  kind={file.kind}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {formatBoardClock(file.createdAt, now)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {previewing ? (
        <ForkDrivePreview
          file={previewing}
          workspaceId={null}
          machine=""
          folderPath=""
          handlers={NO_HANDLERS}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </section>
  )
}

function WikiPages({
  card,
  bot,
  now
}: {
  card: AgentsBoardCard
  bot: Bot
  now: number
}): React.JSX.Element {
  const t = useTranslate()
  const active = useActiveWikiTarget()
  const target: WikiTarget =
    active.target.hostId === bot.hostId
      ? active.target
      : { hostId: bot.hostId, workspaceId: DEFAULT_FORK_WIKI_WORKSPACE_ID }
  const list = useWikiList(target)
  const actorName = useWikiActorName()
  const pages = useMemo(
    () => wikiPagesForCard(list.data?.pages ?? [], bot, cardWindow(card, now)),
    [list.data, bot, card, now]
  )
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <BookOpen className="size-3.5" />
        {t('orcaFork.wiki.title', 'Wiki')}
        {pages.length > 0 ? <span className="tabular-nums">· {pages.length}</span> : null}
      </h3>
      {list.loading && !list.data ? (
        <p className="text-[12px] text-muted-foreground">
          {t('orcaFork.agentsTasks.loading', 'Loading…')}
        </p>
      ) : list.error && !list.data ? (
        <p className="text-[12px] text-muted-foreground">{list.error}</p>
      ) : pages.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          {t('orcaFork.agentsBoard.detail.noPages', 'No wiki pages written during this work.')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => openWikiPage({ kind: 'page', slug: page.slug })}
                className="flex w-full min-w-0 flex-col rounded-md px-1.5 py-1 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="truncate text-[12px]">{page.title}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {actorName(page.updatedBy)} · {wikiWhen(page.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function AgentsBoardDetailSources({
  card,
  bot,
  item,
  now
}: {
  card: AgentsBoardCard
  bot: Bot
  item: BotItem | null
  now: number
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {FORK_FEATURES.drive ? <DriveFiles card={card} bot={bot} item={item} now={now} /> : null}
      {FORK_FEATURES.workspaceWiki ? <WikiPages card={card} bot={bot} now={now} /> : null}
    </div>
  )
}
