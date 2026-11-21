// orca-fork: a wiki page's Markdown, with [[Page]] links that open the page (or start it when missing).
import React, { useCallback, useMemo } from 'react'
import CommentMarkdown from '@/components/comment-markdown/CommentMarkdown'
import { replaceWikiLinks } from '../../../../../shared/orca-fork/wiki/wiki-links'
import { wikiLinkHref, wikiLinkTarget } from './wiki-link-href'

export function WikiMarkdown({
  body,
  onOpenLink
}: {
  body: string
  onOpenLink: (link: { slug: string; title: string }) => void
}): React.JSX.Element {
  const content = useMemo(
    () =>
      replaceWikiLinks(body, (ref) => `[${ref.label.replace(/[[\]]/g, '')}](${wikiLinkHref(ref)})`),
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
