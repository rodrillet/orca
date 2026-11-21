// orca-fork: the overlays the sidebar and its rail open: workspace settings and the owner's profile.
import React from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { OwnerProfileDialog } from '../owner-profile/OwnerProfileDialog'
import { ForkWorkspaceSettings } from './ForkWorkspaceSettings'

export function ForkWorkspaceOverlays(): React.JSX.Element | null {
  if (!FORK_FEATURES.workspaces || !FORK_FEATURES.workspaceManagement) {
    return null
  }
  return (
    <>
      <ForkWorkspaceSettings />
      <OwnerProfileDialog />
    </>
  )
}
