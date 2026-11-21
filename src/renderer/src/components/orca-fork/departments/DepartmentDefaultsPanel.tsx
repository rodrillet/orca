// orca-fork: what every bot of a department inherits (standing instructions, agent and model, token
// saving), and which bots keep their own value instead.
import React, { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { BotAgentLaunchPicker } from '@/components/bots/BotAgentLaunchPicker'
import { useBotAgentMenu } from '@/components/bots/use-bot-agent-choices'
import { botAgentLabel } from '@/components/bots/bot-presentation'
import { useTranslate } from '@/i18n/use-translate'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import {
  departmentEdits,
  inheritsDepartmentDefault
} from '../../../../../shared/orca-fork/departments/department-edits'
import {
  MAX_DEPARTMENT_INSTRUCTIONS,
  type DepartmentDefaultField,
  type DepartmentDefaults
} from '../../../../../shared/orca-fork/departments/department-profile'
import { editBotOrganization } from '../organization/bot-organization-store'
import { reapplyDepartmentDefaults } from './department-apply'
import { DepartmentMemberFace } from './DepartmentMemberChip'
import { memberName, type DepartmentWorld } from './use-department-world'

type Dept = DepartmentWorld['departments'][number]

const UNSET = 'unset'

function Field({
  title,
  hint,
  children
}: {
  title: string
  hint: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </section>
  )
}

export function DepartmentDefaultsPanel({
  dept,
  world
}: {
  dept: Dept
  world: DepartmentWorld
}): React.JSX.Element {
  const t = useTranslate()
  const saved = dept.profile.defaults
  const [draft, setDraft] = useState<DepartmentDefaults>(saved)
  const [applying, setApplying] = useState(false)
  const bots = world.membersOf(dept.id).flatMap((member) => (member.kind === 'bot' ? [member] : []))
  // The picker lists the agents of the machine most of the department's bots run on.
  const hostId = useMemo(() => {
    const leader = bots.find((member) => member.key === dept.profile.leaderKey)
    return (leader ?? bots[0])?.bot.hostId ?? LOCAL_EXECUTION_HOST_ID
  }, [bots, dept.profile.leaderKey])
  const menu = useBotAgentMenu(hostId, true, draft.agent?.agent)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const fields: { field: DepartmentDefaultField; label: string }[] = [
    { field: 'instructions', label: t('orcaFork.departments.instructions', 'Instructions') },
    { field: 'agent', label: t('orcaFork.departments.agent', 'Agent and model') },
    { field: 'tokenSaving', label: t('orcaFork.departments.tokenSaving', 'Token saving') }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-4">
        <Field
          title={t('orcaFork.departments.instructions', 'Instructions')}
          hint={t(
            'orcaFork.departments.instructionsHint',
            "Standing instructions for every bot here. Orca keeps them as a Department section at the end of each bot's SOUL.md; a running chat picks them up on its next turn."
          )}
        >
          <Textarea
            value={draft.instructions}
            maxLength={MAX_DEPARTMENT_INSTRUCTIONS}
            onChange={(event) => setDraft({ ...draft, instructions: event.target.value })}
            placeholder={t(
              'orcaFork.departments.instructionsPlaceholder',
              'e.g. Answer customers in Portuguese. Escalate refunds over R$ 500 to the leader.'
            )}
            spellCheck={false}
            variant="code"
            className="min-h-32"
          />
        </Field>
        <Field
          title={t('orcaFork.departments.agent', 'Agent and model')}
          hint={t(
            'orcaFork.departments.agentHint',
            'The agent, model and effort new chats of these bots run on.'
          )}
        >
          <div className="max-w-md">
            <BotAgentLaunchPicker
              model={menu.model}
              choices={menu.choices}
              withPermission={false}
              showChatDefaultHint={false}
              value={{
                agent: draft.agent?.agent ?? menu.choices[0] ?? 'claude',
                launch: draft.agent?.launch ?? undefined
              }}
              inherit={{
                label: t('orcaFork.departments.eachBotsOwn', "Each bot's own"),
                chosen: draft.agent === null,
                onChoose: () => setDraft({ ...draft, agent: null })
              }}
              onChange={(setup) =>
                setDraft({ ...draft, agent: { agent: setup.agent, launch: setup.launch ?? null } })
              }
            />
          </div>
        </Field>
        <Field
          title={t('orcaFork.departments.tokenSaving', 'Token saving')}
          hint={t(
            'orcaFork.departments.tokenSavingHint',
            "Caveman's token-saving mode for these bots, unless a bot sets its own."
          )}
        >
          <Select
            value={draft.tokenSaving === null ? UNSET : draft.tokenSaving ? 'on' : 'off'}
            onValueChange={(value) =>
              setDraft({ ...draft, tokenSaving: value === UNSET ? null : value === 'on' })
            }
          >
            <SelectTrigger size="sm" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>
                {t('orcaFork.departments.tokenSavingUnset', 'Not set (workspace setting)')}
              </SelectItem>
              <SelectItem value="on">{t('orcaFork.departments.on', 'On')}</SelectItem>
              <SelectItem value="off">{t('orcaFork.departments.off', 'Off')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <Button
            disabled={!dirty}
            onClick={() => editBotOrganization(departmentEdits.setDefaults(dept.id, draft))}
          >
            {t('orcaFork.departments.saveDefaults', 'Save and apply')}
          </Button>
          <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(saved)}>
            {t('orcaFork.departments.discard', 'Discard')}
          </Button>
          <span className="flex-1" />
          <Button
            variant="outline"
            disabled={applying || dirty || bots.length === 0}
            onClick={() => {
              setApplying(true)
              void reapplyDepartmentDefaults(dept.id).finally(() => setApplying(false))
            }}
          >
            <RotateCcw className="size-4" />
            {t('orcaFork.departments.reapply', 'Apply again to every bot')}
          </Button>
        </div>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">
          {t('orcaFork.departments.inheritance', 'Who inherits')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(
            'orcaFork.departments.inheritanceHint',
            'Turn a default off for a bot to keep its own value. Changes in a bot’s own settings are never undone.'
          )}
        </p>
        {bots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('orcaFork.departments.noBots', 'No bots in this department yet.')}
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="flex-1">{t('orcaFork.departments.member', 'Bot')}</span>
              {fields.map(({ field, label }) => (
                <span key={field} className="w-32 text-center">
                  {label}
                </span>
              ))}
            </div>
            {bots.map((member) => {
              const differs =
                saved.agent !== null &&
                inheritsDepartmentDefault(world.doc, member.key, 'agent') &&
                saved.agent.agent !== member.bot.agent
              return (
                <div
                  key={member.key}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <DepartmentMemberFace member={member} className="size-6" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{memberName(member)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {botAgentLabel(member.bot.agent)}
                        {member.bot.launch?.model ? ` · ${member.bot.launch.model}` : ''}
                        {differs
                          ? ` · ${t('orcaFork.departments.differs', 'differs from the department')}`
                          : ''}
                      </span>
                    </span>
                  </span>
                  {fields.map(({ field, label }) => (
                    <span key={field} className="flex w-32 justify-center">
                      <Switch
                        aria-label={`${label}: ${memberName(member)}`}
                        checked={inheritsDepartmentDefault(world.doc, member.key, field)}
                        onCheckedChange={(on) =>
                          editBotOrganization(departmentEdits.setOverride(member.key, field, !on))
                        }
                      />
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
