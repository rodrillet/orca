import type { ManagedRuntimeInstallState } from '../../shared/agent-launch/installation/managed-runtime-install'
import type { ManagedRuntime } from './managed-runtime-release'
import { resolveInstalledRuntimeRelease } from './managed-runtime-release'
import type { ManagedRuntimeInstallationDeps } from './managed-runtime-installation'

export type InstalledFacts = Omit<
  ManagedRuntimeInstallState,
  'agent' | 'program' | 'revision' | 'operation'
>

export async function readManagedRuntimeInstallFacts(
  runtime: ManagedRuntime,
  root: string,
  deps: Pick<
    ManagedRuntimeInstallationDeps,
    'available' | 'findExternal' | 'onRelease' | 'updatesEnabled'
  >
): Promise<InstalledFacts> {
  const pin = runtime.pin()
  const { release, broken, unreadable } = resolveInstalledRuntimeRelease(root, pin)
  const installedCurrent = release !== null && (pin === null || release.current)
  // Unknown siblings cannot hide a validated copy before the latest release is known.
  if (unreadable && !installedCurrent) {
    throw new Error(`Couldn't read the installed ${runtime.label} files on this host.`)
  }
  deps.onRelease?.(release?.folder ?? null)
  const source = (await deps.findExternal()) ? 'external' : release ? 'managed' : null
  return {
    available:
      (deps.available?.() ?? true) &&
      (runtime.available?.() ?? (pin !== null || runtime.refreshPin !== undefined)),
    version: pin?.version ?? null,
    ...(pin && { downloadBytes: pin.archiveBytes }),
    installedVersion: release?.version ?? null,
    installedCurrent,
    ...(pin && !release?.current && broken.includes(pin.version) && { damaged: true }),
    canRemove: release !== null || broken.length > 0,
    source,
    // A copy Orca isn't keeping current offers its own Update.
    ...(runtime.refreshPin &&
      deps.updatesEnabled?.() !== false && { updatesAutomatically: true as const })
  }
}
