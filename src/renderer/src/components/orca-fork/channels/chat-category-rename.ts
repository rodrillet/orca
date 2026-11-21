// orca-fork: a just-created category opens its header in rename mode once.
let pending: string | null = null

export function requestCategoryRename(categoryId: string): void {
  pending = categoryId
}

export function takeCategoryRename(categoryId: string): boolean {
  if (pending !== categoryId) {
    return false
  }
  pending = null
  return true
}
