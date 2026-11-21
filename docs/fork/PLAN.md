# rodrillet/orca — fork plan

Custom Orca for one owner: a Mac (Apple Silicon) running the desktop app and paired VPSes running
`orca-server`. Upstream is [stablyai/orca](https://github.com/stablyai/orca) (MIT). UX reference:
agentes.chat (`rodrillet/agentes-chat`, branch `vps-zen`, PR #1: agent photo + per-agent sidebar).

## Base and compatibility

- **Base: upstream tag `v1.4.266` (`903c91e80fb`)**, the exact build the owner runs on the Mac and on
  the VPS (`orca-serve` user service). Same wire protocol, same data schema, zero skew.
- Fork `main` follows **upstream release tags, not upstream `main`**. Release tags are cut off upstream
  `main` with a version bump, so each sync is a normal merge. The desktop app and `orca-server` are
  always built from the same merged tree, so they stay protocol-compatible with each other.
- `package.json` keeps upstream's version. The fork is marked by `src/shared/orca-fork/fork-features.ts`, not
  by a version suffix, so the desktop↔server version checks behave exactly as upstream's.
- Every fork feature is designed to work against a **stock** `orca-server` of the same version when
  possible (it uses RPCs the server already has). Features that need server-side code say so and are
  gated by a capability check, so a stock server degrades instead of breaking.

## Keeping merges easy

- Fork code lives in its own modules: `src/shared/orca-fork/`, `src/main/orca-fork/`,
  `src/renderer/src/components/orca-fork/`, `docs/fork/`, `.github/workflows/fork-*.yml`.
- Upstream files get only small touch points (an import plus a mounted component or a guarded call),
  each marked `// orca-fork:` so conflicts are easy to find (`git grep -n "orca-fork:"`).
- Features are behind flags in `src/shared/orca-fork/fork-features.ts`, on by default in fork builds.
- Upstream's 77 workflows are **disabled in the fork** through the Actions API (no file changes, so no
  merge conflicts); the sync job disables any new upstream workflow it brings in. Fork CI is
  `fork-ci.yml`.

## Phases

Each phase is one PR against fork `main`, merged when fork CI is green.

### Phase 0 — Foundation and update pipeline (feature 7)

- **Flags**: `src/shared/orca-fork/fork-features.ts` (source constants; upstream never edits it).
- **Updater off**: `src/main/orca-fork/fork-updater.ts` `isUpdaterActive()` replaces the six
  `app.isPackaged` gates of the updater (setup, scheduling, menu checks, pinned builds, nudges, and the
  status a paired desktop reads before pushing a server update). The custom desktop never checks or
  downloads upstream releases, and the fork's `orca-server` never updates itself to a stock build nor
  lets a paired desktop do it. Upstream's updater tests still run the gates (`VITEST`).
- **Release metadata**: `publish.owner` is `rodrillet` in `config/electron-builder.config.cjs`.
- **Fork CI** (`fork-ci.yml`, job `check`, required on `main`): typecheck; lint, format and unit tests
  of every fork-owned file (fork modules + upstream files marked `orca-fork:`); on phase PRs also
  `pnpm check:changed` against `main`.
- **Sync** (`fork-sync.yml`, daily 09:17 UTC + on demand): merges the latest upstream **release tag**
  into `sync/<tag>`, opens a PR that auto-merges when Fork CI passes. Conflict → an issue listing the
  files and the commands to resolve. Needs the `FORK_SYNC_TOKEN` secret (GITHUB_TOKEN can't push
  upstream's workflow changes nor start the PR's checks).
- **Build** (`fork-build.yml`, every push to `main` + on demand): qualifies the server template with
  upstream's own reusable workflow on GitHub-hosted runners, packs `orca-server-linux-arm64.tar.gz`
  (smoke-tested: starts and pairs), builds the macOS arm64 app on `macos-15` (zip + dmg, ad-hoc
  signed, not notarized), and publishes both in one Release `v<upstream>-fork.<run>`. It also keeps
  any workflow a merge brought in disabled.

**User data**: the app keeps upstream's `appId` (`com.stablyai.orca`) and product name, so it reads and
writes the same `~/Library/Application Support/orca`. Replacing the `.app` never touches that folder.
Upstream schema migrations run forward exactly as on a normal upstream update. (Going back to an
_older_ official build after a newer fork build is the only unsafe direction, same as upstream.)

**Why the updater is off rather than pointed at the fork**: macOS Squirrel/ShipIt only installs an
update whose code signature matches the running app; an ad-hoc signed build can't satisfy that. With a
Developer ID certificate in the fork's secrets this can be switched to the fork's release feed later.
Until then, updating = download the zip from the fork's Releases and replace the app.

### Phase 1 — Bot photos and the agent sidebar (features 1, 2)

Upstream 1.4.266 already has most of this: per-bot upload (`bots.avatar.upload`, cropped 512 px PNG in
the bot's home), mascot or AI-generated default pictures, the picture shown in the sidebar, chats and
groups, a status badge on the picture (working / needs you / idle), the newest line + age, unread
mark, and a fold that lists the bot's chats and workers.

Gaps to close (renderer only, works with a stock server):

- Unread **count** (not just a dot) per bot and per chat, like agentes.chat.
- Expanded chat rows show last message, age or unread count, and a spinner where the bot is working.
- Upload entry point visible from the bot's row menu ("Change photo…"), not only from settings.

### Phase 2 — Organization and machines (features 3, 6)

Model: **Departments > Sections**, two levels, each bot (and bot group) in at most one place; a
department can hold bots directly, so a flat set of groups is just departments without sections.
This mirrors Orca's existing two-level "project group > project" sidebar.

- Stored by the desktop in `userData/orca-fork/organization.json` (own IPC, keyed by `hostId/botId`), so
  it works for bots on any paired machine without a server change. Not synced to the phone (v1). The
  file is one versioned document (revision + entries keyed by host and id, no Mac-only paths), so a
  later phase can keep it on a paired fork server and sync it like other host state.
- Sidebar "Bot options" gains **Group by: None · Machine · Organization**. Machine groups bots (and
  their chats) under "This Mac", "VPS 1", … using the paired environment names; Organization shows
  departments/sections with drag & drop and a "Move to…" menu; create/rename/delete inline.
- Workspaces: a **Machine** option in the projects' Group by, so one window shows every paired
  environment's workspaces grouped by computer (agentes.chat "computers").

### Phase 3 — Agents in Tasks (feature 4)

A new **Agents** source in the Tasks page: one card per bot across all machines with what it is doing
now (`bots.activity` / now line), its items by status (`bots.items.owner.list`), its worker dispatches
with status and linked PRs (`bots.work.list`, orchestration dispatches), and quick links to open the
chat or the item. Renderer only; all RPCs exist in the stock server.

### Phase 4 — Teams of agents (feature 5)

What upstream already allows: a bot can propose new bots (`orca bot create --offer` → a card the owner
presses), bot groups (shared room, @Name hand-off, peer requests), items for another bot
(`orca bot items add --for <bot>`), and orchestration workers.

Gaps to close:

- **Team builder permission** per bot (owner opt-in, off by default): offers from that bot are
  accepted automatically (`bots.create` with `fromOffer`, the same path as pressing Create), with a
  cap on how many bots it may create per day and a toast/audit line for each.
- **Team channel**: bots created from one bot's offers join a bot group "<Lead>'s team" with the lead,
  created/updated automatically, so they share one room and context.
- **Delegation without approvals**: in a team group, members may hand off (@Name) and file items for
  each other without the owner approving each step; the owner sees it all in the group and in Tasks.
- Client-driven in the desktop first (works with a stock server while the Mac is open). Running it with
  the Mac closed needs the same logic inside `orca-server` → fork server build (capability-gated).

### Workspaces (top level, like agentes.chat)

A **workspace** (name, photo) is the fork's top level and is bound to where it runs: this computer or a
paired machine (`ExecutionHostId`), several may share one machine. It holds that machine's projects, bots
(with their departments/sections), wiki, drive and chats; a machine's items no workspace claims belong to
its home (oldest) workspace. Ids and types live in `src/shared/orca-fork/workspaces/fork-workspace.ts`;
every feature that keeps data per workspace keys it by `ForkWorkspaceId`. The sidebar header shows the
active workspace with a switcher, and everything below filters to it.

### Agents board (Agent Dashboard promoted)

The experimental Agent Dashboard is on by default (`experimentalAgentDashboardPopout` defaults to
`FORK_FEATURES.agentsBoard`) and opens on a **Bots** Kanban, with upstream's terminals board behind a
Bots | Terminals switch. Columns A fazer / Em andamento / Precisa de você / Concluído; one card per bot
item and per worker no item links, with the bot's photo and presence, PR/CI badge, machine and
workspace. Dragging an item card (or "Move to…") calls `bots.items.owner.status`. Each card says what was
done (the item's close note or newest worker report, a worker's result), its done-means, who and where,
start → end · duration, PR/CI and link counts; a click opens a detail drawer beside the board (status,
times, by, PR; the item's full Activity with status changes, comments and worker results; each worker's
report and PR; Drive files and Wiki pages written while it ran). Filters: workspace,
machine, bot, tag (Phase 2 departments/sections), saved per `ForkWorkspaceId`. Linked both ways with the
Tasks Agents view. Renderer only; stock `orca-server` works. Code: `src/renderer/src/components/orca-fork/agents-board/`.

### One full page at a time

The Wiki and the Agents board sit over the main area outside upstream's `activeView`, so
`src/renderer/src/components/orca-fork/page-switch/` closes them on every page switch (a store
subscription, so a batched there-and-back still counts), when the other one or the Drive opens, and when
a sidebar page entry is picked again. Bot presence on the Agents views counts only workers on a turn
(an open worker resting after its report is idle) and the Chat's status only while fresh and awake.

### Wiki (agentes.chat's wiki, with consultations)

Per-workspace wiki on the host that runs the bots (`userData/orca-fork-wiki.sqlite`), laid out as
agentes.chat's: left column Home · Consultations · Agents · Trash, the pinned pages, a tree of spaces
(top-level folders) and sections (subfolders), tags; home with pinned and recently edited pages, "What the
agents consult most" (7 days, owner reads excluded), the spaces and the latest consultations; a page reads
in one column (path, actions, title, meta line, text) with "About the page" under it (agents that use it,
its consultation log, where it is mentioned, history).

- **Consultations**: every `orca wiki show` (and the owner opening a page) logs who, when, the agent's chat
  (`callerSessionId` → title) and, for a dispatched worker, its orchestration task (`ORCA_TERMINAL_HANDLE`
  → active dispatch → task title). `orcaFork.wiki.activity` answers the log (all, one reader, one page),
  readers and the popular pages; `orca wiki consultations` prints it. `orcaFork.wiki.pin` pins a page.
- **Migration**: opening an older wiki adds the new columns (`pinned`, `chat_title`, `task_id`,
  `task_title`); pages, versions and reads stay. A paired server without the new methods still shows the
  pages; the Consultations/Agents views say to install the fork's latest `orca-server` there.

### Interface customization (Settings › Appearance › Customization)

A group at the top of Settings › Appearance, kept in this computer's settings (`orcaForkAppearance`):

- **Color theme**: Orca, Agentes, Papel, Oceano, Floresta, Ameixa, Rosé, Grafite. One hue tints the
  sidebar and the pages (agentes.chat's sky paper), in light and dark (`data-fork-palette`).
- **Accent**: agentes.chat's agent tones (sky, indigo, violet, rose, amber, green, teal) or any color.
  It paints buttons, links, focus rings and selected marks.
- **Density**: Compact, Standard, Comfortable, through Tailwind's `--spacing`.
- **Sidebar style**: Flat, or Inset (the work area as a rounded sheet on the sidebar's paper).
- **Window opacity**: 50–100% (`BrowserWindow.setOpacity`, macOS and Windows).
- **Window material** (upstream's setting) plus **Translucent interface**: 0–80%, how much of the
  material (macOS vibrancy) shows through the sidebar and pages. A value above 0 keeps the material on with
  opaque terminals (`resolveWindowMaterial`); turning it on needs a restart.

Code: `src/shared/orca-fork/appearance/`, `src/renderer/src/components/orca-fork/appearance/`,
`src/main/orca-fork/appearance/`. Plugin themes paint their tokens inline, so fork choices use
`!important`; with "Orca" and the theme-default accent, nothing is overridden.

### Phase 5 — Shared agent computer (dropped)

Dropped by the owner (2026-11-21): a desktop per machine costs too much RAM/CPU on the VPS. Nothing
of it ships: no desktop service, scripts or agent tools.

### Drive (agentes.chat's Drive)

Every file the owner sends in a chat and every file agents make lands in a per-workspace **Drive**
(sidebar → Drive, under Tasks), across this Mac and every paired server.

- **Storage**: on the host that runs the bots (`userData/orca-fork/drive/<workspace>/index.json` +
  `blobs/<id>`), so a paired server keeps its own bots' files; the page merges every host's Drive.
- **Ingestion**: (1) chat uploads are copied when the host claims them for the message (every claim passes
  `claimAgentSessionAttachmentsInTransaction`, which tells the Drive with the message's journal item id),
  so they outlive the attachment sweep and Open the chat scrolls to that message; (2) at each turn end, new
  or changed files in the chat's scratch folder (`ORCA_CHAT_SCRATCH_DIR`, where agents put what they show
  in chat) are kept, a rewrite updating the same file; (3) agents run `orca files save <file> [--note]
  [--folder]` (taught in the bot preamble), linked to their chat; files they attach with `orca bot reply
  --file` or `orca slack attach` are saved too; (4) the owner uploads on the page (button or drag & drop).
- **Page**: grid/list, folders, search, filters (who, type, agent, computer, chat), preview (images, PDF,
  Markdown, text, code, video, audio), download, rename, move, trash/restore/delete forever, and "where it
  came from" (the bot, its note or the message's words, Open the chat).
- **RPC**: `orcaFork.drive.*` on the runtime (`src/main/runtime/rpc/methods/orca-fork/`). A stock
  `orca-server` answers `method_not_found`; the page shows a notice to install the fork's server there.
- **Scoping**: the page follows the active fork workspace (`ForkWorkspaceId`): it reads that workspace's
  machine and shows what was put in it, its bots' files, and (for a machine's home workspace) everything
  else on that machine. Uploads carry the workspace id; captures are placed by their bot.

## Decisions for the owner

1. Base v1.4.266 and track upstream **release tags** (not upstream `main`).
2. Auto-update off in the custom build; updates are manual from the fork's Releases until a Developer
   ID certificate is added. The app is ad-hoc signed: first launch needs right-click → Open (or
   `xattr -dr com.apple.quarantine /Applications/Orca.app`).
3. Organization lives on the Mac (not synced to the phone in v1).
4. Fully autonomous teams with the Mac closed require installing the fork's `orca-server` on the VPS.
