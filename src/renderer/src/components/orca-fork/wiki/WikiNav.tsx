// orca-fork: the Wiki's left column, as agentes.chat's: Home, Consultations, Agents and Trash; the
// pinned pages; every page in a tree of spaces and sections; and the tags.
import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Eye,
  FileText,
  Folder,
  Pin,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type {
  WikiListResult,
  WikiPageSummary
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import { closeWikiPage, setWikiTag, showWikiCenter, useWikiViewState } from './wiki-view-state'
import { buildWikiTree, folderAncestors, type WikiFolderNode } from './wiki-tree'
import { NavRow, WikiMachineLabel } from './WikiNavParts'
import type { WikiTarget } from './wiki-rpc'

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 className="px-2 pt-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

function PageRow({
  page,
  current,
  depth
}: {
  page: WikiPageSummary
  current: boolean
  depth: number
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => showWikiCenter({ kind: 'page', slug: page.slug })}
      data-current={current ? 'true' : undefined}
      aria-current={current ? 'page' : undefined}
      style={{ paddingLeft: 8 + depth * 14 }}
      className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-[13px] hover:bg-accent data-[current=true]:bg-accent data-[current=true]:font-medium"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{page.title}</span>
      {page.pinned ? <Pin className="size-3 shrink-0 text-muted-foreground" /> : null}
    </button>
  )
}

function FolderBranch({
  node,
  depth,
  open,
  toggle,
  currentSlug,
  currentFolder
}: {
  node: WikiFolderNode
  depth: number
  open: ReadonlySet<string>
  toggle: (path: string) => void
  currentSlug: string | null
  currentFolder: string | null
}): React.JSX.Element {
  const expanded = open.has(node.path)
  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="group flex items-center rounded-md hover:bg-accent data-[current=true]:bg-accent"
        data-current={currentFolder === node.path ? 'true' : undefined}
        style={{ paddingLeft: depth * 14 }}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={node.name}
          onClick={() => toggle(node.path)}
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
        >
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!expanded) {
              toggle(node.path)
            }
            showWikiCenter({ kind: 'folder', folder: node.path })
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left text-[13px]"
        >
          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
          <span className="text-2xs tabular-nums text-muted-foreground">{node.count}</span>
        </button>
      </div>
      {expanded ? (
        <TreeChildren
          node={node}
          depth={depth + 1}
          open={open}
          toggle={toggle}
          currentSlug={currentSlug}
          currentFolder={currentFolder}
        />
      ) : null}
    </div>
  )
}

function TreeChildren(props: {
  node: WikiFolderNode
  depth: number
  open: ReadonlySet<string>
  toggle: (path: string) => void
  currentSlug: string | null
  currentFolder: string | null
}): React.JSX.Element {
  const { node, depth, currentSlug } = props
  return (
    <>
      {node.folders.map((child) => (
        <FolderBranch key={child.path} {...props} node={child} />
      ))}
      {node.pages.map((page) => (
        <PageRow key={page.id} page={page} depth={depth} current={page.slug === currentSlug} />
      ))}
    </>
  )
}

export function WikiNav({
  target,
  routable,
  list,
  pages,
  shown,
  query,
  onQuery
}: {
  target: WikiTarget
  routable: boolean
  list: WikiListResult | null
  pages: readonly WikiPageSummary[]
  shown: readonly WikiPageSummary[]
  query: string
  onQuery: (query: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const view = useWikiViewState()
  const center = view.center
  const currentSlug = center.kind === 'page' ? center.slug : null
  const currentFolder = center.kind === 'folder' ? center.folder : null
  const tree = useMemo(() => buildWikiTree(pages), [pages])
  const pinned = useMemo(() => pages.filter((page) => page.pinned), [pages])
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())
  const currentPageFolder = pages.find((page) => page.slug === currentSlug)?.folder ?? null

  // The open page's folders unfold, so it shows where it sits.
  useEffect(() => {
    if (currentPageFolder) {
      setOpen((before) => new Set([...before, ...folderAncestors(currentPageFolder)]))
    }
  }, [currentPageFolder])

  const toggle = (path: string) =>
    setOpen((before) => {
      const next = new Set(before)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  const filtering = Boolean(query.trim() || view.tag)

  return (
    <nav className="flex w-64 shrink-0 flex-col gap-2 border-r border-border px-2 pt-2 pb-2">
      <div className="flex items-center gap-1 px-1">
        <h2 className="flex-1 text-base font-semibold tracking-tight">
          {t('orcaFork.wiki.title', 'Wiki')}
        </h2>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('orcaFork.wiki.newPage', 'New page')}
          onClick={() =>
            showWikiCenter({ kind: 'new', title: currentFolder ? `${currentFolder}/` : '' })
          }
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
            onQuery(event.target.value)
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
          icon={<BookOpen className="size-4 text-muted-foreground" />}
          label={t('orcaFork.wiki.home', 'Home')}
          current={center.kind === 'home' && !view.tag}
          onClick={() => {
            setWikiTag(null)
            showWikiCenter({ kind: 'home' })
          }}
        />
        <NavRow
          icon={<Eye className="size-4 text-muted-foreground" />}
          label={t('orcaFork.wiki.consultations', 'Consultations')}
          current={center.kind === 'consultations'}
          onClick={() => showWikiCenter({ kind: 'consultations' })}
        />
        <NavRow
          icon={<Users className="size-4 text-muted-foreground" />}
          label={t('orcaFork.wiki.readers', 'Agents')}
          current={center.kind === 'readers'}
          onClick={() => showWikiCenter({ kind: 'readers', actorKey: null })}
        />
        <NavRow
          icon={<Trash2 className="size-4 text-muted-foreground" />}
          label={t('orcaFork.wiki.trash', 'Trash')}
          count={list?.trashCount}
          current={center.kind === 'trash'}
          onClick={() => showWikiCenter({ kind: 'trash' })}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 scrollbar-sleek">
        {pinned.length > 0 && !filtering ? (
          <section className="flex flex-col gap-0.5">
            <SectionLabel>{t('orcaFork.wiki.pinned', 'Pinned')}</SectionLabel>
            {pinned.map((page) => (
              <PageRow key={page.id} page={page} depth={0} current={page.slug === currentSlug} />
            ))}
          </section>
        ) : null}
        <section className="flex flex-col gap-0.5">
          <SectionLabel>
            {filtering
              ? t('orcaFork.wiki.results', '{{count}} results', {
                  count: shown.length,
                  defaultValue_one: '{{count}} result'
                })
              : t('orcaFork.wiki.pages', 'Pages')}
          </SectionLabel>
          {filtering ? (
            shown.map((page) => (
              <PageRow key={page.id} page={page} depth={0} current={page.slug === currentSlug} />
            ))
          ) : (
            <TreeChildren
              node={tree}
              depth={0}
              open={open}
              toggle={toggle}
              currentSlug={currentSlug}
              currentFolder={currentFolder}
            />
          )}
        </section>
        {list && list.tags.length > 0 ? (
          <section className="flex flex-col gap-1">
            <SectionLabel>{t('orcaFork.wiki.tags', 'Tags')}</SectionLabel>
            <div className="flex flex-wrap gap-1 px-1">
              {list.tags.map(({ tag, count }) => (
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
      </div>
      <WikiMachineLabel hostId={target.hostId} routable={routable} />
    </nav>
  )
}
