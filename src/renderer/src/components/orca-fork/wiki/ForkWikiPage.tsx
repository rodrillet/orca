// orca-fork: the active workspace's Wiki, as agentes.chat's: pages, search and tags on the left; the
// home, a page, a new page or the trash in the middle. It lives on the workspace's machine, so the
// agents there (and on any paired machine, with --environment) read and write the same pages.
import React, { useMemo, useState } from 'react'
import { FileText, Home, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useWikiList } from './wiki-rpc'
import { closeWikiPage, setWikiTag, showWikiCenter, useWikiViewState } from './wiki-view-state'
import { WikiReader } from './WikiReader'
import { WikiEditor } from './WikiEditor'
import { WikiTrash } from './WikiTrash'
import { WikiHome } from './WikiHome'
import { groupByFolder, NavRow, WikiMachineLabel } from './WikiNavParts'
import { useActiveWikiTarget } from './use-active-wiki-target'

export function ForkWikiPage(): React.JSX.Element {
  const t = useTranslate()
  const view = useWikiViewState()
  const active = useActiveWikiTarget()
  const target = active.target
  const hostId = target.hostId
  const list = useWikiList(active.routable ? target : null)
  const [query, setQuery] = useState('')
  const pages = useMemo(() => list.data?.pages ?? [], [list.data])
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return pages.filter(
      (page) =>
        (!view.tag || page.tags.includes(view.tag)) &&
        words.every((word) =>
          `${page.title} ${page.folder} ${page.tags.join(' ')} ${page.excerpt}`
            .toLowerCase()
            .includes(word)
        )
    )
  }, [pages, query, view.tag])
  const folders = useMemo(() => groupByFolder(shown), [shown])
  const center = view.center
  const currentSlug = center.kind === 'page' ? center.slug : null

  let main: React.ReactNode
  if (center.kind === 'page') {
    main = (
      <WikiReader
        key={`${hostId}|${center.slug}`}
        target={target}
        slug={center.slug}
        pages={pages}
      />
    )
  } else if (center.kind === 'new') {
    main = (
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('orcaFork.wiki.newPage', 'New page')}
        </h1>
        <WikiEditor
          key={`new|${center.title}`}
          target={target}
          page={null}
          initialTitle={center.title}
          onCancel={() => showWikiCenter({ kind: 'home' })}
          onSaved={(page) => showWikiCenter({ kind: 'page', slug: page.slug })}
        />
      </div>
    )
  } else if (center.kind === 'trash') {
    main = <WikiTrash target={target} />
  } else {
    main = (
      <WikiHome
        pages={pages}
        shown={shown}
        tag={view.tag}
        query={query}
        hostId={hostId}
        loading={list.loading && !list.data}
        error={list.error}
      />
    )
  }

  return (
    <div className="absolute inset-0 z-[5] flex min-h-0 bg-background" data-testid="orca-fork-wiki">
      <nav className="flex w-64 shrink-0 flex-col gap-2 border-r border-border px-2 pt-2 pb-2">
        <div className="flex items-center gap-1 px-1">
          <h2 className="flex-1 text-base font-semibold tracking-tight">
            {t('orcaFork.wiki.title', 'Wiki')}
          </h2>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('orcaFork.wiki.newPage', 'New page')}
            onClick={() => showWikiCenter({ kind: 'new', title: '' })}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('orcaFork.wiki.close', 'Close wiki')}
            onClick={closeWikiPage}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="px-1">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (center.kind !== 'home') {
                showWikiCenter({ kind: 'home' })
              }
            }}
            placeholder={t('orcaFork.wiki.search', 'Search the wiki')}
            aria-label={t('orcaFork.wiki.search', 'Search the wiki')}
          />
        </div>
        <div className="flex flex-col gap-0.5 px-1">
          <NavRow
            icon={<Home className="size-4 text-muted-foreground" />}
            label={t('orcaFork.wiki.home', 'Home')}
            current={center.kind === 'home' && !view.tag}
            onClick={() => {
              setWikiTag(null)
              showWikiCenter({ kind: 'home' })
            }}
          />
          <NavRow
            icon={<Trash2 className="size-4 text-muted-foreground" />}
            label={t('orcaFork.wiki.trash', 'Trash')}
            count={list.data?.trashCount}
            current={center.kind === 'trash'}
            onClick={() => showWikiCenter({ kind: 'trash' })}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 scrollbar-sleek">
          {list.data && list.data.tags.length > 0 ? (
            <section className="flex flex-col gap-1">
              <h3 className="px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('orcaFork.wiki.tags', 'Tags')}
              </h3>
              <div className="flex flex-wrap gap-1 px-1">
                {list.data.tags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={view.tag === tag}
                    onClick={() => {
                      setWikiTag(view.tag === tag ? null : tag)
                      showWikiCenter({ kind: 'home' })
                    }}
                    className={cn(
                      'rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground',
                      view.tag === tag && 'bg-accent text-foreground'
                    )}
                  >
                    #{tag} <span className="tabular-nums">{count}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {folders.map(([folder, list]) => (
            <section key={folder || '/'} className="flex flex-col gap-0.5">
              <h3 className="px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {folder || t('orcaFork.wiki.pages', 'Pages')}
              </h3>
              {list.map((page) => (
                <NavRow
                  key={page.id}
                  icon={<FileText className="size-3.5 shrink-0 text-muted-foreground" />}
                  label={page.title}
                  current={page.slug === currentSlug}
                  onClick={() => showWikiCenter({ kind: 'page', slug: page.slug })}
                />
              ))}
            </section>
          ))}
        </div>
        <WikiMachineLabel hostId={hostId} routable={active.routable} />
      </nav>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-6 scrollbar-sleek">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">{main}</div>
      </main>
    </div>
  )
}

export default ForkWikiPage
