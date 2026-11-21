// orca-fork: polls this computer and every paired server while the resource monitor is open.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { readMachineResources, type MachineResourcesResult } from './machine-resources-read'

const POLL_MS = 3_000
export const LOCAL_MACHINE_KEY = 'local'

export type MachineEntry = {
  key: string
  /** Null for this computer: its label comes from the host's own name. */
  name: string | null
  target: RuntimeClientTarget
  result: MachineResourcesResult | null
}

export function useMachineResources(open: boolean): {
  machines: MachineEntry[]
  refresh: () => void
} {
  const environments = useAppStore((s) => s.runtimeEnvironments)
  const targets = useMemo(
    () => [
      { key: LOCAL_MACHINE_KEY, name: null, target: { kind: 'local' } as RuntimeClientTarget },
      ...environments.map((environment) => ({
        key: environment.id,
        name: environment.name || environment.id,
        target: { kind: 'environment', environmentId: environment.id } as RuntimeClientTarget
      }))
    ],
    [environments]
  )
  const [results, setResults] = useState<Record<string, MachineResourcesResult>>({})
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    const inFlight = new Set<string>()
    const poll = (): void => {
      for (const { key, target } of targets) {
        // A slow server must not stack requests or hold up another machine's sample.
        if (inFlight.has(key)) {
          continue
        }
        inFlight.add(key)
        void readMachineResources(target).then((result) => {
          inFlight.delete(key)
          if (!cancelled) {
            setResults((prev) => ({ ...prev, [key]: result }))
          }
        })
      }
    }
    poll()
    const timer = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, targets, tick])

  const machines = useMemo(
    () => targets.map((t) => ({ ...t, result: results[t.key] ?? null })),
    [targets, results]
  )
  return { machines, refresh }
}
