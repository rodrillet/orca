// orca-fork: brings bots in line with their department's defaults after an edit made in this window:
// the agent and model through `bots.update`, standing instructions as a block in SOUL.md (which a
// running chat hears of on its next turn), so a stock orca-server needs nothing new.
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { readBots, updateBot } from '@/lib/bot-catalog'
import { useAppStore } from '@/store'
import { selectFolderWorkspaceOnHost } from '@/store/folder-workspaces/folder-workspace-record-index'
import { readBotHomeFile, writeBotHomeFile, type BotHome } from '../../settings/bots/bot-home-files'
import { getDiskBaselineSignature } from '../../../../../shared/file-write/disk-baseline-signature'
import { isConfirmedFileNotFoundError } from '../../../../../shared/file-write/file-write-disk-precondition'
import type { Bot } from '../../../../../shared/bot-types'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { BotOrganization } from '../../../../../shared/orca-fork/organization/bot-organization'
import {
  departmentApplyJobs,
  withDepartmentSoulBlock,
  type DepartmentApplyJob
} from '../../../../../shared/orca-fork/departments/department-inheritance'
import {
  departmentProfileOf,
  inheritsDepartmentDefault
} from '../../../../../shared/orca-fork/departments/department-edits'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { onBotOrganizationEdit, readBotOrganization } from '../organization/bot-organization-store'

function homeOf(bot: Bot): BotHome | null {
  const folder = selectFolderWorkspaceOnHost(
    useAppStore.getState(),
    bot.folderWorkspaceId,
    bot.hostId
  )
  return folder?.folderPath ? { bot, folderPath: folder.folderPath } : null
}

async function readSoul(home: BotHome): Promise<string> {
  try {
    return await readBotHomeFile(home, 'SOUL.md')
  } catch (error) {
    if (isConfirmedFileNotFoundError(error)) {
      return ''
    }
    throw error
  }
}

/** The department block a bot's SOUL.md should hold now: its department's, or none. */
function soulBlockFor(doc: BotOrganization, entryKey: string) {
  const placement = doc.placements[entryKey]
  const dept = placement && doc.departments.find((d) => d.id === placement.departmentId)
  if (!dept || !inheritsDepartmentDefault(doc, entryKey, 'instructions')) {
    return null
  }
  const { instructions } = departmentProfileOf(doc, dept.id).defaults
  return instructions.trim()
    ? {
        departmentName: dept.name,
        heading: translate('orcaFork.departments.soulHeading', 'Department'),
        instructions
      }
    : null
}

export async function syncDepartmentSoul(bot: Bot, doc: BotOrganization): Promise<boolean> {
  const home = homeOf(bot)
  if (!home) {
    throw new Error(translate('orcaFork.departments.noHome', 'Its home folder is not loaded yet.'))
  }
  // Two tries: an edit landing between the read and the write is read again.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const soul = await readSoul(home)
    const next = withDepartmentSoulBlock(soul, soulBlockFor(doc, botSidebarEntryKey(bot)))
    if (next === soul || (next === '' && soul.trim() === '')) {
      return false
    }
    const result = await writeBotHomeFile(home, 'SOUL.md', next, {
      expectedSignature: getDiskBaselineSignature(soul),
      allowMissing: soul === ''
    })
    if (result.ok) {
      return true
    }
  }
  throw new Error(translate('orcaFork.departments.soulChanged', 'SOUL.md kept changing.'))
}

async function applyJob(job: DepartmentApplyJob, bot: Bot, doc: BotOrganization): Promise<boolean> {
  const placement = doc.placements[job.entryKey]
  const defaults = placement ? departmentProfileOf(doc, placement.departmentId).defaults : null
  let changed = false
  if (job.fields.includes('instructions')) {
    changed = (await syncDepartmentSoul(bot, doc)) || changed
  }
  const agent = defaults?.agent
  if (
    job.fields.includes('agent') &&
    agent &&
    inheritsDepartmentDefault(doc, job.entryKey, 'agent') &&
    (agent.agent !== bot.agent ||
      JSON.stringify(agent.launch) !== JSON.stringify(bot.launch ?? null))
  ) {
    await updateBot(bot, { agent: agent.agent, launch: agent.launch })
    changed = true
  }
  const skills = defaults?.skillProjects
  if (
    job.fields.includes('skillProjects') &&
    skills &&
    inheritsDepartmentDefault(doc, job.entryKey, 'skillProjects')
  ) {
    // Only the projects on the bot's own machine: a repo id names a project on one computer.
    const repos = useAppStore.getState().repos
    const wanted = skills.filter((id) =>
      repos.some((repo) => repo.id === id && getRepoExecutionHostId(repo) === bot.hostId)
    )
    if (JSON.stringify(wanted) !== JSON.stringify(bot.skillProjects ?? [])) {
      await updateBot(bot, { skillProjects: wanted })
      changed = true
    }
  }
  return changed
}

