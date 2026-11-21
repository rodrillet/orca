// orca-fork: the Wiki home, as agentes.chat's: pinned and recently edited pages, what the agents consult
// most, the spaces, and the latest consultations; a search, tag or folder shows its pages instead.
import React from 'react'
import { BookOpen, ChevronRight, FileText, Folder, Pin, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { WikiPageSummary } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { setWikiTag, showWikiCenter } from './wiki-view-state'
import { useWikiActivity, type WikiTarget } from './wiki-rpc'
import { buildWikiTree, pagesInFolder, type WikiFolderNode } from './wiki-tree'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'
import { ConsultationLog } from './WikiConsultations'

function PageCard({
  page,
  hostId
}: {
  page: WikiPageSummary
  hostId: ExecutionHostId
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  return (
    <button
      type="button"
      onClick={() => showWikiCenter({ kind: 'page', slug: page.slug })}
      className="flex min-h-28 flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-left shadow-xs hover:bg-accent"
    >
      <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
        <Folder className="size-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {page.folder ? page.folder.split('/').join(' / ') : t('orcaFork.wiki.root', 'Root')}
        </span>
        {page.pinned ? <Pin className="size-3 shrink-0" /> : null}
      </span>
      <span className="line-clamp-1 text-sm font-semibold">{page.title}</span>
      {page.excerpt ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">{page.excerpt}</span>
      ) : null}
      <span className="mt-auto flex items-center gap-1.5 text-2xs text-muted-foreground">
        <WikiActorAvatar actor={page.updatedBy} hostId={hostId} className="size-4" />
        <span className="truncate">
          {actorName(page.updatedBy)} · {wikiWhen(page.updatedAt)} ·{' '}
          {t('orcaFork.wiki.views', '{{count}} views', {
            count: page.viewCount,
            defaultValue_one: '{{count}} view'
          })}
        </span>
      </span>
    </button>
  )
}

function Cards({
  pages,
  hostId
}: {
  pages: readonly WikiPageSummary[]
  hostId: ExecutionHostId
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {pages.map((page) => (
        <PageCard key={page.id} page={page} hostId={hostId} />
      ))}
    </div>
  )
}

function Label({
  children,
  action
}: {
  children: React.ReactNode
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <h2 className="flex-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="flex flex-col gap-1 rounded-lg border border-border p-2">{children}</div>
}

/** "What the agents consult most" and the latest reads; an older server has no log and shows none. */
function ActivityPanels({
  target,
  pages
}: {
  target: WikiTarget
  pages: readonly WikiPageSummary[]
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const activity = useWikiActivity(target, { limit: 8 })
  const data = activity.data
  const popular = data?.popular ?? []
  const max = Math.max(1, ...popular.map((page) => page.count))
  const tree = buildWikiTree(pages)
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex flex-col gap-2">
          <Label>{t('orcaFork.wiki.topReads', 'What the agents consult most')}</Label>
          <Panel>
            {popular.length === 0 ? (
              <p className="px-1.5 py-1 text-xs text-muted-foreground">
                {t(
                  'orcaFork.wiki.topReadsEmpty',
                  'When agents read the wiki while they work, the pages they consult most show here.'
                )}
              </p>
            ) : null}
            {popular.map((page) => (
              <button
                key={page.pageId}
                type="button"
                onClick={() => showWikiCenter({ kind: 'page', slug: page.slug })}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-accent"
                title={page.readers.map((r) => `${actorName(r.actor)} ${r.count}`).join(' · ')}
              >
                <span className="flex shrink-0 -space-x-1.5">
                  {page.readers.slice(0, 3).map((reader, index) => (
                    <WikiActorAvatar
                      key={index}
                      actor={reader.actor}
                      hostId={target.hostId}
                      className="size-5 ring-2 ring-background"
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {page.title}
                </span>
                <span
                  className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round((page.count / max) * 100)}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-2xs tabular-nums text-muted-foreground">
                  {page.count}
                </span>
              </button>
            ))}
          </Panel>
        </section>
        <section className="flex flex-col gap-2">
          <Label>{t('orcaFork.wiki.spaces', 'Spaces')}</Label>
          <Panel>
            {tree.folders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => showWikiCenter({ kind: 'folder', folder: folder.path })}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-accent"
              >
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
                <span className="truncate text-2xs text-muted-foreground">
                  {folder.folders.map((section) => section.name).join(' · ')}
                </span>
                <span className="w-6 shrink-0 text-right text-2xs tabular-nums text-muted-foreground">
                  {folder.count}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {tree.pages.length > 0 ? (
              <div className="flex items-center gap-2 px-1.5 py-1.5 text-[13px] text-muted-foreground">
                <FileText className="size-4 shrink-0" />
                <span className="flex-1">{t('orcaFork.wiki.inRoot', 'Pages in no folder')}</span>
                <span className="w-6 text-right text-2xs tabular-nums">{tree.pages.length}</span>
                <span className="size-3.5" />
              </div>
            ) : null}
          </Panel>
        </section>
      </div>
      {data && data.consultations.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Label
            action={
              <Button
                size="xs"
                variant="ghost"
                onClick={() => showWikiCenter({ kind: 'consultations' })}
              >
                {t('orcaFork.wiki.seeAll', 'See all')}
              </Button>
            }
          >
            {t('orcaFork.wiki.recentConsultations', 'Recent consultations')}
          </Label>
          <ConsultationLog entries={data.consultations} hostId={target.hostId} empty="" />
        </section>
      ) : null}
    </>
  )
}

export function WikiHome({
  target,
  workspaceName,
  pages,
  shown,
  tag,
  query,
  loading,
  error
}: {
  target: WikiTarget
  workspaceName: string
  pages: readonly WikiPageSummary[]
  shown: readonly WikiPageSummary[]
  tag: string | null
  query: string
  loading: boolean
  error: string | null
}): React.JSX.Element {
  const t = useTranslate()
  const hostId = target.hostId
  if (error && pages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p>{t('orcaFork.wiki.unreachable', 'This computer’s wiki could not be read.')}</p>
        <p className="max-w-md text-xs">{error}</p>
        <p className="max-w-md text-xs">
          {t(
            'orcaFork.wiki.unreachableHint',
            'A paired server needs the fork’s orca-server to keep a wiki. Pick another computer on the left.'
          )}
        </p>
      </div>
    )
  }
  if (!loading && pages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <BookOpen className="size-10 text-muted-foreground" strokeWidth={1.25} />
        <h2 className="text-base font-semibold">
          {t('orcaFork.wiki.emptyTitle', 'Keep what the team needs to know')}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t(
            'orcaFork.wiki.emptyText',
            'Agents write what they learn here while they work: how things work, decisions, fixes. You can write pages too.'
          )}
        </p>
        <Button onClick={() => showWikiCenter({ kind: 'new', title: '' })}>
          <Plus className="size-4" />
          {t('orcaFork.wiki.newPage', 'New page')}
        </Button>
      </div>
    )
  }
  const filtering = Boolean(tag || query)
  const pinned = pages.filter((page) => page.pinned)
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tag
              ? `#${tag}`
              : t('orcaFork.wiki.homeTitle', '{{workspace}} wiki', { workspace: workspaceName })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtering
              ? t('orcaFork.wiki.matching', '{{count}} pages match', {
                  count: shown.length,
                  defaultValue_one: '{{count}} page matches'
                })
              : t(
                  'orcaFork.wiki.subtitle',
                  'What your agents learned, in linked pages. {{count}} pages.',
                  {
                    count: pages.length,
                    defaultValue_one: 'What your agents learned, in linked pages. {{count}} page.'
                  }
                )}
          </p>
        </div>
        {tag ? (
          <Button size="sm" variant="ghost" onClick={() => setWikiTag(null)}>
            <X className="size-4" />
            {t('orcaFork.wiki.clearTag', 'All pages')}
          </Button>
        ) : null}
      </div>
      {filtering ? (
        <Cards pages={shown.slice(0, 200)} hostId={hostId} />
      ) : (
        <>
          {pinned.length > 0 ? (
            <section className="flex flex-col gap-2">
              <Label>{t('orcaFork.wiki.pinned', 'Pinned')}</Label>
              <Cards pages={pinned} hostId={hostId} />
            </section>
          ) : null}
          <section className="flex flex-col gap-2">
            <Label>{t('orcaFork.wiki.recent', 'Recently changed')}</Label>
            <Cards pages={pages.slice(0, 6)} hostId={hostId} />
          </section>
          <ActivityPanels target={target} pages={pages} />
        </>
      )}
    </div>
  )
}

