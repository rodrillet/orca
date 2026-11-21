// orca-fork: wiki slugs and `[[Title]]` links, as agentes.chat writes them.

/** One `[[…]]`: `[[Title]]`, `[[Folder/Title|text]]`, `[[Page#section]]`. */
export type WikiLinkRef = {
  /** What was written before `|`. */
  target: string
  section: string | null
  label: string
  slug: string
}

/** "Processes/Deploy Guide" → "deploy-guide": the leaf title, unique per workspace. */
export function wikiSlug(title: string): string {
  const leaf = title.split('/').pop()?.trim() || title
  return leaf
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '')
}

/** `[[…]]` but not an embed `![[file.png]]`. */
const LINK = /(?<!!)\[\[([^[\]\n]+)\]\]/g

function linkRef(inner: string): WikiLinkRef | null {
  const [rawTarget, ...rest] = inner.split('|')
  const target = (rawTarget ?? '').trim()
  const hash = target.indexOf('#')
  const page = hash !== -1 ? target.slice(0, hash).trim() : target
  const section = hash !== -1 ? target.slice(hash + 1).trim() || null : null
  const slug = wikiSlug(page)
  if (!slug) {
    return null
  }
  const label = rest.join('|').trim() || page.split('/').pop()?.trim() || page
  return { target, section, label, slug }
}

/** The `[[…]]` links of a markdown text, code skipped, first occurrence of each page. */
export function parseWikiLinks(text: string): WikiLinkRef[] {
  if (!text.includes('[[')) {
    return []
  }
  const clean = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  const out: WikiLinkRef[] = []
  const seen = new Set<string>()
  for (const match of clean.matchAll(LINK)) {
    const ref = linkRef(match[1] ?? '')
    if (ref && !seen.has(ref.slug)) {
      seen.add(ref.slug)
      out.push(ref)
    }
  }
  return out
}

/** Rewrites each `[[…]]` (outside code) with `render`, for showing the links as markdown links. */
export function replaceWikiLinks(text: string, render: (ref: WikiLinkRef) => string): string {
  if (!text.includes('[[')) {
    return text
  }
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(LINK, (whole, inner: string) => {
            const ref = linkRef(inner)
            return ref ? render(ref) : whole
          })
    )
    .join('')
}

/** Tags are lowercase words: "Deploy Notes" → "deploy-notes". */
export function normalizeWikiTag(tag: string): string {
  return tag
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function normalizeWikiTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map(normalizeWikiTag).filter(Boolean))].slice(0, 20)
}

/** A text section: from its heading to the next heading of the same or a higher level. */
export function wikiSectionRange(
  body: string,
  heading: string
): { start: number; end: number; level: number } | null {
  const lines = body.split('\n')
  const want = heading
    .trim()
    .replace(/^#+\s*/, '')
    .toLowerCase()
  let offset = 0
  let found: { start: number; level: number } | null = null
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (match) {
      const level = match[1]!.length
      if (found && level <= found.level) {
        return { start: found.start, end: offset, level: found.level }
      }
      if (!found && match[2]!.toLowerCase() === want) {
        found = { start: offset, level }
      }
    }
    offset += line.length + 1
  }
  return found ? { start: found.start, end: body.length, level: found.level } : null
}

/** Appends `text` at the end of the page, or at the end of `section` (created when missing). */
export function appendToWikiBody(
  body: string,
  text: string,
  section: string | null,
  mode: 'append' | 'replace_section'
): string {
  const trimmed = text.replace(/\s+$/, '')
  if (!section) {
    return `${body.replace(/\s+$/, '')}${body.trim() ? '\n\n' : ''}${trimmed}\n`
  }
  const range = wikiSectionRange(body, section)
  if (!range) {
    return `${body.replace(/\s+$/, '')}${body.trim() ? '\n\n' : ''}## ${section.trim()}\n\n${trimmed}\n`
  }
  const head = body.slice(range.start, range.end).split('\n')[0] ?? ''
  const before = body.slice(0, range.start)
  const after = body.slice(range.end)
  const current = body.slice(range.start + head.length, range.end).replace(/\s+$/, '')
  const inner = mode === 'replace_section' ? `\n\n${trimmed}` : `${current}\n${trimmed}`
  return `${before}${head}${inner}\n${after ? `\n${after.replace(/^\n+/, '')}` : ''}`
}
