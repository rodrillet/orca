// orca-fork: the department's "Token saving" default as Caveman's token-saving mode reads it per bot
// (passed as `department` to resolveTokenSaving, PR #29).
import type { BotOrganization } from '../../../../../shared/orca-fork/organization/bot-organization'
import {
  departmentProfileOf,
  inheritsDepartmentDefault
} from '../../../../../shared/orca-fork/departments/department-edits'
import { readBotOrganization } from '../organization/bot-organization-store'

/**
 * What a bot's department says about token saving: true/false when its department sets it and the bot
 * inherits it, undefined to inherit past it (no department, no default, or the bot overrides it).
 */
export function forkDepartmentTokenSaving(
  botEntryKey: string,
  doc: BotOrganization = readBotOrganization()
): boolean | undefined {
  const placement = doc.placements[botEntryKey]
  if (!placement || !inheritsDepartmentDefault(doc, botEntryKey, 'tokenSaving')) {
    return undefined
  }
  return departmentProfileOf(doc, placement.departmentId).defaults.tokenSaving ?? undefined
}
