// orca-fork: the Drive page's small pieces of state: its workspace, layout, computers and keys.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveHostState } from './drive-host-data'
import type { DriveLayout } from './drive-view-model'
import type { DriveMachine } from './ForkDriveToolbar'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'

/** The fork workspace the Drive shows; none (every file) until the active-workspace store lands. */
export function useDriveWorkspaceId(): DriveWorkspaceId | null {
  return null
}

const LAYOUT_KEY = 'orca-fork.drive.layout'

function readLayout(): DriveLayout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function useDriveLayout(): [DriveLayout, (next: DriveLayout) => void] {
  const [layout, setLayoutState] = useState<DriveLayout>(readLayout)
  const setLayout = useCallback((next: DriveLayout) => {
    setLayoutState(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // A per-viewer convenience: the layout just isn't remembered.
    }
  }, [])
  return [layout, setLayout]
}

const SEPARATOR = '\u0000'

export function useDriveMachines(
  hosts: readonly { hostId: ExecutionHostId; state: DriveHostState }[]
) {
  const t = useTranslate()
  // Joined into one string so the selector stays stable between renders.
  const joinedLabels = useAppStore((state) =>
    hosts.map((host) => selectExecutionHostDisplayLabel(state, host.hostId, { t })).join(SEPARATOR)
  )
  return useMemo(() => {
    const labels = joinedLabels ? joinedLabels.split(SEPARATOR) : []
    const byId = new Map<string, string>(
      hosts.map((host, index) => [host.hostId, labels[index] || host.hostId])
    )
    const states = new Map<string, DriveHostState>(hosts.map((host) => [host.hostId, host.state]))
    const listed: DriveMachine[] = hosts.map((host) => ({
      key: host.hostId,
      label: byId.get(host.hostId) ?? host.hostId
    }))
    return {
      listed,
      uploadable: listed.filter((host) => states.get(host.key) === 'ready'),
      multiple: hosts.length > 1,
      labelOf: (hostId: string): string => byId.get(hostId) ?? hostId
    }
  }, [joinedLabels, hosts])
}

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

/** "/" searches, ⌘A selects what is shown, Esc clears the selection. */
export function useDriveKeys({
  onSelectAll,
  onClear
}: {
  onSelectAll: () => void
  onClear: () => void
}): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || document.querySelector('[role="dialog"], [role="menu"]')) {
        return
      }
      if (event.key === 'Escape' && !typing(event.target)) {
        onClear()
        return
      }
      if (typing(event.target) || event.altKey) {
        return
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        const search = document.querySelector<HTMLInputElement>('[data-fork-drive-search]')
        if (search) {
          event.preventDefault()
          search.focus()
        }
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        onSelectAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSelectAll, onClear])
}