/** Applies the jobs one bot at a time; returns how many bots changed and the failures by name. */
export async function runDepartmentJobs(
  jobs: readonly DepartmentApplyJob[],
  doc: BotOrganization
): Promise<{ changed: number; failed: string[] }> {
  const bots = new Map(readBots().map((bot) => [botSidebarEntryKey(bot), bot]))
  let changed = 0
  const failed: string[] = []
  for (const job of jobs) {
    const bot = bots.get(job.entryKey)
    if (!bot) {
      // A bot group or a bot on a machine that is off: nothing to apply now.
      continue
    }
    try {
      if (await applyJob(job, bot, doc)) {
        changed += 1
      }
    } catch (error) {
      console.error(error)
      failed.push(`${bot.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { changed, failed }
}

function report({ changed, failed }: { changed: number; failed: string[] }): void {
  if (failed.length > 0) {
    toast.error(
      translate(
        'orcaFork.departments.applyFailed',
        "Some bots didn't take the department defaults"
      ),
      { description: failed.join('\n') }
    )
  } else if (changed > 0) {
    toast.success(
      translate(
        'orcaFork.departments.applied',
        'Department defaults applied (bots changed: {{count}})',
        {
          count: changed
        }
      )
    )
  }
}

const REAPPLIED: DepartmentApplyJob['fields'] = ['instructions', 'agent', 'skillProjects']
const SOUL_ONLY: DepartmentApplyJob['fields'] = ['instructions']

/** Every inheriting bot of a department takes all its defaults again ("Apply to all"). */
export async function reapplyDepartmentDefaults(departmentId: string): Promise<void> {
  const doc = readBotOrganization()
  const jobs = Object.entries(doc.placements)
    .filter(([, placement]) => placement.departmentId === departmentId)
    .map(([entryKey]) => ({
      entryKey,
      fields: REAPPLIED
    }))
  report(await runDepartmentJobs(jobs, doc))
}

let queue: Promise<unknown> = Promise.resolve()
let installed = false
const resynced = new Set<string>()

/**
 * Puts the department block back in SOUL.md where a bot dropped it (its first run rewrites the file).
 * Orca owns that block like AGENTS.md, so this is no override of the owner; once per bot per session.
 */
export function resyncDepartmentSouls(departmentId: string): void {
  const doc = readBotOrganization()
  const jobs = Object.entries(doc.placements)
    .filter(([key, placement]) => placement.departmentId === departmentId && !resynced.has(key))
    .map(([entryKey]) => ({ entryKey, fields: SOUL_ONLY }))
  if (jobs.length === 0) {
    return
  }
  queue = queue.then(async () => {
    const result = await runDepartmentJobs(jobs, readBotOrganization())
    // A bot not listed yet (its machine still connecting) is tried again next time.
    const listed = new Set(readBots().map((bot) => botSidebarEntryKey(bot)))
    jobs.forEach((job) => listed.has(job.entryKey) && resynced.add(job.entryKey))
    if (result.failed.length > 0) {
      console.warn('[departments] SOUL.md resync failed', result.failed)
    }
  })
}

/** Installs once per window: each local organization edit applies what it changed for its bots. */
export function installDepartmentInheritance(): void {
  if (installed || !FORK_FEATURES.departmentManagement) {
    return
  }
  installed = true
  onBotOrganizationEdit((before, after) => {
    const jobs = departmentApplyJobs(before, after)
    if (jobs.length === 0) {
      return
    }
    // Serialized, each run reading the newest document so a quick second edit isn't undone.
    queue = queue.then(async () => report(await runDepartmentJobs(jobs, readBotOrganization())))
  })
}
