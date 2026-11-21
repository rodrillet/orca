// orca-fork: "Move to…" in a bot (or bot group) row's menu: its department or section, or none.
import React from 'react'
import { FolderInput, FolderPlus } from 'lucide-react'
import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  botOrganizationEdits,
  type BotOrganization,
  type BotOrganizationPlacement
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization, useBotOrganization } from './bot-organization-store'
import { newOrganizationId } from './bot-organization-rename'

const UNPLACED = ''

function placementValue(placement: BotOrganizationPlacement | undefined): string {
  return placement ? `${placement.departmentId}/${placement.sectionId ?? ''}` : UNPLACED
}

function readPlacementValue(value: string): BotOrganizationPlacement | null {
  if (value === UNPLACED) {
    return null
  }
  const [departmentId = '', sectionId = ''] = value.split('/')
  return { departmentId, sectionId: sectionId || null }
}

/** Moving shows the result: the Bots list switches to Departments if it was grouped otherwise. */
function showDepartments(doc: BotOrganization): BotOrganization {
  return doc.view.groupBy === 'organization'
    ? doc
    : botOrganizationEdits.setGroupBy('organization')(doc)
}

export function ForkBotMoveToMenu({ entryKey }: { entryKey: string }): React.JSX.Element | null {
  const t = useTranslate()
  const doc = useBotOrganization()
  if (!FORK_FEATURES.botMoveToMenu) {
    return null
  }
  const move = (target: BotOrganizationPlacement | null): void =>
    editBotOrganization((current) =>
      showDepartments(botOrganizationEdits.place(entryKey, target)(current))
    )
  const moveToNewDepartment = (): void => {
    const departmentId = newOrganizationId()
    const name = t('orcaFork.botOrganization.newDepartmentName', 'New department')
    editBotOrganization((current) =>
      showDepartments(
        botOrganizationEdits.place(entryKey, { departmentId, sectionId: null })(
          botOrganizationEdits.addDepartment(departmentId, name)(current)
        )
      )
    )
  }
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <FolderInput className="size-3.5" />
        {t('orcaFork.botOrganization.moveTo', 'Move to…')}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-48">
        <ContextMenuRadioGroup
          value={placementValue(doc.placements[entryKey])}
          onValueChange={(value) => move(readPlacementValue(value))}
        >
          <ContextMenuRadioItem value={UNPLACED}>
            {t('orcaFork.botOrganization.unassigned', 'No department')}
          </ContextMenuRadioItem>
          {doc.departments.map((dept) => (
            <React.Fragment key={dept.id}>
              <ContextMenuRadioItem value={`${dept.id}/`}>{dept.name}</ContextMenuRadioItem>
              {dept.sections.map((section) => (
                <ContextMenuRadioItem key={section.id} value={`${dept.id}/${section.id}`}>
                  <span className="pl-3">{section.name}</span>
                </ContextMenuRadioItem>
              ))}
            </React.Fragment>
          ))}
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={moveToNewDepartment}>
          <FolderPlus className="size-3.5" />
          {t('orcaFork.botOrganization.moveToNewDepartment', 'New department')}
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
