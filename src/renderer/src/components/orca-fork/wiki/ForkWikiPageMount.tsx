// orca-fork: the Wiki page over the main area while open. Going anywhere else (a sidebar row, another
// page, another workspace) closes it, as switching pages would.
import React, { Suspense, useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { RecoverableRenderErrorBoundary } from '@/components/error-boundaries/RecoverableRenderErrorBoundary'
import { closeWikiPage, useWikiPageOpen } from './wiki-view-state'
import { lazyWithRetry } from '@/app-shell/startup/lazy-with-retry'

const ForkWikiPage = lazyWithRetry(() => import('./ForkWikiPage'))

const SIDEBAR = '[data-sidebar-content-shell]'
const ACTIONS = 'button, a, [role="button"], [role="treeitem"], [role="option"], [role="row"]'

export function ForkWikiPageMount(): React.JSX.Element | null {
  const t = useTranslate()
  const open = useWikiPageOpen()
  const activeView = useAppStore((s) => s.activeView)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const seen = useRef({ activeView, activeWorktreeId })

  useEffect(() => {
    const before = seen.current
    seen.current = { activeView, activeWorktreeId }
    if (before.activeView !== activeView || before.activeWorktreeId !== activeWorktreeId) {
      closeWikiPage()
    }
  }, [activeView, activeWorktreeId])

  useEffect(() => {
    if (!open) {
      return
    }
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null
      if (
        element?.closest(SIDEBAR) &&
        element.closest(ACTIONS) &&
        !element.closest('[data-fork-wiki-nav]')
      ) {
        closeWikiPage()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [open])

  return open ? (
    <RecoverableRenderErrorBoundary
      boundaryId="orca-fork.wiki"
      surface="page"
      resetKey="wiki"
      title={t('orcaFork.wiki.crashed', 'The wiki hit an error.')}
      description={t('orcaFork.wiki.crashedHint', 'Retry, or close the wiki and open it again.')}
    >
      <Suspense fallback={null}>
        <ForkWikiPage />
      </Suspense>
    </RecoverableRenderErrorBoundary>
  ) : null
}
