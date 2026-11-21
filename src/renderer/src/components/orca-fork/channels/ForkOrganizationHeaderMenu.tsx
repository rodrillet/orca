// orca-fork: right click on a department, section or machine header in the Bots list: the header's
// own actions (open the department, new section, rename, delete) and the sidebar's New entries.
import React from 'react'
import { FolderPlus, Network, Pencil, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  botOrganizationEdits,
  type BotOrganizationHeader
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from '../organization/bot-organization-store'
import { openDepartmentPage } from '../departments/department-page-state'
import { ForkSidebarCreateMenuItems } from './ForkSidebarCreateMenuItems'

export function ForkOrganizationHeaderMenu({
  header,
  onRename,
  onAddSection,
  children
}: {
  header: BotOrganizationHeader
  onRename: () => void
  onAddSection: () => void
  children: React.ReactElement
}): React.JSX.Element {
  const t = useTranslate()
  if (!FORK_FEATURES.chatStructure) {
    return children
  }
  const target = header.target
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {target ? (
          <>
            {FORK_FEATURES.departmentManagement ? (
              <ContextMenuItem onSelect={() => openDepartmentPage(target.departmentId)}>
                <Network className="size-3.5" />
                {t('orcaFork.departments.open', 'Open department')}
              </ContextMenuItem>
            ) : null}
            {header.level === 0 ? (
              <ContextMenuItem onSelect={onAddSection}>
                <FolderPlus className="size-3.5" />
                {t('orcaFork.botOrganization.newSection', 'New section')}
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem onSelect={onRename}>
              <Pencil className="size-3.5" />
              {t('orcaFork.botOrganization.rename', 'Rename')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ForkSidebarCreateMenuItems menu="context" />
        {target ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => editBotOrganization(botOrganizationEdits.remove(target))}
            >
              <Trash2 className="size-3.5" />
              {header.level === 0
                ? t('orcaFork.botOrganization.deleteDepartment', 'Delete department')
                : t('orcaFork.botOrganization.deleteSection', 'Delete section')}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}
