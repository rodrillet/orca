// orca-fork: `orcaFork.wiki.*` params. `workspaceId` keys every page; `callerSessionId` names the
// calling agent chat, which the host honors only from its own CLI.
import * as z from 'zod'
import {
  OptionalBoolean,
  OptionalPlainString,
  OptionalPositiveInt,
  OptionalString,
  requiredString
} from './rpc-param-primitives'

const Scope = {
  workspaceId: OptionalString,
  callerSessionId: OptionalString,
  /** A worker or terminal agent with no bot: how it signs its edits. */
  agentName: OptionalString
}
const Page = requiredString('Name the page by its title or slug.')
const Tags = z.array(z.string()).optional()

export const ForkWikiList = z.object({
  ...Scope,
  query: OptionalString,
  tag: OptionalString,
  trash: OptionalBoolean,
  limit: OptionalPositiveInt
})

export const ForkWikiShow = z.object({
  ...Scope,
  page: Page,
  /** Count this read as a view (the owner opening it, or an agent reading it). */
  view: OptionalBoolean
})

export const ForkWikiCreate = z.object({
  ...Scope,
  title: requiredString('Missing --title'),
  body: OptionalPlainString,
  folder: OptionalPlainString,
  tags: Tags,
  note: OptionalString
})

export const ForkWikiUpdate = z.object({
  ...Scope,
  page: Page,
  mode: z.enum(['replace', 'append', 'replace_section']).optional(),
  body: OptionalPlainString,
  section: OptionalString,
  title: OptionalString,
  folder: OptionalPlainString,
  tags: Tags,
  baseVersion: OptionalPositiveInt,
  note: OptionalString
})

export const ForkWikiTag = z.object({
  ...Scope,
  page: Page,
  add: Tags,
  remove: Tags
})

export const ForkWikiLink = z.object({
  ...Scope,
  page: Page,
  to: z.array(z.string()).min(1, 'Name at least one page to link to.'),
  section: OptionalString
})

export const ForkWikiMention = z.object({
  ...Scope,
  page: Page,
  /** Omitted: the calling chat. */
  kind: z.enum(['chat', 'item']).optional(),
  sourceId: OptionalString,
  sourceTitle: OptionalString
})

export const ForkWikiPageRef = z.object({ ...Scope, page: Page })

export const ForkWikiRestoreVersion = z.object({
  ...Scope,
  page: Page,
  version: z.number().int().positive()
})
