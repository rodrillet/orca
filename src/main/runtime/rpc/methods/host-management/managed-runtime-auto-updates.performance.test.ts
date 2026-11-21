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
  update.mockImplementationOnce(
    (signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
  )
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
      for (let index = 0; index < count; index += 1) {
        publish({ disabledTuiAgents: ['kimi'] })
        publish({ agentCmdOverrides: {} })
        settings = { disabledTuiAgents: [] }
        publish({ disabledTuiAgents: [] })
        settings = { disabledTuiAgents: ['kimi'] }
        publish({ disabledTuiAgents: ['kimi'] })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      }
      expect(update).toHaveBeenCalledTimes(1)
    }
    expect(update.mock.calls[0]?.[0]?.aborted).toBe(true)
    vi.setSystemTime(Date.now() + 600_001)
    settings = { disabledTuiAgents: [] }
    publish({ disabledTuiAgents: [] })
    expect(update).toHaveBeenCalledTimes(2)
  } finally {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    await rm(host.dataDirectory, { recursive: true, force: true })
  }
})

it.each([false, true])(
  'bounds completed use triggers after startup succeeded=%s',
  async (succeeded) => {
    vi.resetModules()
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { startManagedRuntimeAutoUpdates: start } =
        await import('./managed-runtime-auto-updates')
      const { managedAgentCommand, rememberManagedAgentRelease } =
        await import('../../../../managed-agent-cli/managed-agent-cli-registry')
      const update = vi.fn(async (_signal?: AbortSignal) => {})
      if (!succeeded) {
        update.mockRejectedValueOnce(new Error('offline'))
      }
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: scheduler calls only updateIfBehind on its registered installation.
      const installations = new Map([
        ['cli:kimi', { updateIfBehind: update }]
      ]) as unknown as Parameters<typeof start>[1]
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: this scheduler run only reads settings; the change subscription is optional.
      const store = { getSettings: () => ({ disabledTuiAgents: [] }) } as unknown as Parameters<
        typeof start
      >[0]
      start(store, installations)
      await vi.advanceTimersByTimeAsync(120_000)
      rememberManagedAgentRelease('kimi', join(tmpdir(), 'orca-scheduler-kimi'))
      for (const count of [10, 100]) {
        for (let index = 0; index < count; index += 1) {
          managedAgentCommand('kimi')
          await vi.advanceTimersByTimeAsync(0)
        }
        expect(update).toHaveBeenCalledTimes(succeeded ? 1 : 2)
      }
      vi.setSystemTime(Date.now() + 600_001)
      managedAgentCommand('kimi')
      await vi.advanceTimersByTimeAsync(0)
      expect(update).toHaveBeenCalledTimes(succeeded ? 2 : 3)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
      warn.mockRestore()
    }
  }
)
