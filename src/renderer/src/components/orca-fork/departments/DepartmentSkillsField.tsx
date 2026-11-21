// orca-fork: the projects whose skills every bot of the department loads (each bot gets those on its
// own machine), or none set so each bot keeps its own.
import React, { useMemo, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { searchRepos } from '@/lib/workspace/catalog/repo-search'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { useHostLabels } from '../agents-board/agents-board-facets'

const MAX_SKILL_PROJECTS = 20

export function DepartmentSkillsField({
  value,
  onChange
}: {
  value: string[] | null
  onChange: (next: string[] | null) => void
}): React.JSX.Element {
  const t = useTranslate()
  const repos = useAppStore((state) => state.repos)
  const [query, setQuery] = useState('')
  const shown = useMemo(() => searchRepos(repos, query), [repos, query])
  const hostIds = useMemo(
    () => [...new Set(repos.map((repo) => getRepoExecutionHostId(repo)))],
    [repos]
  )
  const hostLabels = useHostLabels(hostIds)
  const picked = value ?? []
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={value !== null} onCheckedChange={(on) => onChange(on ? [] : null)} />
        {t('orcaFork.departments.skillsSet', 'Set the same skills for every bot')}
      </label>
      {value !== null ? (
        <div className="flex max-w-xl flex-col gap-1.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('orcaFork.departments.searchProjects', 'Search projects')}
            aria-label={t('orcaFork.departments.searchProjects', 'Search projects')}
          />
          <div className="flex max-h-56 flex-col overflow-y-auto rounded-md border border-border scrollbar-sleek">
            {shown.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t('orcaFork.departments.noProjects', 'No projects.')}
              </p>
            ) : null}
            {shown.map((repo) => {
              const on = picked.includes(repo.id)
              return (
                <label
                  key={repo.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0 hover:bg-accent/40"
                >
                  <Checkbox
                    checked={on}
                    disabled={!on && picked.length >= MAX_SKILL_PROJECTS}
                    onCheckedChange={(next) =>
                      onChange(
                        next === true ? [...picked, repo.id] : picked.filter((id) => id !== repo.id)
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{repo.displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hostLabels[getRepoExecutionHostId(repo)]}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
