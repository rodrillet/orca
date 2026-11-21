// orca-fork: the Department page over the main area while open (going anywhere else closes it, like the
// Wiki), and the department defaults that follow each organization edit, installed once.
import React, { Suspense, useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { RecoverableRenderErrorBoundary } from '@/components/error-boundaries/RecoverableRenderErrorBoundary'
import { lazyWithRetry } from '@/app-shell/startup/lazy-with-retry'
import { closeDepartmentPage, useDepartmentPageOpen } from './department-page-state'
import { closeWikiPage, isWikiPageOpen, subscribeWikiView } from '../wiki/wiki-view-state'
import { isForkDriveOpen, subscribeForkDrive } from '../drive/drive-page-state'
import { installDepartmentInheritance } from './department-apply'

const ForkDepartmentPage = lazyWithRetry(() => import('./ForkDepartmentPage'))

const SIDEBAR = '[data-sidebar-content-shell]'
const ACTIONS = 'button, a, [role="button"], [role="treeitem"], [role="option"], [role="row"]'

export function ForkDepartmentPageMount(): React.JSX.Element | null {
  const t = useTranslate()
  const open = useDepartmentPageOpen()
  const activeView = useAppStore((s) => s.activeView)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const seen = useRef({ activeView, activeWorktreeId })

  useEffect(() => installDepartmentInheritance(), [])

  // One full page at a time (see page-switch): opening this one closes the Wiki and the Agents board,
  // and opening either of those, or the Drive, closes this one.
  useEffect(() => {
    if (!open) {
      return
    }
    closeWikiPage()
    useAppStore.getState().setAgentDashboardDrawerOpen(false)
    const offWiki = subscribeWikiView(() => isWikiPageOpen() && closeDepartmentPage())
    const offDrive = subscribeForkDrive(() => isForkDriveOpen() && closeDepartmentPage())
    const offStore = useAppStore.subscribe((state, previous) => {
      if (state.agentDashboardDrawerOpen && !previous.agentDashboardDrawerOpen) {
        closeDepartmentPage()
      }
    })
    return () => {
      offWiki()
      offDrive()
      offStore()
    }
  }, [open])

  useEffect(() => {
    const before = seen.current
    seen.current = { activeView, activeWorktreeId }
    if (before.activeView !== activeView || before.activeWorktreeId !== activeWorktreeId) {
      closeDepartmentPage()
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
        !element.closest('[data-fork-department-nav]')
      ) {
        closeDepartmentPage()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [open])

  return open ? (
    <RecoverableRenderErrorBoundary
      boundaryId="orca-fork.departments"
      surface="page"
      resetKey="departments"
      title={t('orcaFork.departments.crashed', 'The department page hit an error.')}
      description={t('orcaFork.departments.crashedHint', 'Retry, or close it and open it again.')}
    >
      <Suspense fallback={null}>
        <ForkDepartmentPage />
      </Suspense>
    </RecoverableRenderErrorBoundary>
  ) : null
}
