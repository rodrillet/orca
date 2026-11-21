// orca-fork: the Artifacts page's slot shows the Drive while the sidebar's Drive entry is picked.
import { lazy } from 'react'
import { useForkDriveOpen } from './drive-page-state'

const ForkDrivePage = lazy(() => import('./ForkDrivePage'))

export function ForkArtifactsSlot({
  artifacts
}: {
  artifacts: React.ReactNode
}): React.JSX.Element {
  return useForkDriveOpen() ? <ForkDrivePage /> : <>{artifacts}</>
}
