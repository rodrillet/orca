// orca-fork: Group by Machine for the workspace sidebar, reusing upstream's per-host sections.
import React from 'react'
import { Server } from 'lucide-react'
import { FilterToggleRow } from '@/components/sidebar/worktree-list/controls/FilterToggleRow'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import {
  editBotOrganization,
  readBotOrganization,
  useBotOrganization
} from './bot-organization-store'

export function useWorkspacesByMachine(): boolean {
  const doc = useBotOrganization()
  return FORK_FEATURES.workspacesGroupByMachine && doc.view.workspacesByMachine
}

export function readWorkspacesByMachine(): boolean {
  return FORK_FEATURES.workspacesGroupByMachine && readBotOrganization().view.workspacesByMachine
}

export function ForkWorkspacesByMachineToggle(): React.JSX.Element | null {
  const t = useTranslate()
  const byMachine = useWorkspacesByMachine()
  if (!FORK_FEATURES.workspacesGroupByMachine) {
    return null
  }
  return (
    <div className="pt-1">
      <FilterToggleRow
        icon={<Server className="size-3.5" />}
        label={t('orcaFork.workspaces.groupByMachine', 'Group by machine')}
        ariaLabel={t(
          'orcaFork.workspaces.groupByMachineAria',
          'List workspaces under this Mac and each paired server'
        )}
        checked={byMachine}
        onChange={(next) => editBotOrganization(botOrganizationEdits.setWorkspacesByMachine(next))}
      />
    </div>
  )
}
