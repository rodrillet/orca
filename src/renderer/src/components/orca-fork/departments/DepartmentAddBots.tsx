// orca-fork: "Add bot": any bot of the workspace not in this department, with where it sits now.
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTranslate } from '@/i18n/use-translate'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { editBotOrganization } from '../organization/bot-organization-store'
import { DepartmentMemberFace } from './DepartmentMemberChip'
import type { DepartmentWorld } from './use-department-world'

type Dept = DepartmentWorld['departments'][number]

export function AddBotsPopover({ dept, world }: { dept: Dept; world: DepartmentWorld }) {
  const t = useTranslate()
  const [query, setQuery] = useState('')
  const placedHere = new Set(world.membersOf(dept.id).map((member) => member.key))
  const candidates = world.bots
    .filter((bot) => !placedHere.has(botSidebarEntryKey(bot)))
    .filter((bot) => bot.name.toLowerCase().includes(query.trim().toLowerCase()))
  const deptName = (key: string): string | null => {
    const id = world.doc.placements[key]?.departmentId
    return world.departments.find((d) => d.id === id)?.name ?? null
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" />
          {t('orcaFork.departments.addBot', 'Add bot')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('orcaFork.departments.searchBots', 'Search bots')}
            aria-label={t('orcaFork.departments.searchBots', 'Search bots')}
            className="h-8"
          />
          <div className="flex max-h-72 flex-col overflow-y-auto scrollbar-sleek">
            {candidates.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {t('orcaFork.departments.noBotsToAdd', 'No other bots.')}
              </p>
            ) : null}
            {candidates.map((bot) => {
              const key = botSidebarEntryKey(bot)
              const from = deptName(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    editBotOrganization(
                      botOrganizationEdits.place(key, { departmentId: dept.id, sectionId: null })
                    )
                  }
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <DepartmentMemberFace member={{ key, kind: 'bot', bot, sectionId: null }} />
                  <span className="min-w-0 flex-1 truncate">{bot.name}</span>
                  {from ? (
                    <span className="truncate text-xs text-muted-foreground">{from}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
