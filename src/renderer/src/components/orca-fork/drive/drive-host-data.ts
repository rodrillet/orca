// orca-fork: the Drive of every computer that runs bots (this one and each paired server), read
// together so the page shows one Drive across machines.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { botHostTarget, listBotHosts } from '@/lib/bot-hosts'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { RuntimeRpcCallError } from '@/runtime/rpc/calls/runtime-rpc-result'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import type {
  DriveFile,
  DriveFolder,
  DriveListResult,
  DriveWorkspaceId
} from '../../../../../shared/orca-fork/drive/drive-types'

export type DriveEntry = DriveFile & { hostId: ExecutionHostId }
export type DriveFolderEntry = DriveFolder & { hostId: ExecutionHostId }

/** `unsupported`: a stock orca-server, which has no Drive. */
export type DriveHostState = 'loading' | 'ready' | 'unsupported' | 'failed'

export type DriveData = {
  files: DriveEntry[]
  folders: DriveFolderEntry[]
  hosts: { hostId: ExecutionHostId; state: DriveHostState }[]
  loaded: boolean
  refresh: () => void
}

const POLL_MS = 15_000

/** A call's workspace, when the page has one; without one the host answers for all of them. */
export function driveScope(workspaceId: DriveWorkspaceId | null): {
  workspaceId?: DriveWorkspaceId
} {
  return workspaceId ? { workspaceId } : {}
}

export function callDrive<T>(hostId: ExecutionHostId, method: string, params: unknown): Promise<T> {
  return callRuntimeRpc<T>(botHostTarget(hostId), `orcaFork.drive.${method}`, params)
}

/** This computer first, then each connected paired server. */
export function driveHostIds(): ExecutionHostId[] {
  const ids = listBotHosts().map((host) => host.hostId)
  return [LOCAL_EXECUTION_HOST_ID, ...ids.filter((id) => id !== LOCAL_EXECUTION_HOST_ID)]
}

function isUnsupported(error: unknown): boolean {
  return error instanceof RuntimeRpcCallError && error.code === 'method_not_found'
}

type HostRead = {
  state: DriveHostState
  files: DriveEntry[]
  folders: DriveFolderEntry[]
}

export function useDriveData(workspaceId: DriveWorkspaceId | null): DriveData {
  const [reads, setReads] = useState<Map<ExecutionHostId, HostRead>>(() => new Map())
  const [loaded, setLoaded] = useState(false)
  const generation = useRef(0)

  const refresh = useCallback(() => {
    const current = ++generation.current
    const hostIds = driveHostIds()
    void Promise.all(
      hostIds.map(async (hostId): Promise<[ExecutionHostId, HostRead]> => {
        try {
          const result = await callDrive<DriveListResult>(hostId, 'list', driveScope(workspaceId))
          return [
            hostId,
            {
              state: 'ready',
              files: result.files.map((file) => ({ ...file, hostId })),
              folders: result.folders.map((folder) => ({ ...folder, hostId }))
            }
          ]
        } catch (error) {
          if (!isUnsupported(error)) {
            console.error('[orca-fork drive] could not read the Drive of', hostId, error)
          }
          return [
            hostId,
            { state: isUnsupported(error) ? 'unsupported' : 'failed', files: [], folders: [] }
          ]
        }
      })
    ).then((entries) => {
      if (current !== generation.current) {
        return
      }
      setReads((previous) => {
        const next = new Map<ExecutionHostId, HostRead>()
        for (const [hostId, read] of entries) {
          // A failed re-read keeps what the host showed last.
          const last = previous.get(hostId)
          next.set(hostId, read.state === 'failed' && last ? { ...last, state: 'failed' } : read)
        }
        return next
      })
      setLoaded(true)
    })
  }, [workspaceId])

  useEffect(() => {
    refresh()
    const stop = installWindowVisibilityInterval({
      run: refresh,
      intervalMs: POLL_MS,
      slowWhileUnfocused: true
    })
    const onFocus = (): void => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      stop()
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return useMemo(() => {
    const files: DriveEntry[] = []
    const folders: DriveFolderEntry[] = []
    const hosts: DriveData['hosts'] = []
    for (const [hostId, read] of reads) {
      files.push(...read.files)
      folders.push(...read.folders)
      hosts.push({ hostId, state: read.state })
    }
    return { files, folders, hosts, loaded, refresh }
  }, [reads, loaded, refresh])
}
