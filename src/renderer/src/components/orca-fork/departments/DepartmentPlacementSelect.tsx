// orca-fork: every department and section of the workspace in one select, for "Move to".
import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslate } from '@/i18n/use-translate'
import type { BotOrganizationPlacement } from '../../../../../shared/orca-fork/organization/bot-organization'
import type { DepartmentWorld } from './use-department-world'

const NONE = '__none__'

function placementValue(placement: BotOrganizationPlacement | null): string {
  return placement ? `${placement.departmentId}/${placement.sectionId ?? ''}` : NONE
}

function readPlacement(value: string): BotOrganizationPlacement | null {
  if (value === NONE) {
    return null
  }
  const [departmentId = '', sectionId = ''] = value.split('/')
  return { departmentId, sectionId: sectionId || null }
}

/** Every department and section of the workspace, for "Move to". */
export function PlacementSelect({
  world,
  value,
  onChange,
  placeholder,
  className
}: {
  world: DepartmentWorld
  value: BotOrganizationPlacement | null | undefined
  onChange: (target: BotOrganizationPlacement | null) => void
  placeholder?: string
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <Select
      value={value === undefined ? '' : placementValue(value)}
      onValueChange={(next) => onChange(readPlacement(next))}
    >
      <SelectTrigger size="sm" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {world.departments
          .filter((dept) => !dept.profile.archived)
          .map((dept) => (
            <React.Fragment key={dept.id}>
              <SelectItem value={`${dept.id}/`}>{dept.name}</SelectItem>
              {dept.sections.map((section) => (
                <SelectItem key={section.id} value={`${dept.id}/${section.id}`}>
                  <span className="pl-3">{section.name}</span>
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        <SelectSeparator />
        <SelectItem value={NONE}>
          {t('orcaFork.botOrganization.unassigned', 'No department')}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
