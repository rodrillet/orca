// orca-fork: the Wiki home: recently changed pages, or the pages a search or tag matches.
import React from 'react'
import { BookOpen, FileText, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { WikiPageSummary } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { setWikiTag, showWikiCenter } from './wiki-view-state'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'

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
      className="flex flex-col gap-1.5 rounded-lg border border-border p-3 text-left hover:bg-accent"
    >
      <span className="flex items-center gap-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.title}</span>
      </span>
      {page.excerpt ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">{page.excerpt}</span>
      ) : null}
      <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
        <WikiActorAvatar actor={page.updatedBy} hostId={hostId} className="size-4" />
        <span className="truncate">
          {actorName(page.updatedBy)} · {wikiWhen(page.updatedAt)} ·{' '}
          {t('orcaFork.wiki.views', '{{count}} views', {
            count: page.viewCount,
            defaultValue_one: '{{count}} view'
          })}
        </span>
      </span>
      {page.tags.length ? (
        <span className="flex flex-wrap gap-1">
          {page.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-1.5 text-3xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  )
}

export function WikiHome({
  pages,
  shown,
  tag,
  query,
  hostId,
  loading,
  error
}: {
  pages: readonly WikiPageSummary[]
  shown: readonly WikiPageSummary[]
  tag: string | null
  query: string
  hostId: ExecutionHostId
  loading: boolean
  error: string | null
}): React.JSX.Element {
  const t = useTranslate()
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
  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tag ? `#${tag}` : t('orcaFork.wiki.title', 'Wiki')}
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
      {!filtering ? (
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('orcaFork.wiki.recent', 'Recently changed')}
        </h2>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {shown.slice(0, filtering ? 200 : 24).map((page) => (
          <PageCard key={page.id} page={page} hostId={hostId} />
        ))}
      </div>
    </div>
  )
}
