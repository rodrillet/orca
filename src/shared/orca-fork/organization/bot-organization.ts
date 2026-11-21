// orca-fork: Departments > Sections for the Bots sidebar. One versioned document keyed by
// `hostId/id`, with no Mac-only paths, so a later phase can keep it on a paired server and sync it.

import {
  normalizeDepartmentOverrides,
  normalizeDepartmentProfiles,
  type DepartmentDefaultField,
  type DepartmentProfile
} from '../departments/department-profile'

export const BOT_ORGANIZATION_VERSION = 1

export type BotSidebarGroupBy = 'none' | 'machine' | 'organization'

export type BotOrganizationSection = { id: string; name: string }
export type BotOrganizationDepartment = {
  id: string
  name: string
  sections: BotOrganizationSection[]
}
/** Where a bot or bot group sits: a department directly (sectionId null) or one of its sections. */
export type BotOrganizationPlacement = { departmentId: string; sectionId: string | null }

export type BotOrganization = {
  version: typeof BOT_ORGANIZATION_VERSION
  revision: number
  departments: BotOrganizationDepartment[]
  /** Keyed by the sidebar entry key `hostId/id`. */
  placements: Record<string, BotOrganizationPlacement>
  /** workspacesByMachine: the workspace sidebar lists one section per machine (Group by Machine). */
  view: { groupBy: BotSidebarGroupBy; collapsed: string[]; workspacesByMachine: boolean }
  /** Department management: look, mission, leader, defaults, by department id. */
  profiles: Record<string, DepartmentProfile>
  /** Defaults each bot (entry key) overrides instead of inheriting from its department. */
  overrides: Record<string, DepartmentDefaultField[]>
}

export function emptyBotOrganization(): BotOrganization {
  return {
    version: BOT_ORGANIZATION_VERSION,
    revision: 0,
    departments: [],
    placements: {},
    view: { groupBy: 'none', collapsed: [], workspacesByMachine: false },
    profiles: {},
    overrides: {}
  }
}

const GROUP_BY: readonly BotSidebarGroupBy[] = ['none', 'machine', 'organization']

function readName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : null
}

function readId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : null
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

function readList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(readRecord) : []
}

function readGroupBy(value: unknown): BotSidebarGroupBy {
  return GROUP_BY.find((groupBy) => groupBy === value) ?? 'none'
}

/** Reads a stored or received document, dropping anything malformed instead of failing. */
export function normalizeBotOrganization(raw: unknown): BotOrganization {
  const doc = emptyBotOrganization()
  const input = readRecord(raw)
  doc.revision =
    typeof input.revision === 'number' && Number.isFinite(input.revision) ? input.revision : 0
  const seen = new Set<string>()
  for (const dept of readList(input.departments)) {
    const id = readId(dept.id)
    const name = readName(dept.name)
    if (!id || !name || seen.has(id)) {
      continue
    }
    seen.add(id)
    const sections: BotOrganizationSection[] = []
    for (const section of readList(dept.sections)) {
      const sid = readId(section.id)
      const sname = readName(section.name)
      if (sid && sname && !seen.has(sid)) {
        seen.add(sid)
        sections.push({ id: sid, name: sname })
      }
    }
    doc.departments.push({ id, name, sections })
  }
  for (const [key, value] of Object.entries(readRecord(input.placements))) {
    const placement = readRecord(value)
    const dept = doc.departments.find((d) => d.id === placement.departmentId)
    if (!dept) {
      continue
    }
    const section = dept.sections.find((s) => s.id === placement.sectionId)
    doc.placements[key] = { departmentId: dept.id, sectionId: section?.id ?? null }
  }
  doc.profiles = normalizeDepartmentProfiles(
    input.profiles,
    doc.departments.map((d) => d.id)
  )
  doc.overrides = normalizeDepartmentOverrides(input.overrides)
  const view = readRecord(input.view)
  doc.view.groupBy = readGroupBy(view.groupBy)
  doc.view.workspacesByMachine = view.workspacesByMachine === true
  doc.view.collapsed = Array.isArray(view.collapsed)
    ? view.collapsed.filter((key): key is string => typeof key === 'string')
    : []
  return doc
}

type Edit = (doc: BotOrganization) => BotOrganization

function bump(doc: BotOrganization): BotOrganization {
  return { ...doc, revision: doc.revision + 1 }
}

