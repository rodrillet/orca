// orca-fork: one wiki page, as agentes.chat's: path and actions, the title, a line with who edited it,
// how often agents consult it, its pin and tags; the text; then "About the page". Edit swaps in the editor.
import React, { useState } from 'react'
import { toast } from 'sonner'
import { ArchiveRestore, Clock, Copy, Eye, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import {
  wikiActorKey,
  type WikiPage,
  type WikiPageSummary
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import { useWikiPage, writeWiki, type WikiTarget } from './wiki-rpc'
import { WikiMarkdown } from './WikiMarkdown'
import { WikiEditor } from './WikiEditor'
import { WikiHistoryDialog } from './WikiHistoryDialog'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'
import { setWikiTag, showWikiCenter } from './wiki-view-state'
import { WikiPageAbout } from './WikiPageAbout'

function IconAction({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
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

  const pin = async () => {
    try {
      await writeWiki(target, 'pin', { page: page.id, pinned: !page.pinned })
      read.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }
  const parts = page.folder ? page.folder.split('/') : []
  const readers = page.viewers.filter((viewer) => viewer.actor.kind !== 'owner')

  return (
    <div className="flex flex-1 flex-col">
      <article className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => showWikiCenter({ kind: 'home' })}
            >
              {t('orcaFork.wiki.title', 'Wiki')}
            </button>
            {parts.map((part, index) => (
              <React.Fragment key={parts.slice(0, index + 1).join('/')}>
                <span aria-hidden>/</span>
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
          </span>
          {!editing && !trashed ? (
            <>
              <IconAction
                label={t('orcaFork.wiki.copyLink', 'Copy [[link]]')}
                onClick={() => {
                  void navigator.clipboard.writeText(`[[${page.title}]]`)
                  toast.success(
                    t('orcaFork.wiki.linkCopied', 'Copied [[{{title}}]]', { title: page.title })
                  )
                }}
              >
                <Copy className="size-4" />
              </IconAction>
              <IconAction
                label={
                  page.pinned
                    ? t('orcaFork.wiki.unpin', 'Unpin')
                    : t('orcaFork.wiki.pin', 'Pin to the top')
                }
                onClick={() => void pin()}
              >
                {page.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </IconAction>
              <IconAction
                label={t('orcaFork.wiki.history', 'History')}
                onClick={() => setHistoryOpen(true)}
              >
                <Clock className="size-4" />
              </IconAction>
              <IconAction
                label={t('orcaFork.wiki.moveToTrash', 'Move to trash')}
                onClick={() => void trash()}
              >
                <Trash2 className="size-4" />
              </IconAction>
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
            <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
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
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById('wiki-page-about')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 hover:bg-accent hover:text-foreground"
                title={t('orcaFork.wiki.usedBy', 'Agents that use this page')}
              >
                {readers.length > 0 ? (
                  <span className="flex -space-x-1.5">
                    {readers.slice(0, 3).map((viewer) => (
                      <WikiActorAvatar
                        key={wikiActorKey(viewer.actor)}
                        actor={viewer.actor}
                        hostId={target.hostId}
                        className="size-4 ring-2 ring-background"
                      />
                    ))}
                  </span>
                ) : (
                  <Eye className="size-3.5" />
                )}
                {t('orcaFork.wiki.consultationCount', '{{count}} consultations', {
                  count: page.viewCount,
                  defaultValue_one: '{{count}} consultation'
                })}
              </button>
              {page.pinned ? (
                <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                  <Pin className="size-3" />
                  {t('orcaFork.wiki.pinnedChip', 'Pinned')}
                </span>
              ) : null}
              {page.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setWikiTag(tag)
                    showWikiCenter({ kind: 'home' })
                  }}
                  className="text-2xs hover:text-foreground"
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div className="mt-3 max-w-3xl pb-10">
              {page.body.trim() ? (
                <WikiMarkdown body={page.body} onOpenLink={openLink} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('orcaFork.wiki.emptyPage', 'This page is empty.')}
                </p>
              )}
            </div>
            <WikiPageAbout target={target} page={page} onHistory={() => setHistoryOpen(true)} />
          </>
        )}
      </article>
      <WikiHistoryDialog
        target={target}
        page={page}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  )
}
