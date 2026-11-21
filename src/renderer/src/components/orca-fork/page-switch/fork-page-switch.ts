// orca-fork: one full page at a time. The Wiki and the Agents board sit over the main area outside
// upstream's activeView, so every page switch closes whichever of them it would leave on top.

export type PageSwitchNav = {
  activeView: string
  activeWorktreeId: string | null
  agentDashboardDrawerOpen: boolean
  setAgentDashboardDrawerOpen: (open: boolean) => void
}

export type PageSwitchStore = {
  getState: () => PageSwitchNav
  subscribe: (listener: (state: PageSwitchNav, previous: PageSwitchNav) => void) => () => void
}

/** An overlay page kept outside the app store. */
export type PageSwitchOverlay = {
  isOpen: () => boolean
  subscribe: (listener: () => void) => () => void
}

export type PageSwitchInput = {
  store: PageSwitchStore
  wiki: PageSwitchOverlay & { close: () => void }
  /** The Drive shares the Artifacts slot, so opening it there changes no view. */
  drive: PageSwitchOverlay
  /** Clicks in the sidebar's page navigation; absent outside a window. */
  root?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
}

export const PAGE_NAV_SELECTOR = '[data-fork-page-nav]'
const WIKI_ENTRY_SELECTOR = '[data-fork-wiki-nav]'
const BOARD_ENTRY_SELECTOR = '[data-contextual-tour-target="agents-sidebar"]'

type Keep = 'wiki' | 'board' | null

export function installForkPageSwitch({ store, wiki, drive, root }: PageSwitchInput): () => void {
  const closeOverlays = (keep: Keep): void => {
    if (keep !== 'wiki' && wiki.isOpen()) {
      wiki.close()
    }
    const nav = store.getState()
    if (keep !== 'board' && nav.agentDashboardDrawerOpen) {
      nav.setAgentDashboardDrawerOpen(false)
    }
  }

  // Synchronous on every store write, so a quick there-and-back that React batches still counts.
  const offStore = store.subscribe((state, previous) => {
    if (state.activeView !== previous.activeView) {
      closeOverlays(null)
      return
    }
    if (state.activeWorktreeId !== previous.activeWorktreeId && wiki.isOpen()) {
      wiki.close()
    }
    if (state.agentDashboardDrawerOpen && !previous.agentDashboardDrawerOpen) {
      closeOverlays('board')
    }
  })

  let wikiWasOpen = wiki.isOpen()
  const offWiki = wiki.subscribe(() => {
    const open = wiki.isOpen()
    if (open && !wikiWasOpen) {
      closeOverlays('wiki')
    }
    wikiWasOpen = open
  })

  let driveWasOpen = drive.isOpen()
  const offDrive = drive.subscribe(() => {
    const open = drive.isOpen()
    if (open !== driveWasOpen) {
      closeOverlays(null)
    }
    driveWasOpen = open
  })

  // A page entry picked again (Tasks while on Tasks under the board) changes no state but means "show it".
  const onClick = (event: Event): void => {
    const element = event.target instanceof Element ? event.target : null
    const entry = element?.closest('button, a, [role="button"]')
    if (!entry?.closest(PAGE_NAV_SELECTOR)) {
      return
    }
    closeOverlays(
      entry.closest(WIKI_ENTRY_SELECTOR)
        ? 'wiki'
        : entry.closest(BOARD_ENTRY_SELECTOR)
          ? 'board'
          : null
    )
  }
  root?.addEventListener('click', onClick, true)

  return () => {
    offStore()
    offWiki()
    offDrive()
    root?.removeEventListener('click', onClick, true)
  }
}
