// orca-fork: what a department is beyond its name (look, mission, leader, chat) and the defaults every
// bot in it inherits unless that bot overrides them. Kept inside the organization document, keyed by
// department id, so it syncs with it.
import { BOT_AGENTS, type BotAgent } from '../../bot-types'
import { BotLaunchSchema, type BotLaunch } from '../../bots/bot-launch'
import { BotAvatarColorSchema } from '../../bots/bot-avatar-color'

/** Lucide icon names a department may show; the renderer maps each to its component. */
export const DEPARTMENT_ICONS = [
  'building',
  'briefcase',
  'code',
  'megaphone',
  'headset',
  'chart',
  'wallet',
  'scale',
  'palette',
  'flask',
  'shield',
  'truck',
  'users',
  'rocket',
  'book',
  'wrench'
] as const
export type DepartmentIcon = (typeof DEPARTMENT_ICONS)[number]

/** The settings a department hands its bots; each one a bot may override. */
export const DEPARTMENT_DEFAULT_FIELDS = [
  'instructions',
  'agent',
  'skillProjects',
  'tokenSaving'
] as const
export type DepartmentDefaultField = (typeof DEPARTMENT_DEFAULT_FIELDS)[number]

export type DepartmentDefaults = {
  /** Standing instructions every bot of the department reads in its SOUL.md; '' for none. */
  instructions: string
  /** The agent and its model/effort; null leaves each bot's own. */
  agent: { agent: BotAgent; launch: BotLaunch | null } | null
  /** Projects whose skills the bots load; null leaves each bot's own. */
  skillProjects: string[] | null
  /** Caveman's token-saving mode; null leaves each bot's own. */
  tokenSaving: boolean | null
}

export type DepartmentProfile = {
  color: string | null
  icon: DepartmentIcon | null
  description: string
  /** Sidebar entry key `hostId/botId` of the bot that leads it. */
  leaderKey: string | null
  archived: boolean
  defaults: DepartmentDefaults
  /** The department's group chat, `hostId/groupId`, made when first opened. */
  roomKey: string | null
}

export const MAX_DEPARTMENT_DESCRIPTION = 2000
export const MAX_DEPARTMENT_INSTRUCTIONS = 8000

export function emptyDepartmentDefaults(): DepartmentDefaults {
  return { instructions: '', agent: null, skillProjects: null, tokenSaving: null }
}

export function emptyDepartmentProfile(): DepartmentProfile {
  return {
    color: null,
    icon: null,
    description: '',
    leaderKey: null,
    archived: false,
    defaults: emptyDepartmentDefaults(),
    roomKey: null
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

function readKey(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 300 ? value : null
}

function readText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function readAgentDefault(value: unknown): DepartmentDefaults['agent'] {
  const input = readRecord(value)
  const agent = BOT_AGENTS.find((candidate) => candidate === input.agent)
  if (!agent) {
    return null
  }
  const launch = input.launch == null ? null : BotLaunchSchema.safeParse(input.launch)
  return { agent, launch: launch?.success ? launch.data : null }
}

function readDefaults(value: unknown): DepartmentDefaults {
  const input = readRecord(value)
  return {
    instructions: readText(input.instructions, MAX_DEPARTMENT_INSTRUCTIONS),
    agent: readAgentDefault(input.agent),
    skillProjects: Array.isArray(input.skillProjects)
      ? [
          ...new Set(
            input.skillProjects.filter((id): id is string => typeof id === 'string' && id !== '')
          )
        ].slice(0, 20)
      : null,
    tokenSaving: typeof input.tokenSaving === 'boolean' ? input.tokenSaving : null
  }
}

export function normalizeDepartmentProfile(raw: unknown): DepartmentProfile {
  const input = readRecord(raw)
  const color = BotAvatarColorSchema.safeParse(input.color)
  return {
    color: color.success ? color.data : null,
    icon: DEPARTMENT_ICONS.find((icon) => icon === input.icon) ?? null,
    description: readText(input.description, MAX_DEPARTMENT_DESCRIPTION),
    leaderKey: readKey(input.leaderKey),
    archived: input.archived === true,
    defaults: readDefaults(input.defaults),
    roomKey: readKey(input.roomKey)
  }
}

/** Profiles of known departments only; a missing one reads as empty. */
export function normalizeDepartmentProfiles(
  raw: unknown,
  departmentIds: readonly string[]
): Record<string, DepartmentProfile> {
  const input = readRecord(raw)
  const profiles: Record<string, DepartmentProfile> = {}
  for (const id of departmentIds) {
    if (id in input) {
      profiles[id] = normalizeDepartmentProfile(input[id])
    }
  }
  return profiles
}

/** Per bot (entry key), the defaults it overrides instead of inheriting. */
export function normalizeDepartmentOverrides(
  raw: unknown
): Record<string, DepartmentDefaultField[]> {
  const overrides: Record<string, DepartmentDefaultField[]> = {}
  for (const [key, value] of Object.entries(readRecord(raw))) {
    if (!readKey(key) || !Array.isArray(value)) {
      continue
    }
    const fields = DEPARTMENT_DEFAULT_FIELDS.filter((field) => value.includes(field))
    if (fields.length > 0) {
      overrides[key] = fields
    }
  }
  return overrides
}

/** Whether a default is set at all, so there is something for bots to inherit. */
export function departmentDefaultIsSet(
  defaults: DepartmentDefaults,
  field: DepartmentDefaultField
): boolean {
  switch (field) {
    case 'instructions':
      return defaults.instructions.trim() !== ''
    case 'agent':
      return defaults.agent !== null
    case 'skillProjects':
      return defaults.skillProjects !== null
    case 'tokenSaving':
      return defaults.tokenSaving !== null
  }
}

/** The defaults changed between two versions of one department, by field. */
export function changedDepartmentDefaults(
  before: DepartmentDefaults,
  after: DepartmentDefaults
): DepartmentDefaultField[] {
  return DEPARTMENT_DEFAULT_FIELDS.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field])
  )
}
