import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { installForkPageSwitch, type PageSwitchNav } from './fork-page-switch'

function overlay(initial = false) {
  let open = initial
  const listeners = new Set<() => void>()
  const set = (next: boolean): void => {
    open = next
    listeners.forEach((listener) => listener())
  }
  return {
    isOpen: () => open,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close: () => set(false),
    set
  }
}

function setup() {
  const store = createStore<PageSwitchNav>()((set) => ({
    activeView: 'terminal',
    activeWorktreeId: 'w1',
    agentDashboardDrawerOpen: false,
    setAgentDashboardDrawerOpen: (open) => set({ agentDashboardDrawerOpen: open })
  }))
  const wiki = overlay()
  const drive = overlay()
  const root = new EventTarget()
  const uninstall = installForkPageSwitch({ store, wiki, drive, root })
  return { store, wiki, drive, root, uninstall }
}

describe('installForkPageSwitch', () => {
  it('closes the Wiki and the Agents board on any page switch, even a batched there-and-back', () => {
    const { store, wiki } = setup()
    wiki.set(true)
    store.setState({ activeView: 'settings' })
    store.setState({ activeView: 'terminal' })
    expect(wiki.isOpen()).toBe(false)

    store.getState().setAgentDashboardDrawerOpen(true)
    store.setState({ activeView: 'tasks' })
    expect(store.getState().agentDashboardDrawerOpen).toBe(false)
  })

  it('keeps one overlay: opening the Wiki closes the board and the reverse', () => {
    const { store, wiki } = setup()
    store.getState().setAgentDashboardDrawerOpen(true)
    wiki.set(true)
    expect(store.getState().agentDashboardDrawerOpen).toBe(false)

    store.getState().setAgentDashboardDrawerOpen(true)
    expect(wiki.isOpen()).toBe(false)
    expect(store.getState().agentDashboardDrawerOpen).toBe(true)
  })

  it('closes both when the Drive opens in the Artifacts slot already on screen', () => {
    const { store, wiki, drive } = setup()
    store.setState({ activeView: 'artifacts' })
    wiki.set(true)
    drive.set(true)
    expect(wiki.isOpen()).toBe(false)
    store.getState().setAgentDashboardDrawerOpen(true)
    drive.set(false)
    expect(store.getState().agentDashboardDrawerOpen).toBe(false)
  })

  it('stops listening once uninstalled', () => {
    const { store, wiki, uninstall } = setup()
    uninstall()
    wiki.set(true)
    store.setState({ activeView: 'settings' })
    expect(wiki.isOpen()).toBe(true)
  })
})
