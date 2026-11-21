// orca-fork: the machines a workspace can run on: this computer and every paired Orca server.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import {
  LOCAL_EXECUTION_HOST_ID,
  toRuntimeExecutionHostId,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import { isWslHostRuntimeEnvironment } from '../../../../../shared/remote-runtime/host-catalog/runtime-environments'

export type ForkWorkspaceMachine = {
  hostId: ExecutionHostId
  label: string
  /** A paired Orca server, which gets its own workspace automatically. */
  paired: boolean
}

const LABEL_SEPARATOR = '\u0000'

export function useForkWorkspaceMachines(): ForkWorkspaceMachine[] {
  const environments = useAppStore((s) => s.runtimeEnvironments)
  const hostIds = useMemo(
    (): ExecutionHostId[] => [
      LOCAL_EXECUTION_HOST_ID,
      ...environments
        .filter((env) => !isWslHostRuntimeEnvironment(env))
        .map((env) => toRuntimeExecutionHostId(env.id))
    ],
    [environments]
  )
  // Joined into one string so the selector stays stable between renders.
  const joinedLabels = useAppStore((state) =>
    hostIds.map((hostId) => selectExecutionHostDisplayLabel(state, hostId)).join(LABEL_SEPARATOR)
  )
  return useMemo(() => {
    const labels = joinedLabels.split(LABEL_SEPARATOR)
    return hostIds.map((hostId, index) => ({
      hostId,
      label: labels[index] || hostId,
      paired: hostId !== LOCAL_EXECUTION_HOST_ID
    }))
  }, [hostIds, joinedLabels])
}
