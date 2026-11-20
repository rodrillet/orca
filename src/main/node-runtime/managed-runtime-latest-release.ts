import type { ManagedRuntime, ManagedRuntimePin } from './managed-runtime-release'
import { PromiseSettlementWaiters } from '../../shared/concurrency/promise-settlement-waiters'

const REFRESH_MS = 60 * 60_000

export type HourlyLookup<T> = {
  /** The last value a lookup answered, or undefined before one has. */
  latest: () => T | undefined
  fresh: () => boolean
  /** Look up again when the last answer is over an hour old, joining a lookup in flight. */
  refresh: (signal?: AbortSignal) => Promise<void>
}

/** A failed lookup keeps the last known value and is retried on the next refresh. */
export function hourlyLookup<T>(
  fetchLatest: (signal?: AbortSignal) => Promise<T>
): HourlyLookup<T> {
  let latest: { value: T; at: number } | null = null
  let lookup: { controller: AbortController; waiters: PromiseSettlementWaiters<void> } | null = null
  const fresh = () => latest !== null && Date.now() - latest.at < REFRESH_MS
  return {
    latest: () => latest?.value,
    fresh,
    refresh: async (signal) => {
      signal?.throwIfAborted()
      if (fresh()) {
        return
      }
      if (!lookup) {
        const controller = new AbortController()
        const promise = fetchLatest(controller.signal).then((value) => {
          controller.signal.throwIfAborted()
          latest = { value, at: Date.now() }
        })
        const waiters = new PromiseSettlementWaiters<void>(promise, () => {
          if (lookup?.waiters === waiters) {
            lookup = null
          }
        })
        lookup = { controller, waiters }
      }
      const current = lookup
      await current.waiters.wait({
        signal,
        onAbandon: () => {
          if (current.waiters.waiterCount === 0) {
            if (lookup === current) {
              lookup = null
            }
            current.controller.abort()
          }
        }
      })
    }
  }
}

/** Follow a published latest release, looked up at most hourly; a failed lookup keeps the last known release. */
export function followLatestRelease(
  fetchLatest: (signal?: AbortSignal) => Promise<ManagedRuntimePin | null>
): Required<Pick<ManagedRuntime, 'pin' | 'refreshPin' | 'available'>> {
  const release = hourlyLookup(fetchLatest)
  return {
    pin: () => release.latest() ?? null,
    available: () => release.latest() !== null || !release.fresh(),
    refreshPin: release.refresh
  }
}
