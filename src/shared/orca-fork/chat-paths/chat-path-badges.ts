// orca-fork: which chat text names a file or folder path, and what its badge shows.

/** An absolute (`/a/b`, `~/a`, `C:\a`) path with no spaces, as agents write them in backticks. */
const ABSOLUTE_PATH = /^(?:~|[A-Za-z]:)?[\\/](?:[^\s\\/`'"<>|]+[\\/]?)+$/u
/** `file:line` and `file:line:col` suffixes editors understand. */
const LOCATION_SUFFIX = /:(\d+)(?::(\d+))?$/u

export type ChatPath = { path: string; line: number | null; isDirectory: boolean }

/** The path inline code names, or null for anything else (code, commands, URLs). */
export function readChatPath(text: string): ChatPath | null {
  const trimmed = text.trim()
  if (trimmed.length < 2 || trimmed.length > 1024 || trimmed.includes('://')) {
    return null
  }
  const location = LOCATION_SUFFIX.exec(trimmed)
  const path = location ? trimmed.slice(0, location.index) : trimmed
  if (!ABSOLUTE_PATH.test(path) || path === '/' || path === '~/') {
    return null
  }
  // At least one named segment past the root, so `/` or `~` alone stay text.
  const segments = path.split(/[\\/]/u).filter(Boolean)
  if (segments.length === 0 || (segments.length === 1 && /^(?:~|[A-Za-z]:)$/u.test(segments[0]!))) {
    return null
  }
  return {
    path,
    line: location ? Number(location[1]) : null,
    isDirectory: /[\\/]$/u.test(path) || !/\.[^\\/.]+$/u.test(segments.at(-1) ?? '')
  }
}

/** The badge's short name: the last segment (a folder keeps its trailing slash). */
export function chatPathLabel(path: string): string {
  const trimmed = path.replace(/[\\/]+$/u, '')
  const name = trimmed.split(/[\\/]/u).at(-1) || trimmed
  return path.length > trimmed.length ? `${name}/` : name
}

/** The folder a terminal opens in: the path itself for a folder, else its parent. */
export function chatPathFolder(chatPath: ChatPath): string {
  if (chatPath.isDirectory) {
    return chatPath.path
  }
  const cut = Math.max(chatPath.path.lastIndexOf('/'), chatPath.path.lastIndexOf('\\'))
  return cut > 0 ? chatPath.path.slice(0, cut) : chatPath.path
}
