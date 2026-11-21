// orca-fork: edits to department management, in the organization document's edit style.
import type { BotOrganization, BotOrganizationPlacement } from '../organization/bot-organization'
import {
  emptyDepartmentProfile,
  type DepartmentDefaultField,
  type DepartmentDefaults,
  type DepartmentProfile
} from './department-profile'

type Edit = (doc: BotOrganization) => BotOrganization

function bump(doc: BotOrganization): BotOrganization {
  return { ...doc, revision: doc.revision + 1 }
}

export function departmentProfileOf(doc: BotOrganization, departmentId: string): DepartmentProfile {
  return doc.profiles[departmentId] ?? emptyDepartmentProfile()
}

function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) {
    return next
  }
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
  return next
}

export const departmentEdits = {
  setProfile:
    (departmentId: string, patch: Partial<Omit<DepartmentProfile, 'defaults'>>): Edit =>
    (doc) =>
      bump({
        ...doc,
        profiles: {
          ...doc.profiles,
          [departmentId]: { ...departmentProfileOf(doc, departmentId), ...patch }
        }
      }),
  setDefaults:
    (departmentId: string, patch: Partial<DepartmentDefaults>): Edit =>
    (doc) => {
      const profile = departmentProfileOf(doc, departmentId)
      return bump({
        ...doc,
        profiles: {
          ...doc.profiles,
          [departmentId]: { ...profile, defaults: { ...profile.defaults, ...patch } }
        }
      })
    },
  /** overriding: the bot keeps its own value for that field instead of the department's. */
  setOverride:
    (entryKey: string, field: DepartmentDefaultField, overriding: boolean): Edit =>
    (doc) => {
      const current = doc.overrides[entryKey] ?? []
      const fields = overriding
        ? [...new Set([...current, field])]
        : current.filter((entry) => entry !== field)
      const overrides = { ...doc.overrides }
      if (fields.length > 0) {
        overrides[entryKey] = fields
      } else {
        delete overrides[entryKey]
      }
      return bump({ ...doc, overrides })
    },
  /** Moves a department to `toIndex` among all departments (archived ones included). */
  moveDepartment:
    (departmentId: string, toIndex: number): Edit =>
    (doc) => {
      const from = doc.departments.findIndex((d) => d.id === departmentId)
      return from === -1 || from === toIndex
        ? doc
        : bump({ ...doc, departments: moveInList(doc.departments, from, toIndex) })
    },
  moveSection:
    (departmentId: string, sectionId: string, toIndex: number): Edit =>
    (doc) =>
      bump({
        ...doc,
        departments: doc.departments.map((d) => {
          const from = d.sections.findIndex((s) => s.id === sectionId)
          return d.id !== departmentId || from === -1
            ? d
            : { ...d, sections: moveInList(d.sections, from, toIndex) }
        })
      }),
  /** Several bots at once into one place, or out of every department (null). */
  placeMany:
    (entryKeys: readonly string[], target: BotOrganizationPlacement | null): Edit =>
    (doc) => {
      const placements = { ...doc.placements }
      for (const key of entryKeys) {
        if (target) {
          placements[key] = target
        } else {
          delete placements[key]
        }
      }
      return bump({ ...doc, placements })
    }
}

/** The department and section a bot sits in, or null. */
export function departmentOfEntry(
  doc: BotOrganization,
  entryKey: string
): BotOrganizationPlacement | null {
  return doc.placements[entryKey] ?? null
}

/** Whether `entryKey` inherits `field` from its department (it doesn't override it). */
export function inheritsDepartmentDefault(
  doc: BotOrganization,
  entryKey: string,
  field: DepartmentDefaultField
): boolean {
  return !(doc.overrides[entryKey] ?? []).includes(field)
}

/** Entry keys placed in a department (any of its sections included). */
export function departmentMemberKeys(doc: BotOrganization, departmentId: string): string[] {
  return Object.entries(doc.placements)
    .filter(([, placement]) => placement.departmentId === departmentId)
    .map(([key]) => key)
}
