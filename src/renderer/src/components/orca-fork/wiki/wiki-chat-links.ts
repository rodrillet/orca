// orca-fork: `[[Page]]` in a chat message draws as a link that opens that wiki page.
import { useCallback } from 'react'
import type { CommentMarkdownLinkClickHandler } from '@/components/comment-markdown/comment-markdown-element-renderers'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { replaceWikiLinks } from '../../../../../shared/orca-fork/wiki/wiki-links'
import { wikiLinkHref, wikiLinkTarget } from './wiki-link-href'
import { openWikiPage } from './wiki-view-state'

/** A message's text with each `[[Page]]` as a Markdown link to the wiki. */
export function forkWikiChatContent(content: string): string {
  return FORK_FEATURES.workspaceWiki && content.includes('[[')
    ? replaceWikiLinks(
        content,
        (ref) => `[${ref.label.replace(/[[\]]/g, '')}](${wikiLinkHref(ref)})`
      )
    : content
}

/** The chat's link handler, with wiki links opening the Wiki page instead. */
export function useForkWikiLinkClick(
  onLinkClick: CommentMarkdownLinkClickHandler | undefined
): CommentMarkdownLinkClickHandler | undefined {
  const handler = useCallback<CommentMarkdownLinkClickHandler>(
    (event, href) => {
      const link = wikiLinkTarget(href)
      if (!link) {
        onLinkClick?.(event, href)
        return
      }
      event.preventDefault()
      openWikiPage({ kind: 'page', slug: link.slug })
    },
    [onLinkClick]
  )
  return FORK_FEATURES.workspaceWiki ? handler : onLinkClick
}
