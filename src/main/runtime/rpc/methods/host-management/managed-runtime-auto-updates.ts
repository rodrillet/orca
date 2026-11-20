import type { RuntimeStore } from '../../../construction/runtime-store-contract'
import type { ManagedRuntimeInstallation } from '../../../../node-runtime/managed-runtime-installation'
import { isTuiAgent } from '../../../../../shared/agent-launch/catalog/tui-agent-config'
import { isTuiAgentEnabled } from '../../../../../shared/agent-launch/catalog/tui-agent-selection'
import { onManagedAgentUse } from '../../../../managed-agent-cli/managed-agent-cli-registry'

const AUTO_UPDATE_FIRST_CHECK_MS = 2 * 60_000
const AUTO_UPDATE_USE_THROTTLE_MS = 10 * 60_000
let autoUpdatesStarted = false
const lastUseCheck = new Map<string, number>()

/** Keep Orca's own copies current without a client ever prompting: once after launch, then as they're used. */
export function startManagedRuntimeAutoUpdates(
  store: RuntimeStore,
  installations: ReadonlyMap<string, ManagedRuntimeInstallation>
): void {
  if (autoUpdatesStarted) {
    return
  }
  autoUpdatesStarted = true
  let disabled = store.getSettings().disabledTuiAgents
  const checks = new Map<string, AbortController>()
  function checkForUpdate(key: string): void {
    const agent = key.slice(key.indexOf(':') + 1)
    const now = Date.now()
    if (
      (isTuiAgent(agent) && !isTuiAgentEnabled(agent, disabled)) ||
      checks.has(key) ||
      now - (lastUseCheck.get(key) ?? -Infinity) < AUTO_UPDATE_USE_THROTTLE_MS
    ) {
      return
    }
    const installation = installations.get(key)
    if (!installation) {
      return
    }
    const controller = new AbortController()
    checks.set(key, controller)
    lastUseCheck.set(key, now)
    void installation
      .updateIfBehind(controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn(`[managed-runtime] ${key} update check failed:`, error)
        }
      })
      .finally(() => checks.delete(key))
  }
  store.onSettingsChanged?.((updates, settings) => {
    if (!('disabledTuiAgents' in updates)) {
      return
    }
    const previous = disabled
    disabled = settings.disabledTuiAgents
    for (const key of installations.keys()) {
      const agent = key.slice(key.indexOf(':') + 1)
      if (isTuiAgent(agent)) {
        if (!isTuiAgentEnabled(agent, disabled)) {
          checks.get(key)?.abort()
        } else if (!isTuiAgentEnabled(agent, previous)) {
          checkForUpdate(key)
        }
      }
    }
  })
  // Wait out startup so the first check never competes with launching the app.
  setTimeout(() => {
    for (const key of installations.keys()) {
      checkForUpdate(key)
    }
  }, AUTO_UPDATE_FIRST_CHECK_MS).unref()
  // Use is the signal a copy matters; the release lookup itself is cached for an hour.
  onManagedAgentUse((agent) => {
    checkForUpdate(`cli:${agent}`)
  })
}
