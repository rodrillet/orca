// orca-fork: how a `[[Page]]` link is written as a Markdown href. Sanitizing keeps https links; this
// host never resolves, and clicks are taken before any navigation.
import type { WikiLinkRef } from '../../../../../shared/orca-fork/wiki/wiki-links'

const WIKI_LINK_ORIGIN = 'https://wiki.orca.invalid/'

export function wikiLinkHref(ref: WikiLinkRef): string {
  const title = ref.target.split('#')[0]?.split('/').pop()?.trim() ?? ref.label
  return `${WIKI_LINK_ORIGIN}${encodeURIComponent(ref.slug)}?title=${encodeURIComponent(title)}`
}

export function wikiLinkTarget(href: string | undefined): { slug: string; title: string } | null {
  if (!href?.startsWith(WIKI_LINK_ORIGIN)) {
    return null
  }
  const url = new URL(href)
  return {
    slug: decodeURIComponent(url.pathname.slice(1)),
    title: url.searchParams.get('title') ?? ''
  }
}
