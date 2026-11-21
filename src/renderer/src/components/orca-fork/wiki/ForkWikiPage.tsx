// orca-fork: the active workspace's Wiki, as agentes.chat's: home, consultations, agents and trash with
// a tree of spaces and pages on the left; the home, a folder, a page, the logs or the trash in the middle.
// It lives on the workspace's machine, so its agents (and others, with --environment) share the pages.
import React, { useMemo, useState } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { activeForkWorkspace } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { useWikiList } from './wiki-rpc'
import { showWikiCenter, useWikiViewState } from './wiki-view-state'
import { WikiReader } from './WikiReader'
import { WikiEditor } from './WikiEditor'
import { WikiTrash } from './WikiTrash'
import { WikiFolderView, WikiHome } from './WikiHome'
import { WikiNav } from './WikiNav'
import { WikiConsultationsView, WikiReadersView } from './WikiActivityViews'
import { useActiveWikiTarget } from './use-active-wiki-target'

export function ForkWikiPage(): React.JSX.Element {
  const t = useTranslate()
  const view = useWikiViewState()
  const active = useActiveWikiTarget()
  const workspaceName = activeForkWorkspace(useForkWorkspaces()).name
  const target = active.target
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
  const center = view.center

  let main: React.ReactNode
  switch (center.kind) {
    case 'page':
      main = (
        <WikiReader
          key={`${target.hostId}|${center.slug}`}
          target={target}
          slug={center.slug}
          pages={pages}
        />
      )
      break
    case 'new':
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
      break
    case 'trash':
      main = <WikiTrash target={target} />
      break
    case 'folder':
      main = <WikiFolderView target={target} folder={center.folder} pages={pages} />
      break
    case 'consultations':
      main = <WikiConsultationsView target={target} />
      break
    case 'readers':
      main = <WikiReadersView target={target} actorKey={center.actorKey} />
      break
    case 'home':
      main = (
        <WikiHome
          target={target}
          workspaceName={workspaceName}
          pages={pages}
          shown={shown}
          tag={view.tag}
          query={query}
          loading={list.loading && !list.data}
          error={list.error}
        />
      )
  }

  return (
    <div className="absolute inset-0 z-[5] flex min-h-0 bg-background" data-testid="orca-fork-wiki">
      <WikiNav
        target={target}
        routable={active.routable}
        list={list.data}
        pages={pages}
        shown={shown}
        query={query}
        onQuery={setQuery}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-6 scrollbar-sleek">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">{main}</div>
      </main>
    </div>
  )
}

export default ForkWikiPage
