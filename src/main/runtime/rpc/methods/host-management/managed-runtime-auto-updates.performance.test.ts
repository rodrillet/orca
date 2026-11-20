import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { ManagedRuntimeInstallation } from '../../../../node-runtime/managed-runtime-installation'
import {
  reclaimManagedRuntimeReleasesAtLaunch,
  startManagedRuntimeAutoUpdates
} from './managed-runtime-install'

const host = vi.hoisted(() => ({ dataDirectory: '' }))
vi.mock('../../../../orca-profiles/profile-storage-paths', () => ({
  getProfileUserDataPath: () => host.dataDirectory
}))

it('only checks the agent being re-enabled across repeated unrelated settings writes', async () => {
  host.dataDirectory = await mkdtemp(join(tmpdir(), 'orca-runtime-updates-'))
  vi.useFakeTimers()
  const update = vi
    .spyOn(ManagedRuntimeInstallation.prototype, 'updateIfBehind')
    .mockResolvedValue()
  let settings = { disabledTuiAgents: ['kimi'] }
  const listeners = new Set<(updates: Record<string, unknown>, value: typeof settings) => void>()
  const store = {
    getSettings: () => settings,
    onSettingsChanged: (
      listener: (updates: Record<string, unknown>, value: typeof settings) => void
    ) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: update scheduling only reads this store.
  const runtime = { requireStore: () => store } as unknown as Parameters<
    typeof startManagedRuntimeAutoUpdates
  >[0]
  const publish = (updates: Record<string, unknown>) =>
    listeners.forEach((listener) => listener(updates, settings))
  try {
    reclaimManagedRuntimeReleasesAtLaunch(runtime)
    startManagedRuntimeAutoUpdates(runtime)
    for (const count of [10, 100]) {
      update.mockClear()
      for (let index = 0; index < count; index += 1) {
        publish({ disabledTuiAgents: ['kimi'] })
        publish({ agentCmdOverrides: {} })
      }
      expect(update).toHaveBeenCalledTimes(0)
      settings = { disabledTuiAgents: [] }
      publish({ disabledTuiAgents: [] })
      expect(update).toHaveBeenCalledTimes(1)
      settings = { disabledTuiAgents: ['kimi'] }
      publish({ disabledTuiAgents: ['kimi'] })
      expect(update).toHaveBeenCalledTimes(1)
    }
  } finally {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    await rm(host.dataDirectory, { recursive: true, force: true })
  }
})
