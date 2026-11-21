import type { TaskPageComposerActionsModel } from './use-task-page-composer-actions'
import { TaskPageListChrome } from './ListChrome'
import { TaskPageContent } from './Content'
// orca-fork: Agents view
import { TaskPageSourceBar } from './SourceBar'
import { AgentsTasksView } from '../orca-fork/agents-tasks/AgentsTasksView'
import { useAgentsTasksViewOpen } from '../orca-fork/agents-tasks/agents-tasks-view-state'
export function TaskPageFrame({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const agentsOpen = useAgentsTasksViewOpen() // orca-fork: Agents view
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Why: pt-1.5 (6px) aligns this 32px icon cluster's center with the sidebar Tasks row, 22px below the titlebar. */}
      <div className="mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col px-5 pt-1.5 pb-4 md:px-8 md:pt-1.5 md:pb-5">
        {agentsOpen ? (
          <>
            <TaskPageSourceBar model={model} />
            <AgentsTasksView />
          </>
        ) : (
          <>
            <TaskPageListChrome model={model} />
            <TaskPageContent model={model} />
          </>
        )}
      </div>
    </div>
  )
}
