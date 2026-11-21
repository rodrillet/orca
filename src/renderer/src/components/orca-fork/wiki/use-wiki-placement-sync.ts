// orca-fork: keeps every reachable machine told which workspace its bots and projects are in, so an
// agent's `orca wiki` opens its own workspace's wiki without flags. A stock server refuses; it then
// keeps every agent on its home workspace's wiki.
import { useEffect, useSyncExternalStore } from 'react'
import { botHostTarget } from '@/lib/bot-hosts'
import { readLiveBotHostIds, subscribeToBotChanges } from '@/lib/bot-catalog-snapshot'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import { wikiPlacementByHost } from '../../../../../shared/orca-fork/wiki/wiki-placement'
import { forkWorkspacesStore, useForkWorkspaces } from '../workspaces/fork-workspaces-store'

const sent = new Map<string, string>()

export function useWikiPlacementSync(): void {
  const doc = useForkWorkspaces()
  const ready = forkWorkspacesStore.useReady()
  const live = useSyncExternalStore(subscribeToBotChanges, readLiveBotHostIds)
  useEffect(() => {
    if (!FORK_FEATURES.workspaceWiki || !ready) {
      return
    }
    for (const [hostId, placement] of wikiPlacementByHost(doc)) {
      const reachable =
        hostId === LOCAL_EXECUTION_HOST_ID ||
        (hostId.startsWith('runtime:') && live.includes(hostId))
      const body = JSON.stringify(placement)
      if (!reachable || sent.get(hostId) === body) {
        continue
      }
      sent.set(hostId, body)
      void callRuntimeRpc(botHostTarget(hostId), 'orcaFork.wiki.setPlacement', placement).catch(
        () => sent.delete(hostId)
      )
    }
  }, [doc, ready, live])
}
