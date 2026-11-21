// orca-fork: the Wiki page's left column parts: which computer keeps the wiki, and its rows.
import React from 'react'
import { Server } from 'lucide-react'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import {
  getLocalExecutionHostLabel,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'

/** Which machine keeps this workspace's wiki. */
export function WikiMachineLabel({
  hostId,
  routable
}: {
  hostId: ExecutionHostId
  routable: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const label = useAppStore((state) =>
    hostId === LOCAL_EXECUTION_HOST_ID
      ? getLocalExecutionHostLabel()
      : selectExecutionHostDisplayLabel(state, hostId)
  )
  return (
    <p
      className="flex items-center gap-1.5 px-2 text-2xs text-muted-foreground"
      title={t(
        'orcaFork.wiki.hostHint',
        'Each computer keeps its own wiki. Agents on it write there; others reach it with --environment.'
      )}
    >
      <Server className="size-3.5 shrink-0" />
      <span className="truncate">
        {routable
          ? t('orcaFork.wiki.keptOn', 'Kept on {{host}}', { host: label })
          : t('orcaFork.wiki.sshHost', '{{host}} has no Orca runtime to keep a wiki', {
              host: label
            })}
      </span>
    </p>
  )
}

export function NavRow({
  icon,
  label,
  count,
  current,
  onClick
}: {
  icon: React.ReactNode
  label: string
  count?: number
  current: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      data-current={current ? 'true' : undefined}
      aria-current={current ? 'page' : undefined}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] hover:bg-accent data-[current=true]:bg-accent data-[current=true]:font-medium"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 ? (
        <span className="text-2xs tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </button>
  )
}