/** A space or section: its subfolders and every page in it. */
export function WikiFolderView({
  target,
  folder,
  pages
}: {
  target: WikiTarget
  folder: string
  pages: readonly WikiPageSummary[]
}): React.JSX.Element {
  const t = useTranslate()
  const inside = pagesInFolder(pages, folder)
  const parts = folder.split('/')
  let node: WikiFolderNode | undefined = buildWikiTree(inside)
  for (const part of parts) {
    node = node?.folders.find((entry) => entry.name === part)
  }
  const children = node?.folders ?? []
  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => showWikiCenter({ kind: 'home' })}
            >
              {t('orcaFork.wiki.title', 'Wiki')}
            </button>
            {parts.slice(0, -1).map((part, index) => (
              <React.Fragment key={part}>
                <span>/</span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() =>
                    showWikiCenter({ kind: 'folder', folder: parts.slice(0, index + 1).join('/') })
                  }
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Folder className="size-5 text-muted-foreground" />
            {parts.at(-1)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('orcaFork.wiki.folderCount', '{{count}} pages', {
              count: inside.length,
              defaultValue_one: '{{count}} page'
            })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => showWikiCenter({ kind: 'new', title: `${folder}/` })}
        >
          <Plus className="size-4" />
          {t('orcaFork.wiki.newPageHere', 'New page here')}
        </Button>
      </div>
      {children.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {children.map((child) => (
            <button
              key={child.path}
              type="button"
              onClick={() => showWikiCenter({ kind: 'folder', folder: child.path })}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              <Folder className="size-3.5 text-muted-foreground" />
              {child.name}
              <span className="tabular-nums text-muted-foreground">{child.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <Cards pages={inside} hostId={target.hostId} />
    </div>
  )
}
