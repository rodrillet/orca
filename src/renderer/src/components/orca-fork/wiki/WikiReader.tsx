// orca-fork: one wiki page: its text, who wrote it, who read it and when, where it is mentioned, and
// its history; Edit swaps the text for the editor in place.
import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  ArchiveRestore,
  Clock,
  Copy,
  Eye,
  FileText,
  MessageSquare,
  Pencil,
  SquareCheck,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { openBotSession } from '@/components/bots/bot-session-open'
import { readHostBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import type {
  WikiBacklink,
  WikiPage,
  WikiPageSummary
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import { useWikiPage, writeWiki, type WikiTarget } from './wiki-rpc'
import { WikiMarkdown } from './WikiMarkdown'
import { WikiEditor } from './WikiEditor'
import { WikiHistoryDialog } from './WikiHistoryDialog'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'
import { closeWikiPage, setWikiTag, showWikiCenter } from './wiki-view-state'

function AsideBlock({
  title,
  count,
  children
}: {
  title: string
  count?: number
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {count !== undefined ? <span className="ml-1.5 tabular-nums">{count}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function backlinkIcon(kind: WikiBacklink['kind']): React.JSX.Element {
  const Icon = kind === 'page' ? FileText : kind === 'chat' ? MessageSquare : SquareCheck
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />
}

function Backlinks({ target, page }: { target: WikiTarget; page: WikiPage }): React.JSX.Element {
  const t = useTranslate()
  if (page.backlinks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          'orcaFork.wiki.noBacklinks',
          'Nothing mentions this page yet. Agents record it when they cite [[{{title}}]].',
          { title: page.title }
        )}
      </p>
    )
  }
  const open = (link: WikiBacklink) => {
    if (link.kind === 'page') {
      showWikiCenter({ kind: 'page', slug: link.id })
      return
    }
    const botId = link.by?.kind === 'bot' ? link.by.botId : null
    const bot = readHostBots(target.hostId).find((entry) => entry.id === botId)
    if (link.kind === 'chat' && bot) {
      closeWikiPage()
      openBotSession(bot, link.id)
    }
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {page.backlinks.map((link) => (
        <li key={`${link.kind}:${link.id}`}>
          <button
            type="button"
            onClick={() => open(link)}
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
          >
            {backlinkIcon(link.kind)}
            <span className="min-w-0 flex-1 truncate">{link.title || link.id}</span>
            <span className="shrink-0 text-2xs text-muted-foreground">{wikiWhen(link.at)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Viewers({ target, page }: { target: WikiTarget; page: WikiPage }): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  if (page.viewers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t('orcaFork.wiki.noViews', 'No reads yet.')}</p>
    )
  }
  return (
    <ul className="flex flex-col gap-1">
      {page.viewers.map((viewer) => (
        <li key={JSON.stringify(viewer.actor)} className="flex items-center gap-2 text-xs">
          <WikiActorAvatar actor={viewer.actor} hostId={target.hostId} />
          <span className="min-w-0 flex-1 truncate">{actorName(viewer.actor)}</span>
          <span className="shrink-0 text-2xs text-muted-foreground">
            {t('orcaFork.wiki.viewerCount', '{{count}}×', {
              count: viewer.count,
              defaultValue_one: '{{count}}×'
            })}{' '}
            · {wikiWhen(viewer.lastAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TrashedBanner({
  target,
  page
}: {
  target: WikiTarget
  page: WikiPage
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
      <Trash2 className="size-4 text-muted-foreground" />
      <span className="flex-1">
        {t('orcaFork.wiki.inTrash', 'In the trash since {{when}} (by {{who}}).', {
          when: page.deletedAt ? wikiWhen(page.deletedAt) : '',
          who: page.deletedBy ? actorName(page.deletedBy) : '—'
        })}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          void writeWiki(target, 'restore', { page: page.id })
            .then(() => toast.success(t('orcaFork.wiki.restored', 'Restored')))
            .catch((error: unknown) => toast.error(String(error)))
        }
      >
        <ArchiveRestore className="size-4" />
        {t('orcaFork.wiki.restore', 'Restore')}
      </Button>
    </div>
  )
}

export function WikiReader({
  target,
  slug,
  pages
}: {
  target: WikiTarget
  slug: string
  pages: readonly WikiPageSummary[]
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const read = useWikiPage(target, slug)
  const [editing, setEditing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const page = read.data

  if (!page) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        {read.error ? (
          <>
            <p>{read.error}</p>
            <Button
              variant="outline"
              onClick={() => showWikiCenter({ kind: 'new', title: slug.replace(/-/g, ' ') })}
            >
              {t('orcaFork.wiki.createThisPage', 'Create this page')}
            </Button>
          </>
        ) : (
          <p>{t('orcaFork.wiki.loading', 'Loading…')}</p>
        )}
      </div>
    )
  }

  const openLink = (link: { slug: string; title: string }) => {
    showWikiCenter(
      pages.some((entry) => entry.slug === link.slug)
        ? { kind: 'page', slug: link.slug }
        : { kind: 'new', title: link.title || link.slug }
    )
  }
  const trashed = page.deletedAt !== null
  const trash = async () => {
    try {
      await writeWiki(target, 'trash', { page: page.id })
      toast.success(
        t('orcaFork.wiki.movedToTrash', 'Moved "{{title}}" to the trash', { title: page.title })
      )
      showWikiCenter({ kind: 'home' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 xl:flex-row">
      <article className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">
            {page.folder ? page.folder.split('/').join(' / ') : t('orcaFork.wiki.title', 'Wiki')}
          </span>
          {!editing && !trashed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('orcaFork.wiki.copyLink', 'Copy [[link]]')}
                    onClick={() => {
                      void navigator.clipboard.writeText(`[[${page.title}]]`)
                      toast.success(
                        t('orcaFork.wiki.linkCopied', 'Copied [[{{title}}]]', { title: page.title })
                      )
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  {t('orcaFork.wiki.copyLink', 'Copy [[link]]')}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('orcaFork.wiki.history', 'History')}
                    onClick={() => setHistoryOpen(true)}
                  >
                    <Clock className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  {t('orcaFork.wiki.history', 'History')}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('orcaFork.wiki.moveToTrash', 'Move to trash')}
                    onClick={() => void trash()}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  {t('orcaFork.wiki.moveToTrash', 'Move to trash')}
                </TooltipContent>
              </Tooltip>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                {t('orcaFork.wiki.edit', 'Edit')}
              </Button>
            </>
          ) : null}
        </div>
        {trashed ? <TrashedBanner target={target} page={page} /> : null}
        {editing ? (
          <WikiEditor
            target={target}
            page={page}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              setEditing(false)
              read.reload()
              if (saved.slug !== slug) {
                showWikiCenter({ kind: 'page', slug: saved.slug })
              }
            }}
          />
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <WikiActorAvatar actor={page.updatedBy} hostId={target.hostId} />
                {t('orcaFork.wiki.editedBy', 'Edited {{when}} by {{who}} · v{{version}}', {
                  when: wikiWhen(page.updatedAt),
                  who: actorName(page.updatedBy),
                  version: page.version
                })}
              </button>
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {t('orcaFork.wiki.views', '{{count}} views', {
                  count: page.viewCount,
                  defaultValue_one: '{{count}} view'
                })}
              </span>
              {page.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setWikiTag(tag)
                    showWikiCenter({ kind: 'home' })
                  }}
                  className="rounded-full border border-border px-2 py-0.5 text-2xs hover:bg-accent hover:text-foreground"
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div className="mt-2 max-w-3xl pb-10">
              {page.body.trim() ? (
                <WikiMarkdown body={page.body} onOpenLink={openLink} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('orcaFork.wiki.emptyPage', 'This page is empty.')}
                </p>
              )}
            </div>
          </>
        )}
      </article>
      {!editing ? (
        <aside className="flex w-full shrink-0 flex-col gap-6 pb-10 xl:w-64 xl:pt-9">
          <AsideBlock title={t('orcaFork.wiki.readBy', 'Read by')} count={page.viewCount}>
            <Viewers target={target} page={page} />
          </AsideBlock>
          <AsideBlock
            title={t('orcaFork.wiki.mentionedIn', 'Mentioned in')}
            count={page.backlinks.length}
          >
            <Backlinks target={target} page={page} />
          </AsideBlock>
          <AsideBlock title={t('orcaFork.wiki.history', 'History')}>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="text-left text-xs text-muted-foreground hover:text-foreground"
            >
              {t('orcaFork.wiki.allVersions', 'All {{count}} versions', {
                count: page.version,
                defaultValue_one: '{{count}} version'
              })}
            </button>
          </AsideBlock>
        </aside>
      ) : null}
      <WikiHistoryDialog
        target={target}
        page={page}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  )
}
