// orca-fork: a department's mission, leader, sections and members, with the quick actions: add or create
// a bot here, move or remove several at once, make, rename, reorder and delete sections.
import React, { useMemo, useState } from 'react'
import { Crown, FolderPlus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { NewBotDialog } from '@/components/bots/NewBotDialog'
import { useTranslate } from '@/i18n/use-translate'
import {
  botOrganizationEdits,
  type BotOrganizationPlacement
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { departmentEdits } from '../../../../../shared/orca-fork/departments/department-edits'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { editBotOrganization } from '../organization/bot-organization-store'
import { newOrganizationId } from '../organization/bot-organization-rename'
import {
  acceptsBotOrganizationDrag,
  dropBotOrganizationEntry
} from '../organization/bot-organization-drag'
import { useHostLabels } from '../agents-board/agents-board-facets'
import {
  DepartmentMemberChip,
  DepartmentMemberFace,
  openDepartmentMember
} from './DepartmentMemberChip'
import { memberName, type DepartmentWorld } from './use-department-world'
import { useListReorder } from './use-list-reorder'
import { PlacementSelect } from './DepartmentPlacementSelect'
import { LeaderSelect, MissionField } from './DepartmentProfileFields'
import { SectionRow } from './DepartmentSectionRow'
import { AddBotsPopover } from './DepartmentAddBots'

type Dept = DepartmentWorld['departments'][number]

export function DepartmentOverview({
  dept,
  world
}: {
  dept: Dept
  world: DepartmentWorld
}): React.JSX.Element {
  const t = useTranslate()
  const members = world.membersOf(dept.id)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newBotOpen, setNewBotOpen] = useState(false)
  const hostIds = useMemo(
    () => [
      ...new Set(
        members.map((member) => (member.kind === 'bot' ? member.bot : member.group).hostId)
      )
    ],
    [members]
  )
  const hostLabels = useHostLabels(hostIds)
  const shownSelected = members.filter((member) => selected.has(member.key)).map((m) => m.key)
  const reorderSections = useListReorder((id, toId) => {
    const to = dept.sections.findIndex((section) => section.id === toId)
    if (to !== -1) {
      editBotOrganization(departmentEdits.moveSection(dept.id, id, to))
    }
  })
  const toggle = (key: string, on: boolean): void =>
    setSelected((current) => {
      const next = new Set(current)
      if (on) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  const moveSelected = (target: BotOrganizationPlacement | null): void => {
    editBotOrganization(departmentEdits.placeMany(shownSelected, target))
    setSelected(new Set())
  }
  const addSection = (): void => {
    editBotOrganization(
      botOrganizationEdits.addSection(
        dept.id,
        newOrganizationId(),
        t('orcaFork.botOrganization.newSectionName', 'New section')
      )
    )
  }
  const direct = members.filter((member) => member.sectionId === null)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">{t('orcaFork.departments.mission', 'Mission')}</h2>
          <MissionField key={dept.id} dept={dept} />
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">{t('orcaFork.departments.leader', 'Leader')}</h2>
          <LeaderSelect dept={dept} members={members} />
          <p className="text-xs text-muted-foreground">
            {t(
              'orcaFork.departments.leaderHint',
              'The bot that answers for the department and coordinates its bots.'
            )}
          </p>
        </section>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-sm font-semibold">
              {t('orcaFork.departments.members', 'Members')} · {members.length}
            </h2>
            <AddBotsPopover dept={dept} world={world} />
            <Button variant="outline" size="sm" onClick={() => setNewBotOpen(true)}>
              <Plus className="size-4" />
              {t('orcaFork.departments.createBot', 'New bot here')}
            </Button>
          </div>
          {shownSelected.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">
                {t('orcaFork.departments.selected', 'Selected: {{count}}', {
                  count: shownSelected.length
                })}
              </span>
              <PlacementSelect
                world={world}
                value={undefined}
                onChange={moveSelected}
                placeholder={t('orcaFork.botOrganization.moveTo', 'Move to…')}
                className="w-48"
              />
              <Button variant="ghost" size="sm" onClick={() => moveSelected(null)}>
                {t('orcaFork.departments.removeFromDepartment', 'Remove from department')}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('orcaFork.departments.clearSelection', 'Clear selection')}
                onClick={() => setSelected(new Set())}
              >
                <X />
              </Button>
            </div>
          ) : null}
          {members.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t(
                'orcaFork.departments.noMembers',
                'No bots yet. Add one, create one here, or drag one from the sidebar.'
              )}
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                <Checkbox
                  aria-label={t('orcaFork.departments.selectAll', 'Select all')}
                  checked={
                    shownSelected.length === members.length
                      ? true
                      : shownSelected.length > 0
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(on) =>
                    setSelected(on === true ? new Set(members.map((m) => m.key)) : new Set())
                  }
                />
                <span className="flex-1">{t('orcaFork.departments.member', 'Bot')}</span>
                <span className="w-40">{t('orcaFork.departments.place', 'Section')}</span>
                <span className="w-8" />
              </div>
              {members.map((member) => {
                const owner = member.kind === 'bot' ? member.bot : member.group
                return (
                  <div
                    key={member.key}
                    className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent/40"
                  >
                    <Checkbox
                      aria-label={memberName(member)}
                      checked={selected.has(member.key)}
                      onCheckedChange={(on) => toggle(member.key, on === true)}
                    />
                    <button
                      type="button"
                      onClick={() => openDepartmentMember(member)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <DepartmentMemberFace member={member} className="size-7" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate text-sm font-medium">
                          {memberName(member)}
                          {dept.profile.leaderKey === member.key ? (
                            <Crown
                              className="size-3.5 text-muted-foreground"
                              aria-label={t('orcaFork.departments.leader', 'Leader')}
                            />
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.kind === 'group'
                            ? t('orcaFork.departments.groupKind', 'Group chat')
                            : hostLabels[owner.hostId]}
                        </span>
                      </span>
                    </button>
                    <PlacementSelect
                      world={world}
                      value={{ departmentId: dept.id, sectionId: member.sectionId }}
                      onChange={(target) =>
                        editBotOrganization(botOrganizationEdits.place(member.key, target))
                      }
                      className="w-40"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="w-8"
                      aria-label={t(
                        'orcaFork.departments.removeFromDepartment',
                        'Remove from department'
                      )}
                      onClick={() =>
                        editBotOrganization(botOrganizationEdits.place(member.key, null))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-sm font-semibold">
              {t('orcaFork.departments.sections', 'Sections')} · {dept.sections.length}
            </h2>
            <Button variant="outline" size="sm" onClick={addSection}>
              <FolderPlus className="size-4" />
              {t('orcaFork.botOrganization.newSection', 'New section')}
            </Button>
          </div>
          <div
            className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3"
            onDragOver={(event) => acceptsBotOrganizationDrag(event)}
            onDrop={(event) =>
              dropBotOrganizationEntry(event, { departmentId: dept.id, sectionId: null })
            }
          >
            <span className="text-xs font-medium text-muted-foreground">
              {t('orcaFork.departments.directly', 'Directly in the department')} · {direct.length}
            </span>
            <div className="flex flex-wrap gap-1">
              {direct.map((member) => (
                <DepartmentMemberChip key={member.key} member={member} />
              ))}
            </div>
          </div>
          {dept.sections.map((section) => (
            <SectionRow
              key={section.id}
              dept={dept}
              section={section}
              members={members.filter((member) => member.sectionId === section.id)}
              reorder={reorderSections}
            />
          ))}
        </section>
      </div>
      {newBotOpen ? (
        <NewBotDialog
          open
          initialAgent={dept.profile.defaults.agent?.agent}
          onOpenChange={(open) => setNewBotOpen(open)}
          onCreated={(bot) =>
            editBotOrganization(
              botOrganizationEdits.place(botSidebarEntryKey(bot), {
                departmentId: dept.id,
                sectionId: null
              })
            )
          }
        />
      ) : null}
    </div>
  )
}
