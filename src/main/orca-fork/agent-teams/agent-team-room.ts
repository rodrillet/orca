// orca-fork: whether a bot group is an autonomous team's room: the team group of a lead the owner
// lets build a team. Its members start requests there without an owner post.
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { agentTeamStore } from './agent-team-store'

export async function isAutonomousTeamGroup(groupId: string): Promise<boolean> {
  if (!FORK_FEATURES.agentTeams) {
    return false
  }
  return (await agentTeamStore().autonomousGroups()).some((entry) => entry.groupId === groupId)
}
