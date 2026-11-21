// orca-fork: Channels and their categories, as agentes.chat's. A channel is a bot group the owner
// marked as one (a topic room where several bots and the owner talk); categories organize channels
// only (departments organize bots). One versioned document keyed by the sidebar entry key `hostId/id`.

export const CHAT_STRUCTURE_VERSION = 1

export type ChatCategory = {
  id: string
  name: string
  /** The fork workspace it shows in; null shows it in every workspace. */
  workspaceId: string | null
}

export type ChatChannel = {
  /** Null: the channels with no category, right under the Channels header. */
  categoryId: string | null
  order: number
  muted: boolean
}

export type ChatStructure = {
  version: typeof CHAT_STRUCTURE_VERSION
  revision: number
  /** In sidebar order. */
  categories: ChatCategory[]
  channels: Record<string, ChatChannel>
  /** Folded headers: `CHANNELS_HEADER_KEY` or a category id. */
  collapsed: string[]
  /** Typing and new-message sounds (Settings › Sounds). */
  sounds: { enabled: boolean; volume: number }
}

export const CHANNELS_HEADER_KEY = 'fork-channels'

export function emptyChatStructure(): ChatStructure {
  return {
    version: CHAT_STRUCTURE_VERSION,
    revision: 0,
    categories: [],
    channels: {},
    collapsed: [],
    sounds: { enabled: true, volume: 0.4 }
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

function readId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 ? value : null
}

function readName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : null
}

/** Reads a stored document, dropping anything malformed instead of failing. */
export function normalizeChatStructure(raw: unknown): ChatStructure {
  const doc = emptyChatStructure()
  const input = readRecord(raw)
  doc.revision =
    typeof input.revision === 'number' && Number.isFinite(input.revision) ? input.revision : 0
  const seen = new Set<string>()
  for (const item of Array.isArray(input.categories) ? input.categories : []) {
    const category = readRecord(item)
    const id = readId(category.id)
    const name = readName(category.name)
    if (id && name && !seen.has(id)) {
      seen.add(id)
      doc.categories.push({ id, name, workspaceId: readId(category.workspaceId) })
    }
  }
  for (const [key, value] of Object.entries(readRecord(input.channels))) {
    const channel = readRecord(value)
    const categoryId = readId(channel.categoryId)
    doc.channels[key] = {
      categoryId: categoryId && seen.has(categoryId) ? categoryId : null,
      order:
        typeof channel.order === 'number' && Number.isFinite(channel.order) ? channel.order : 0,
      muted: channel.muted === true
    }
  }
  doc.collapsed = Array.isArray(input.collapsed)
    ? input.collapsed.filter((key): key is string => typeof key === 'string')
    : []
  const sounds = readRecord(input.sounds)
  doc.sounds = {
    enabled: sounds.enabled !== false,
    volume:
      typeof sounds.volume === 'number' && sounds.volume >= 0 && sounds.volume <= 1
        ? sounds.volume
        : 0.4
  }
  return doc
}

type Edit = (doc: ChatStructure) => ChatStructure

function bump(doc: ChatStructure): ChatStructure {
  return { ...doc, revision: doc.revision + 1 }
}

/** The channels of one category (or none) in order, `key` left out. */
function siblings(doc: ChatStructure, categoryId: string | null, key: string): string[] {
  return Object.entries(doc.channels)
    .filter(([other, channel]) => other !== key && channel.categoryId === categoryId)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([other]) => other)
}

/** Puts `key` in `categoryId` before `beforeKey` (or at the end) and numbers that category again. */
function place(
  doc: ChatStructure,
  key: string,
  categoryId: string | null,
  beforeKey: string | null,
  muted: boolean
): ChatStructure {
  const order = siblings(doc, categoryId, key)
  const at = beforeKey ? order.indexOf(beforeKey) : -1
  order.splice(at >= 0 ? at : order.length, 0, key)
  const channels = { ...doc.channels }
  order.forEach((other, index) => {
    channels[other] =
      other === key ? { categoryId, order: index, muted } : { ...channels[other]!, order: index }
  })
  return bump({ ...doc, channels })
}

