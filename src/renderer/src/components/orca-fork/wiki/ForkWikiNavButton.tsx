// orca-fork: "Wiki" in the sidebar's top navigation, beside Tasks.
import React from 'react'
import { Library } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { closeWikiPage, openWikiPage, useWikiPageOpen } from './wiki-view-state'

export function ForkWikiNavButton(): React.JSX.Element | null {
  const t = useTranslate()
  const open = useWikiPageOpen()
  if (!FORK_FEATURES.workspaceWiki) {
    return null
  }
  return (
    <button
      type="button"
      data-fork-wiki-nav=""
      onClick={() => (open ? closeWikiPage() : openWikiPage())}
      aria-current={open ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        open
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <Library
        className={cn('size-4 shrink-0', !open && 'text-worktree-sidebar-foreground/30')}
        strokeWidth={open ? 2.25 : 1.75}
      />
      <span className="flex-1">{t('orcaFork.wiki.title', 'Wiki')}</span>
    </button>
  )
}
