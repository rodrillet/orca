// orca-fork: Bot options' "Group by: None · Machine · Organization" and "New department".
import React from 'react'
import { FolderPlus, Network } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { OptionChoiceSubmenu } from '@/components/sidebar/worktree-list/controls/OptionChoiceSubmenu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  botOrganizationEdits,
  type BotSidebarGroupBy
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization, useBotOrganization } from './bot-organization-store'
import { addBotDepartment } from './ForkBotOrganizationHeaderRow'
import { openDepartmentPage } from '../departments/department-page-state'

export function ForkBotGroupByMenuItems(): React.JSX.Element | null {
  const t = useTranslate()
  const doc = useBotOrganization()
  if (!FORK_FEATURES.botOrganization) {
    return null
  }
  const choices: { id: BotSidebarGroupBy; label: string; description: string | null }[] = [
    { id: 'none', label: t('orcaFork.botOrganization.groupNone', 'None'), description: null },
    {
      id: 'machine',
      label: t('orcaFork.botOrganization.groupMachine', 'Machine'),
      description: t(
        'orcaFork.botOrganization.groupMachineDescription',
        'This Mac and each paired server.'
      )
    },
    {
      id: 'organization',
      label: t('orcaFork.botOrganization.groupOrganization', 'Departments'),
      description: t(
        'orcaFork.botOrganization.groupOrganizationDescription',
        'Departments and sections. Drag bots between them.'
      )
    }
  ]
  return (
    <>
      <OptionChoiceSubmenu
        label={t('orcaFork.botOrganization.groupBy', 'Group by')}
        choices={choices}
        value={doc.view.groupBy}
        onChange={(groupBy) => editBotOrganization(botOrganizationEdits.setGroupBy(groupBy))}
      />
      {doc.view.groupBy === 'organization' ? (
        <DropdownMenuItem
          onSelect={() =>
            addBotDepartment(t('orcaFork.botOrganization.newDepartmentName', 'New department'))
          }
        >
          <FolderPlus className="size-3.5" />
          {t('orcaFork.botOrganization.newDepartment', 'New department')}
        </DropdownMenuItem>
      ) : null}
      {FORK_FEATURES.departmentManagement ? (
        <DropdownMenuItem onSelect={() => openDepartmentPage(null)}>
          <Network className="size-3.5" />
          {t('orcaFork.departments.manage', 'Manage departments')}
        </DropdownMenuItem>
      ) : null}
    </>
  )
}
