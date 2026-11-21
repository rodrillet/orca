// orca-fork: `#group` references in any chat, as agentes.chat's `#channel`: typed as `#<slug>`, drawn as
// a link to the bot group whose name has that slug now.

/** `#name` after the start, a space or an opening bracket; the name holds a letter, so `#123` stays an issue. */
const GROUP_REF = /(^|[\s([{])#([\p{L}\p{N}_-]*\p{L}[\p{L}\p{N}_-]*)/gu

/** "Equipe de Vendas" → "equipe-de-vendas": what `#` inserts and what a reference matches. */
export function groupSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}

export type GroupRefPart = { text: string; slug?: string }

/** `text` cut around its `#name` references, each with its slug (lower case). */
export function splitGroupRefs(text: string): GroupRefPart[] {
  const parts: GroupRefPart[] = []
  let last = 0
  for (const match of text.matchAll(GROUP_REF)) {
    const start = (match.index ?? 0) + match[1].length
    const name = match[2]
    if (start > last) {
      parts.push({ text: text.slice(last, start) })
    }
    parts.push({ text: `#${name}`, slug: name.toLowerCase() })
    last = start + 1 + name.length
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last) })
  }
  return parts
}

/** The `#query` being typed before the caret, with where its `#` is; null when the caret isn't in one. */
export function groupMentionQuery(before: string): { from: number; query: string } | null {
  const match = /(?:^|[\s([{])#([\p{L}\p{N}_-]*)$/u.exec(before)
  if (!match) {
    return null
  }
  return { from: before.length - match[1].length - 1, query: match[1].toLowerCase() }
}

export const GROUP_PICK_LIMIT = 8

/** Groups `#query` can mean: slugs containing it, those starting with it first, then by name. */
export function groupOptions<G extends { name: string }>(
  query: string,
  groups: readonly G[],
  limit = GROUP_PICK_LIMIT
): G[] {
  const rank = (group: G) => (groupSlug(group.name).startsWith(query) ? 0 : 1)
  return groups
    .filter(
      (group) => groupSlug(group.name).includes(query) && /\p{L}/u.test(groupSlug(group.name))
    )
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** A picked group's link scheme: the message keeps the group's id, so a rename never breaks it. */
export const GROUP_MENTION_PREFIX = 'bot-group:'

const GROUP_MENTION = /\[#((?:\\[\\[\]]|[^\\[\]\n])+)\]\(bot-group:([\w-]+)\)/g

/** What picking a group writes: `[#<name>](bot-group:<id>)`, the name escaped as link text. */
export function groupMentionToken(group: { id: string; name: string }): string {
  return `[#${group.name.replace(/[\\[\]]/g, '\\$&')}](${GROUP_MENTION_PREFIX}${group.id})`
}

export type GroupMention = { id: string; name: string }

/** `text` cut at each group token: the text between, and each token's id and the name it was written with. */
export function splitGroupMentions(text: string): (string | GroupMention)[] {
  const parts: (string | GroupMention)[] = []
  let last = 0
  for (const match of text.matchAll(GROUP_MENTION)) {
    const start = match.index ?? 0
    if (start > last) {
      parts.push(text.slice(last, start))
    }
    parts.push({ id: match[2], name: match[1].replace(/\\(.)/g, '$1') })
    last = start + match[0].length
  }
  if (last < text.length) {
    parts.push(text.slice(last))
  }
  return parts
}
