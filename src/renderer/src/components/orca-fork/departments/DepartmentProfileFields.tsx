// orca-fork: a department's mission and leader fields.
import React, { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslate } from '@/i18n/use-translate'
import { departmentEdits } from '../../../../../shared/orca-fork/departments/department-edits'
import { MAX_DEPARTMENT_DESCRIPTION } from '../../../../../shared/orca-fork/departments/department-profile'
import { editBotOrganization } from '../organization/bot-organization-store'
import { DepartmentMemberFace } from './DepartmentMemberChip'
import { memberName, type DepartmentMember, type DepartmentWorld } from './use-department-world'

type Dept = DepartmentWorld['departments'][number]

const NONE = '__none__'

export function MissionField({ dept }: { dept: Dept }): React.JSX.Element {
  const t = useTranslate()
  const [value, setValue] = useState(dept.profile.description)
  return (
    <Textarea
      value={value}
      maxLength={MAX_DEPARTMENT_DESCRIPTION}
      placeholder={t(
        'orcaFork.departments.missionPlaceholder',
        'What this department is for and how it works.'
      )}
      aria-label={t('orcaFork.departments.mission', 'Mission')}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value !== dept.profile.description) {
          editBotOrganization(departmentEdits.setProfile(dept.id, { description: value }))
        }
      }}
      className="min-h-20"
    />
  )
}

export function LeaderSelect({ dept, members }: { dept: Dept; members: DepartmentMember[] }) {
  const t = useTranslate()
  const bots = members.filter((member) => member.kind === 'bot')
  return (
    <Select
      value={dept.profile.leaderKey ?? NONE}
      onValueChange={(value) =>
        editBotOrganization(
          departmentEdits.setProfile(dept.id, { leaderKey: value === NONE ? null : value })
        )
      }
    >
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t('orcaFork.departments.noLeader', 'No leader')}</SelectItem>
        {bots.map((member) => (
          <SelectItem key={member.key} value={member.key}>
            <span className="flex items-center gap-1.5">
              <DepartmentMemberFace member={member} className="size-4" />
              {memberName(member)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
