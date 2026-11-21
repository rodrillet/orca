// orca-fork: opens the Agent Dashboard drawer on the bots board (the Tasks Agents view's "Board").
import { useAppStore } from '@/store'
import { updateAgentsBoardPrefs } from './agents-board-prefs'

export function openAgentsBoard(): void {
  const state = useAppStore.getState()
  updateAgentsBoardPrefs({ view: 'bots' })
  if (state.settings?.experimentalAgentDashboardPopout !== true) {
    void state.updateSettings({ experimentalAgentDashboardPopout: true })
  }
  // The drawer lives beside the workspace sidebar, so leave the Tasks page for it.
  state.closeTaskPage()
  state.setSidebarOpen(true)
  state.setAgentDashboardDrawerOpen(true)
}
