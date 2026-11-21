// orca-fork: one resource sample per machine, shared by every bot surface that shows it (settings,
// row hover, cards), read only while one of them is on screen.
import { useEffect, useSyncExternalStore } from 'react'
import { botHostTarget } from '@/lib/bot-hosts'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import {
  readMachineResources,
  type MachineResourcesResult
} from '../resource-monitor/machine-resources-read'

const POLL_MS = 5_000

type HostPoll = {
  result: MachineResourcesResult | null
  watchers: number
  listeners: Set<() => void>
  stop: (() => void) | null
  inFlight: boolean
}

const polls = new Map<ExecutionHostId, HostPoll>()

function pollOf(hostId: ExecutionHostId): HostPoll {
  let poll = polls.get(hostId)
  if (!poll) {
    poll = { result: null, watchers: 0, listeners: new Set(), stop: null, inFlight: false }
    polls.set(hostId, poll)
  }
  return poll
}

function sample(hostId: ExecutionHostId, poll: HostPoll): void {
  // A slow server must not stack requests.
  if (poll.inFlight) {
    return
  }
  poll.inFlight = true
  void readMachineResources(botHostTarget(hostId)).then((result) => {
    poll.inFlight = false
    poll.result = result
    poll.listeners.forEach((listener) => listener())
  })
}

function watch(hostId: ExecutionHostId): () => void {
  const poll = pollOf(hostId)
  poll.watchers += 1
  if (poll.watchers === 1) {
    sample(hostId, poll)
    poll.stop = installWindowVisibilityInterval({
      run: () => sample(hostId, poll),
      intervalMs: POLL_MS
    })
  }
  return () => {
    poll.watchers -= 1
    if (poll.watchers === 0) {
      poll.stop?.()
      poll.stop = null
    }
  }
}

/** The machine's latest sample; null until the first one lands or while `hostId` is null. */
export function useHostResources(hostId: ExecutionHostId | null): MachineResourcesResult | null {
  useEffect(() => (hostId ? watch(hostId) : undefined), [hostId])
  return useSyncExternalStore(
    (listener) => {
      if (!hostId) {
        return () => undefined
      }
      const poll = pollOf(hostId)
      poll.listeners.add(listener)
      return () => poll.listeners.delete(listener)
    },
    () => (hostId ? (polls.get(hostId)?.result ?? null) : null)
  )
}