export const chatStructureEdits = {
  addCategory:
    (id: string, name: string, workspaceId: string | null, beforeId: string | null = null): Edit =>
    (doc) => {
      const categories = [...doc.categories]
      const at = beforeId ? categories.findIndex((c) => c.id === beforeId) : -1
      categories.splice(at >= 0 ? at : categories.length, 0, {
        id,
        name: readName(name) ?? id,
        workspaceId
      })
      return bump({ ...doc, categories })
    },
  renameCategory:
    (id: string, name: string): Edit =>
    (doc) => {
      const clean = readName(name)
      return clean
        ? bump({
            ...doc,
            categories: doc.categories.map((c) => (c.id === id ? { ...c, name: clean } : c))
          })
        : doc
    },
  /** Its channels stay channels, with no category. */
  removeCategory:
    (id: string): Edit =>
    (doc) =>
      bump({
        ...doc,
        categories: doc.categories.filter((c) => c.id !== id),
        channels: Object.fromEntries(
          Object.entries(doc.channels).map(([key, channel]) => [
            key,
            channel.categoryId === id ? { ...channel, categoryId: null } : channel
          ])
        ),
        collapsed: doc.collapsed.filter((key) => key !== id)
      }),
  moveCategory:
    (id: string, beforeId: string | null): Edit =>
    (doc) => {
      const moving = doc.categories.find((c) => c.id === id)
      if (!moving || beforeId === id) {
        return doc
      }
      const categories = doc.categories.filter((c) => c.id !== id)
      const at = beforeId ? categories.findIndex((c) => c.id === beforeId) : -1
      categories.splice(at >= 0 ? at : categories.length, 0, moving)
      return bump({ ...doc, categories })
    },
  /** Marks a group as a channel, or moves a channel to a category (null: none) before `beforeKey`. */
  placeChannel:
    (key: string, categoryId: string | null, beforeKey: string | null = null): Edit =>
    (doc) =>
      place(doc, key, categoryId, beforeKey, doc.channels[key]?.muted ?? false),
  /** Back to a plain group in the Bots list. */
  unmarkChannel:
    (key: string): Edit =>
    (doc) => {
      if (!doc.channels[key]) {
        return doc
      }
      const channels = { ...doc.channels }
      delete channels[key]
      return bump({ ...doc, channels })
    },
  setMuted:
    (key: string, muted: boolean): Edit =>
    (doc) => {
      const channel = doc.channels[key]
      return channel
        ? bump({ ...doc, channels: { ...doc.channels, [key]: { ...channel, muted } } })
        : doc
    },
  toggleCollapsed:
    (headerKey: string): Edit =>
    (doc) =>
      bump({
        ...doc,
        collapsed: doc.collapsed.includes(headerKey)
          ? doc.collapsed.filter((key) => key !== headerKey)
          : [...doc.collapsed, headerKey]
      }),
  setCollapsed:
    (headerKeys: readonly string[], collapsed: boolean): Edit =>
    (doc) =>
      bump({
        ...doc,
        collapsed: collapsed
          ? [...new Set([...doc.collapsed, ...headerKeys])]
          : doc.collapsed.filter((key) => !headerKeys.includes(key))
      }),
  setSounds:
    (sounds: Partial<ChatStructure['sounds']>): Edit =>
    (doc) =>
      bump({ ...doc, sounds: { ...doc.sounds, ...sounds } })
}

/** A header row the Bots list draws above its bots: Channels, or one category. */
export type ChatStructureHeader = {
  kind: 'fork-chat-header'
  id: string
  level: 0 | 1
  title: string
  count: number
  collapsed: boolean
  /** The category it stands for; null for the Channels header. */
  categoryId: string | null
}

export function isChatStructureHeader(row: unknown): row is ChatStructureHeader {
  return typeof row === 'object' && row !== null && 'kind' in row && row.kind === 'fork-chat-header'
}

/** The categories one workspace shows, in order. */
export function workspaceCategories(
  doc: ChatStructure,
  workspaceId: string | null
): ChatCategory[] {
  return doc.categories.filter(
    (c) => c.workspaceId === null || workspaceId === null || c.workspaceId === workspaceId
  )
}

/**
 * Splits the Bots list's entries into channel rows (Channels header, its loose channels, each
 * category's header and channels) and the rest, which keep their own grouping.
 */
export function splitChannelEntries<E extends { id: string; kind: string }>(
  entries: readonly E[],
  doc: ChatStructure,
  workspaceId: string | null,
  title: string
): { rows: (E | ChatStructureHeader)[]; rest: readonly E[]; channels: readonly E[] } {
  const channels = entries.filter((entry) => entry.kind === 'group' && doc.channels[entry.id])
  const categories = workspaceCategories(doc, workspaceId)
  if (channels.length === 0 && categories.length === 0) {
    return { rows: [], rest: entries, channels }
  }
  const shown = new Set(categories.map((c) => c.id))
  const categoryOf = (entry: E): string | null => {
    const id = doc.channels[entry.id]?.categoryId ?? null
    return id && shown.has(id) ? id : null
  }
  const ordered = [...channels].sort(
    (a, b) => (doc.channels[a.id]?.order ?? 0) - (doc.channels[b.id]?.order ?? 0)
  )
  const sectionCollapsed = doc.collapsed.includes(CHANNELS_HEADER_KEY)
  const rows: (E | ChatStructureHeader)[] = [
    {
      kind: 'fork-chat-header',
      id: CHANNELS_HEADER_KEY,
      level: 0,
      title,
      count: channels.length,
      collapsed: sectionCollapsed,
      categoryId: null
    }
  ]
  if (!sectionCollapsed) {
    rows.push(...ordered.filter((entry) => categoryOf(entry) === null))
    for (const category of categories) {
      const inside = ordered.filter((entry) => categoryOf(entry) === category.id)
      const collapsed = doc.collapsed.includes(category.id)
      rows.push({
        kind: 'fork-chat-header',
        id: `fork-chat-category:${category.id}`,
        level: 1,
        title: category.name,
        count: inside.length,
        collapsed,
        categoryId: category.id
      })
      if (!collapsed) {
        rows.push(...inside)
      }
    }
  }
  const channelIds = new Set(channels.map((entry) => entry.id))
  return { rows, rest: entries.filter((entry) => !channelIds.has(entry.id)), channels }
}