export const botOrganizationEdits = {
  setGroupBy:
    (groupBy: BotSidebarGroupBy): Edit =>
    (doc) =>
      bump({ ...doc, view: { ...doc.view, groupBy } }),
  setWorkspacesByMachine:
    (workspacesByMachine: boolean): Edit =>
    (doc) =>
      bump({ ...doc, view: { ...doc.view, workspacesByMachine } }),
  toggleCollapsed:
    (headerKey: string): Edit =>
    (doc) =>
      bump({
        ...doc,
        view: {
          ...doc.view,
          collapsed: doc.view.collapsed.includes(headerKey)
            ? doc.view.collapsed.filter((key) => key !== headerKey)
            : [...doc.view.collapsed, headerKey]
        }
      }),
  addDepartment:
    (id: string, name: string): Edit =>
    (doc) =>
      bump({ ...doc, departments: [...doc.departments, { id, name: name.trim(), sections: [] }] }),
  addSection:
    (departmentId: string, id: string, name: string): Edit =>
    (doc) =>
      bump({
        ...doc,
        departments: doc.departments.map((d) =>
          d.id === departmentId ? { ...d, sections: [...d.sections, { id, name: name.trim() }] } : d
        )
      }),
  rename:
    (target: BotOrganizationPlacement, name: string): Edit =>
    (doc) =>
      bump({
        ...doc,
        departments: doc.departments.map((d) =>
          d.id !== target.departmentId
            ? d
            : target.sectionId === null
              ? { ...d, name: name.trim() }
              : {
                  ...d,
                  sections: d.sections.map((s) =>
                    s.id === target.sectionId ? { ...s, name: name.trim() } : s
                  )
                }
        )
      }),
  /** Deleting a section keeps its bots in the department; deleting a department unplaces its bots. */
  remove:
    (target: BotOrganizationPlacement): Edit =>
    (doc) => {
      const placements: Record<string, BotOrganizationPlacement> = {}
      for (const [key, placement] of Object.entries(doc.placements)) {
        if (placement.departmentId !== target.departmentId) {
          placements[key] = placement
        } else if (target.sectionId !== null) {
          placements[key] =
            placement.sectionId === target.sectionId
              ? { departmentId: placement.departmentId, sectionId: null }
              : placement
        }
      }
      return bump({
        ...doc,
        placements,
        departments:
          target.sectionId === null
            ? doc.departments.filter((d) => d.id !== target.departmentId)
            : doc.departments.map((d) =>
                d.id === target.departmentId
                  ? { ...d, sections: d.sections.filter((s) => s.id !== target.sectionId) }
                  : d
              )
      })
    },
  /** null takes the entry out of every department. */
  place:
    (entryKey: string, target: BotOrganizationPlacement | null): Edit =>
    (doc) => {
      const placements = { ...doc.placements }
      if (target) {
        placements[entryKey] = target
      } else {
        delete placements[entryKey]
      }
      return bump({ ...doc, placements })
    }
}

export type BotOrganizationHeader = {
  kind: 'fork-org-header'
  /** Row key, also the collapse key. */
  id: string
  level: 0 | 1
  title: string
  count: number
  collapsed: boolean
  /** Drop/edit target; null for machine groups and the unassigned bucket. */
  target: BotOrganizationPlacement | null
  /** The unassigned bucket accepts drops that take an entry out of its department. */
  unassigned?: boolean
}

export const UNASSIGNED_HEADER_ID = 'fork-org:unassigned'

/** The Bots list with department/section or machine headers between entries, collapsed ones folded. */
export function groupBotSidebarEntries<E extends { id: string }>(
  entries: readonly E[],
  doc: BotOrganization,
  labels: { hostOf: (entry: E) => string; machine: (hostId: string) => string; unassigned: string }
): (E | BotOrganizationHeader)[] {
  const collapsed = new Set(doc.view.collapsed)
  const rows: (E | BotOrganizationHeader)[] = []
  const push = (header: Omit<BotOrganizationHeader, 'kind' | 'collapsed'>, items: E[]): void => {
    const isCollapsed = collapsed.has(header.id)
    rows.push({ kind: 'fork-org-header', collapsed: isCollapsed, ...header })
    if (!isCollapsed) {
      rows.push(...items)
    }
  }
  if (doc.view.groupBy === 'machine') {
    const byHost = new Map<string, E[]>()
    for (const entry of entries) {
      const hostId = labels.hostOf(entry)
      byHost.set(hostId, [...(byHost.get(hostId) ?? []), entry])
    }
    for (const [hostId, items] of byHost) {
      push(
        {
          id: `fork-machine:${hostId}`,
          level: 0,
          title: labels.machine(hostId),
          count: items.length,
          target: null
        },
        items
      )
    }
    return rows
  }
  const unplaced: E[] = []
  const bySlot = new Map<string, E[]>()
  for (const entry of entries) {
    const placement = doc.placements[entry.id]
    if (!placement) {
      unplaced.push(entry)
      continue
    }
    const slot = `${placement.departmentId}/${placement.sectionId ?? ''}`
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), entry])
  }
  for (const dept of doc.departments) {
    const direct = bySlot.get(`${dept.id}/`) ?? []
    const total =
      direct.length +
      dept.sections.reduce((sum, s) => sum + (bySlot.get(`${dept.id}/${s.id}`)?.length ?? 0), 0)
    const deptCollapsed = collapsed.has(`fork-org:${dept.id}`)
    push(
      {
        id: `fork-org:${dept.id}`,
        level: 0,
        title: dept.name,
        count: total,
        target: { departmentId: dept.id, sectionId: null }
      },
      direct
    )
    if (deptCollapsed) {
      continue
    }
    for (const section of dept.sections) {
      const items = bySlot.get(`${dept.id}/${section.id}`) ?? []
      push(
        {
          id: `fork-org:${dept.id}/${section.id}`,
          level: 1,
          title: section.name,
          count: items.length,
          target: { departmentId: dept.id, sectionId: section.id }
        },
        items
      )
    }
  }
  push(
    {
      id: UNASSIGNED_HEADER_ID,
      level: 0,
      title: labels.unassigned,
      count: unplaced.length,
      target: null,
      unassigned: true
    },
    unplaced
  )
  return rows
}

export function isBotOrganizationHeader(row: unknown): row is BotOrganizationHeader {
  return typeof row === 'object' && row !== null && 'kind' in row && row.kind === 'fork-org-header'
}
