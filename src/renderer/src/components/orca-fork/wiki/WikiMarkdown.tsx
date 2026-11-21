// orca-fork: a wiki page's Markdown, with [[Page]] links that open the page (or start it when missing).
import React, { useCallback, useMemo } from 'react'
import CommentMarkdown from '@/components/comment-markdown/CommentMarkdown'
import { replaceWikiLinks } from '../../../../../shared/orca-fork/wiki/wiki-links'

// Sanitizing keeps https links; this host never resolves, and clicks are taken before navigation.
const WIKI_LINK_ORIGIN = 'https://wiki.orca.invalid/'

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

export function WikiMarkdown({
  body,
  onOpenLink
}: {
  body: string
  onOpenLink: (link: { slug: string; title: string }) => void
}): React.JSX.Element {
  const content = useMemo(
    () =>
      replaceWikiLinks(body, (ref) => {
        const page = ref.target.split('#')[0]?.split('/').pop()?.trim() ?? ref.label
        const href = `${WIKI_LINK_ORIGIN}${encodeURIComponent(ref.slug)}?title=${encodeURIComponent(page)}`
        return `[${ref.label.replace(/[[\]]/g, '')}](${href})`
      }),
    [body]
  )
  const onLinkClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, href: string | undefined) => {
      const link = wikiLinkTarget(href)
      if (link) {
        event.preventDefault()
        onOpenLink(link)
      }
    },
    [onOpenLink]
  )
  return (
    <CommentMarkdown
      content={content}
      variant="document"
      onLinkClick={onLinkClick}
      className="text-sm leading-relaxed"
    />
  )
}
