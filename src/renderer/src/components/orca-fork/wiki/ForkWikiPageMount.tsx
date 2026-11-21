// orca-fork: the Wiki page over the main area while open. Going anywhere else closes it: a sidebar row
// here, another page or workspace in ../page-switch.
import React, { Suspense, useEffect } from 'react'
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
