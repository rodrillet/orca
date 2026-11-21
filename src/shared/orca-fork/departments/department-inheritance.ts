// orca-fork: which bots must take which department defaults after an organization edit, and the
// department block Orca keeps in a bot's SOUL.md. Defaults are applied on change only (a move, a new
// default, an override cleared), so a bot changed by hand afterwards is never reverted behind the owner's back.
import type { BotOrganization } from '../organization/bot-organization'
import {
  changedDepartmentDefaults,
  DEPARTMENT_DEFAULT_FIELDS,
  departmentDefaultIsSet,
  emptyDepartmentProfile,
  type DepartmentDefaultField
} from './department-profile'

export type DepartmentApplyJob = { entryKey: string; fields: DepartmentDefaultField[] }

function profile(doc: BotOrganization, departmentId: string | undefined) {
  return departmentId === undefined
    ? null
    : (doc.profiles[departmentId] ?? emptyDepartmentProfile())
}

function nameOf(doc: BotOrganization, departmentId: string | undefined): string | null {
  return doc.departments.find((d) => d.id === departmentId)?.name ?? null
}

/** The bots to bring in line after `before` became `after`, with the fields to apply to each. */
export function departmentApplyJobs(
  before: BotOrganization,
  after: BotOrganization
): DepartmentApplyJob[] {
  const jobs = new Map<string, Set<DepartmentDefaultField>>()
  const add = (key: string, fields: readonly DepartmentDefaultField[]): void => {
    if (fields.length === 0) {
      return
    }
    const set = jobs.get(key) ?? new Set()
    fields.forEach((field) => set.add(field))
    jobs.set(key, set)
  }
  const keys = new Set([...Object.keys(before.placements), ...Object.keys(after.placements)])
  for (const key of keys) {
    const was = before.placements[key]?.departmentId
    const now = after.placements[key]?.departmentId
    const nowExists = now !== undefined && nameOf(after, now) !== null
    const nowProfile = nowExists ? profile(after, now) : null
    if (was !== now || (was !== undefined && !nowExists)) {
      // Moved, placed or taken out: everything the new department sets, and its SOUL.md block either way.
      const set = nowProfile
        ? DEPARTMENT_DEFAULT_FIELDS.filter(
            (f) =>
              departmentDefaultIsSet(nowProfile.defaults, f) &&
              !(after.overrides[key] ?? []).includes(f)
          )
        : []
      add(key, [...new Set<DepartmentDefaultField>(['instructions', ...set])])
      continue
    }
    if (!nowProfile) {
      continue
    }
    const wasProfile = profile(before, was)!
    const overriding = after.overrides[key] ?? []
    add(
      key,
      changedDepartmentDefaults(wasProfile.defaults, nowProfile.defaults).filter(
        (field) => !overriding.includes(field)
      )
    )
    if (nameOf(before, was) !== nameOf(after, now) && nowProfile.defaults.instructions.trim()) {
      add(key, ['instructions'])
    }
    const wasOverrides = before.overrides[key] ?? []
    const nowOverrides = after.overrides[key] ?? []
    for (const field of DEPARTMENT_DEFAULT_FIELDS) {
      if (wasOverrides.includes(field) !== nowOverrides.includes(field)) {
        // A cleared override takes the department's value; a new one only drops the SOUL.md block.
        if (!nowOverrides.includes(field) || field === 'instructions') {
          add(key, [field])
        }
      }
    }
  }
  return [...jobs].map(([entryKey, fields]) => ({ entryKey, fields: [...fields] }))
}

const BLOCK_START = '<!-- orca-fork:department -->'
const BLOCK_END = '<!-- /orca-fork:department -->'
// The heading line before the start marker belongs to the block.
const BLOCK_PATTERN =
  /\n*(?:[^\n]*\n)?<!-- orca-fork:department -->[\s\S]*?<!-- \/orca-fork:department -->\n?/

/** SOUL.md with the department's standing instructions as its last section, or without it (null). */
export function withDepartmentSoulBlock(
  soul: string,
  block: { departmentName: string; heading: string; instructions: string } | null
): string {
  const base = soul.replace(BLOCK_PATTERN, '\n').replace(/\s+$/, '')
  if (!block || !block.instructions.trim()) {
    return base ? `${base}\n` : ''
  }
  const section = [
    `## ${block.heading}: ${block.departmentName}`,
    BLOCK_START,
    block.instructions.trim(),
    BLOCK_END
  ].join('\n')
  return base ? `${base}\n\n${section}\n` : `${section}\n`
}

/** The department instructions currently in a SOUL.md, or null. */
export function readDepartmentSoulBlock(soul: string): string | null {
  const start = soul.indexOf(BLOCK_START)
  const end = soul.indexOf(BLOCK_END)
  return start === -1 || end < start ? null : soul.slice(start + BLOCK_START.length, end).trim()
}
