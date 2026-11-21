// orca-fork: whether the Department page covers the main area, which department and tab it shows. Kept
// outside the app store so the fork adds no view to upstream's activeView union.
import { useSyncExternalStore } from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

export const DEPARTMENT_TABS = ['overview', 'defaults', 'dashboard'] as const
export type DepartmentTab = (typeof DEPARTMENT_TABS)[number]

export type DepartmentPageState = {
  open: boolean
  /** null shows the org chart of every department. */
  departmentId: string | null
  tab: DepartmentTab
}

let state: DepartmentPageState = { open: false, departmentId: null, tab: 'overview' }
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(next: Partial<DepartmentPageState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

export function useDepartmentPageState(): DepartmentPageState {
  return useSyncExternalStore(subscribe, () => state)
}

export function useDepartmentPageOpen(): boolean {
  const open = useSyncExternalStore(subscribe, () => state.open)
  return FORK_FEATURES.departmentManagement && open
}

export function openDepartmentPage(departmentId: string | null, tab?: DepartmentTab): void {
  update({
    open: true,
    departmentId,
    tab: tab ?? (departmentId === state.departmentId ? state.tab : 'overview')
  })
}

export function showDepartmentTab(tab: DepartmentTab): void {
  update({ tab })
}

export function closeDepartmentPage(): void {
  if (state.open) {
    update({ open: false })
  }
}

let pendingNameEdit: string | null = null

/** A department just made from the page opens with its name field in edit. */
export function requestDepartmentNameEdit(departmentId: string): void {
  pendingNameEdit = departmentId
}

export function takeDepartmentNameEdit(departmentId: string): boolean {
  if (pendingNameEdit !== departmentId) {
    return false
  }
  pendingNameEdit = null
  return true
}
