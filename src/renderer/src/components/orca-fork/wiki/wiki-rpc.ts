// orca-fork: the Wiki page's reads and writes, on the host that keeps the workspace's wiki.
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { botHostTarget } from '@/lib/bot-hosts'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type {
  WikiActivityResult,
  WikiHistoryResult,
  WikiListResult,
  WikiPage,
  WikiPageSummary
} from '../../../../../shared/orca-fork/wiki/wiki-types'

export type WikiTarget = { hostId: ExecutionHostId; workspaceId: string }

/** Agents write while the page is open: re-read on this beat and when the window comes back. */
const REFRESH_MS = 8_000

let revision = 0
const revisionListeners = new Set<() => void>()

/** After a write here, every open read re-reads at once. */
function bumpRevision(): void {
  revision += 1
  revisionListeners.forEach((listener) => listener())
}

export function callWiki<T>(
  target: WikiTarget,
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  return callRuntimeRpc<T>(botHostTarget(target.hostId), `orcaFork.wiki.${method}`, {
    workspaceId: target.workspaceId,
    ...params
  })
}

export async function writeWiki<T>(
  target: WikiTarget,
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const result = await callWiki<T>(target, method, params)
  bumpRevision()
  return result
}

function needTarget(target: WikiTarget | null): WikiTarget {
  if (!target) {
    throw new Error('No wiki host')
  }
  return target
}

type Read<T> = { data: T | null; error: string | null; loading: boolean; reload: () => void }

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** A read that re-runs on its key, on writes, on window focus and on a slow beat. */
function useWikiRead<T>(key: string | null, read: () => Promise<T>): Read<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const runRead = useEffectEvent(read)
  const keyRef = useRef(key)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key
      setData(null)
      setError(null)
    }
    if (key === null) {
      return
    }
    let live = true
    setLoading(true)
    runRead()
      .then((value) => {
        if (live) {
          setData(value)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (live) {
          setError(errorText(caught))
        }
      })
      .finally(() => {
        if (live) {
          setLoading(false)
        }
      })
    return () => {
      live = false
    }
  }, [key, tick])

  useEffect(() => {
    if (key === null) {
      return
    }
    // Re-reads on a beat while the window shows, and stops while it is hidden.
    let timer: number | undefined
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          reload()
          schedule()
        }
      }, REFRESH_MS)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        reload()
        schedule()
      }
    }
    schedule()
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    revisionListeners.add(reload)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
      revisionListeners.delete(reload)
    }
  }, [key, reload])

  return { data, error, loading, reload }
}

export function useWikiList(target: WikiTarget | null, trash = false): Read<WikiListResult> {
  const key = target ? `${target.hostId}|${target.workspaceId}|${trash}` : null
  return useWikiRead(key, () =>
    callWiki<WikiListResult>(needTarget(target), 'list', trash ? { trash: true } : {})
  )
}

/** The open page; its first read counts as the owner's view, later re-reads don't. */
export function useWikiPage(target: WikiTarget | null, slug: string | null): Read<WikiPage> {
  const key = target && slug ? `${target.hostId}|${target.workspaceId}|${slug}` : null
  const viewed = useRef<string | null>(null)
  return useWikiRead(key, () => {
    const view = viewed.current !== key
    viewed.current = key
    return callWiki<WikiPage>(needTarget(target), 'show', {
      page: slug,
      ...(view ? { view: true } : {})
    })
  })
}

export function useWikiHistory(
  target: WikiTarget | null,
  slug: string | null
): Read<WikiHistoryResult> {
  const key = target && slug ? `${target.hostId}|${target.workspaceId}|${slug}|history` : null
  return useWikiRead(key, () =>
    callWiki<WikiHistoryResult>(needTarget(target), 'history', { page: slug })
  )
}

export type WikiActivityQuery = { actorKey?: string; page?: string; limit?: number }

/** The consultation log; an older orca-server answers method_not_found, which reads as `error`. */
export function useWikiActivity(
  target: WikiTarget | null,
  query: WikiActivityQuery = {}
): Read<WikiActivityResult> {
  const key = target
    ? `${target.hostId}|${target.workspaceId}|activity|${query.actorKey ?? ''}|${query.page ?? ''}|${query.limit ?? ''}`
    : null
  return useWikiRead(key, () =>
    callWiki<WikiActivityResult>(needTarget(target), 'activity', {
      ...(query.actorKey ? { actorKey: query.actorKey } : {}),
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {})
    })
  )
}

export type { WikiPageSummary }
