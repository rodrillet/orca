// orca-fork: writing a wiki page in Markdown, with a preview; a save that raced an agent's edit
// asks whether to load theirs or keep yours.
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTranslate } from '@/i18n/use-translate'
import type { WikiPage } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { callWiki, writeWiki, type WikiTarget } from './wiki-rpc'
import { WikiMarkdown } from './WikiMarkdown'

export type WikiDraft = { title: string; folder: string; tags: string; body: string }

/** A new page's title may carry its folder: "Infra/VPS/" starts an untitled page in Infra/VPS. */
export function draftOf(page: WikiPage | null, title = ''): WikiDraft {
  if (page) {
    return { title: page.title, folder: page.folder, tags: page.tags.join(', '), body: page.body }
  }
  const parts = title.split('/')
  return { title: parts.pop()?.trim() ?? '', folder: parts.join('/'), tags: '', body: '' }
}

function tagsOf(draft: WikiDraft): string[] {
  return draft.tags
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function WikiEditor({
  target,
  page,
  initialTitle,
  onSaved,
  onCancel
}: {
  target: WikiTarget
  /** null for a new page. */
  page: WikiPage | null
  initialTitle?: string
  onSaved: (page: WikiPage) => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [draft, setDraft] = useState<WikiDraft>(() => draftOf(page, initialTitle))
  const [base, setBase] = useState(page?.version ?? 0)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const set = (patch: Partial<WikiDraft>) => setDraft((current) => ({ ...current, ...patch }))

  const save = useCallback(
    async (overwrite = false) => {
      if (!draft.title.trim()) {
        setError(t('orcaFork.wiki.titleRequired', 'A page needs a title.'))
        return
      }
      setSaving(true)
      setError(null)
      try {
        const saved = page
          ? await writeWiki<WikiPage>(target, 'update', {
              page: page.id,
              mode: 'replace',
              body: draft.body,
              title: draft.title,
              folder: draft.folder,
              tags: tagsOf(draft),
              ...(overwrite ? {} : { baseVersion: base })
            })
          : await writeWiki<WikiPage>(target, 'create', {
              title: draft.title,
              body: draft.body,
              folder: draft.folder,
              tags: tagsOf(draft)
            })
        toast.success(
          page ? t('orcaFork.wiki.saved', 'Saved') : t('orcaFork.wiki.created', 'Page created')
        )
        setSaving(false)
        onSaved(saved)
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught)
        setConflict(Boolean(page) && /changed since version/.test(message))
        setError(message)
        setSaving(false)
      }
    },
    [base, draft, onSaved, page, t, target]
  )

  const loadTheirs = useCallback(async () => {
    if (!page) {
      return
    }
    const theirs = await callWiki<WikiPage>(target, 'show', { page: page.id })
    setDraft(draftOf(theirs))
    setBase(theirs.version)
    setConflict(false)
    setError(null)
  }, [page, target])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" onKeyDown={onKeyDown}>
      <Input
        autoFocus={!page}
        value={draft.title}
        onChange={(event) => set({ title: event.target.value })}
        placeholder={t('orcaFork.wiki.titlePlaceholder', 'Page title')}
        aria-label={t('orcaFork.wiki.titleLabel', 'Title')}
        variant="heading"
      />
      <div className="flex flex-wrap gap-2">
        <Input
          value={draft.folder}
          onChange={(event) => set({ folder: event.target.value })}
          placeholder={t('orcaFork.wiki.folderPlaceholder', 'Folder, e.g. Engineering/Backend')}
          aria-label={t('orcaFork.wiki.folder', 'Folder')}
          className="min-w-48 flex-1"
        />
        <Input
          value={draft.tags}
          onChange={(event) => set({ tags: event.target.value })}
          placeholder={t('orcaFork.wiki.tagsPlaceholder', 'Tags, separated by commas')}
          aria-label={t('orcaFork.wiki.tags', 'Tags')}
          className="min-w-48 flex-1"
        />
      </div>
      <div className="flex items-center gap-1">
        {(['write', 'preview'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={mode === value ? 'secondary' : 'ghost'}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {value === 'write'
              ? t('orcaFork.wiki.write', 'Markdown')
              : t('orcaFork.wiki.preview', 'Preview')}
          </Button>
        ))}
        <span className="ml-auto text-2xs text-muted-foreground">
          {t('orcaFork.wiki.linkHint', 'Link pages with [[Page title]]')}
        </span>
      </div>
      {mode === 'write' ? (
        <Textarea
          autoFocus={Boolean(page)}
          variant="code"
          value={draft.body}
          onChange={(event) => set({ body: event.target.value })}
          placeholder={t('orcaFork.wiki.bodyPlaceholder', 'Write in Markdown…')}
          aria-label={t('orcaFork.wiki.body', 'Page text')}
          className="min-h-[320px] flex-1 resize-none"
        />
      ) : (
        <div className="min-h-[320px] flex-1 overflow-y-auto rounded-md border border-border p-4 scrollbar-sleek">
          <WikiMarkdown body={draft.body} onOpenLink={() => undefined} />
        </div>
      )}
      {error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="flex-1">{error}</span>
          {conflict ? (
            <>
              <Button size="sm" variant="outline" onClick={() => void loadTheirs()}>
                {t('orcaFork.wiki.loadTheirs', 'Load their version')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void save(true)}>
                {t('orcaFork.wiki.keepMine', 'Keep mine')}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('orcaFork.wiki.cancel', 'Cancel')}
        </Button>
        <Button disabled={saving} onClick={() => void save()}>
          {page ? t('orcaFork.wiki.save', 'Save') : t('orcaFork.wiki.createPage', 'Create page')}
        </Button>
      </div>
    </div>
  )
}
