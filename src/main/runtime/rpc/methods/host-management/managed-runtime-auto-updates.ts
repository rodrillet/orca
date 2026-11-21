import type { RuntimeStore } from '../../../construction/runtime-store-contract'
import type { ManagedRuntimeInstallation } from '../../../../node-runtime/managed-runtime-installation'
import { isTuiAgent } from '../../../../../shared/agent-launch/catalog/tui-agent-config'
import { isTuiAgentEnabled } from '../../../../../shared/agent-launch/catalog/tui-agent-selection'
import {
  isManagedAgentCli,
  onManagedAgentUse
} from '../../../../managed-agent-cli/managed-agent-cli-registry'
import { managedCopyMayRun } from './managed-copy-detection'

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
  let settings = store.getSettings()
  const checks = new Map<string, AbortController>()
  const startupFailures = new Set<string>()
  function enabled(key: string, value: typeof settings): boolean {
    const agent = key.slice(key.indexOf(':') + 1)
    return (
      (!isTuiAgent(agent) || isTuiAgentEnabled(agent, value.disabledTuiAgents)) &&
      (!key.startsWith('cli:') ||
        !isManagedAgentCli(agent) ||
        managedCopyMayRun(agent, { requireStore: () => ({ getSettings: () => value }) }))
    )
  }
  function checkForUpdate(key: string, trigger: 'startup' | 'use' | 'enable'): void {
    const now = Date.now()
    if (
      !enabled(key, settings) ||
      checks.has(key) ||
      (!(trigger === 'use' && startupFailures.has(key)) &&
        now - (lastUseCheck.get(key) ?? -Infinity) < AUTO_UPDATE_USE_THROTTLE_MS)
    ) {
      return
    }
    const installation = installations.get(key)
    if (!installation) {
      return
    }
    const controller = new AbortController()
    checks.set(key, controller)
    startupFailures.delete(key)
    lastUseCheck.set(key, now)
    void installation
      .updateIfBehind(controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          if (trigger === 'startup') {
            startupFailures.add(key)
          }
          console.warn(`[managed-runtime] ${key} update check failed:`, error)
        }
      })
      .finally(() => checks.delete(key))
  }
  store.onSettingsChanged?.((updates, next) => {
    if (!('disabledTuiAgents' in updates) && !('antigravityManagedAgyEnabled' in updates)) {
      return
    }
    const previous = settings
    settings = next
    for (const key of installations.keys()) {
      if (!enabled(key, settings)) {
        checks.get(key)?.abort()
      } else if (!enabled(key, previous)) {
        checkForUpdate(key, 'enable')
      }
    }
  })
  // Wait out startup so the first check never competes with launching the app.
  setTimeout(() => {
    for (const key of installations.keys()) {
      checkForUpdate(key, 'startup')
    }
  }, AUTO_UPDATE_FIRST_CHECK_MS).unref()
  // Use is the signal a copy matters; the release lookup itself is cached for an hour.
  onManagedAgentUse((agent) => {
    checkForUpdate(`cli:${agent}`, 'use')
  })
}
