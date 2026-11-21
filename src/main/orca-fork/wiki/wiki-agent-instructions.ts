// orca-fork: what a bot is told about the workspace wiki, so it reads before working and writes what it learns.
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'

export function forkWikiBotTools(cli: string): string[] {
  return FORK_FEATURES.workspaceWiki
    ? [
        `- The workspace wiki (what you and the other agents learned: how-tos, decisions and why, gotchas, where things are): \`${cli} wiki search "<words>"\`, \`${cli} wiki show "<page>"\`; write with \`${cli} wiki create\`, \`${cli} wiki update\`, \`${cli} wiki tag\`, \`${cli} wiki link\`. Details: \`${cli} wiki create --help\`.`
      ]
    : []
}

export function forkWikiBotRules(cli: string): string[] {
  return FORK_FEATURES.workspaceWiki
    ? [
        `- Before you work on something, \`${cli} wiki search\` for it and read the pages that fit; they hold what earlier work learned.`,
        `- When a task teaches you something someone will need again (how a system or service works, a fix and its cause, a decision and why, a command or setup step, a gotcha, where something lives), write it to the wiki before you finish, without being asked: update the page that covers it (\`${cli} wiki update "<page>" --section "<heading>" --body-file -\`) or create one (\`${cli} wiki create --title "<topic>" --tag <tag> --body-file -\`). One topic per page, short Markdown, 1 to 3 tags, related pages linked as [[Page title]]. Never write secrets, tokens or personal data, and no status reports or chat logs.`,
        `- When you cite a page to your owner, write it as [[Page title]] and run \`${cli} wiki mention "<page>"\` from that chat (\`--item <n>\` when you cite it on an item), so the page shows where it was used.`
      ]
    : []
}

/** A dispatched worker's brief gains this section: workers do most of the work, so they learn most. */
export function forkWikiWorkerSection(cli: string): string {
  return FORK_FEATURES.workspaceWiki
    ? `

=== WIKI ===
The team keeps a wiki of what agents learned. Before you start, \`${cli} wiki search "<words>"\` and read
what fits. Before worker_done, write down what you learned that someone will need again (how something
works, a fix and its cause, a gotcha, a command): \`${cli} wiki update "<page>" --section "<heading>" --body-file - --as worker\`
or \`${cli} wiki create --title "<topic>" --tag <tag> --body-file - --as worker\`. One topic per page,
short Markdown, related pages linked as [[Page title]]; never secrets or status reports.`
    : ''
}
