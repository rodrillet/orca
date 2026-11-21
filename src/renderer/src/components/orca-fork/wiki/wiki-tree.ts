// orca-fork: the wiki's folders as a tree, as agentes.chat's: top-level folders are the spaces, the ones
// inside them its sections; a folder counts the pages in it and below it.
import type { WikiPageSummary } from '../../../../../shared/orca-fork/wiki/wiki-types'

export type WikiFolderNode = {
  name: string
  path: string
  /** Pages here and in every subfolder. */
  count: number
  folders: WikiFolderNode[]
  pages: WikiPageSummary[]
}

const byTitle = (a: WikiPageSummary, b: WikiPageSummary) => a.title.localeCompare(b.title)

/** The root node: its pages are the ones in no folder. */
export function buildWikiTree(pages: readonly WikiPageSummary[]): WikiFolderNode {
  const root: WikiFolderNode = { name: '', path: '', count: 0, folders: [], pages: [] }
  for (const page of pages) {
    let node = root
    node.count += 1
    for (const part of page.folder ? page.folder.split('/') : []) {
      const path = node.path ? `${node.path}/${part}` : part
      let child = node.folders.find((entry) => entry.path === path)
      if (!child) {
        child = { name: part, path, count: 0, folders: [], pages: [] }
        node.folders.push(child)
      }
      child.count += 1
      node = child
    }
    node.pages.push(page)
  }
  const sort = (node: WikiFolderNode): void => {
    node.pages.sort(byTitle)
    node.folders.sort((a, b) => a.name.localeCompare(b.name))
    node.folders.forEach(sort)
  }
  sort(root)
  return root
}

export function pagesInFolder(
  pages: readonly WikiPageSummary[],
  folder: string
): WikiPageSummary[] {
  return pages.filter((page) => page.folder === folder || page.folder.startsWith(`${folder}/`))
}

/** "Infra/VPS/Backups" → ["Infra", "Infra/VPS", "Infra/VPS/Backups"]: the folders to open for a page. */
export function folderAncestors(folder: string): string[] {
  const parts = folder ? folder.split('/') : []
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'))
}
