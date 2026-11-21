# Agent teams (Phase 4)

Flag: `FORK_FEATURES.agentTeams` (`src/shared/orca-fork/fork-features.ts`).

## What the owner sees

Bot settings › Agent › **Can build a team** (off by default). When on:

- `orca bot create --offer` from that bot creates the bot right away (same path as pressing Create
  bot on the card, `bots.createFromOffer`), up to the daily cap set in the row below the switch
  (1–20, default 5). The card stays in the chat and shows the bot
  as created: that is the audit line.
- The new bot and the lead join the bot group **"<Lead>’s team"**, created the first time and
  extended after that.
- Both are told how to hand work to each other: `orca bot items add --for <bot>` and
  `orca orchestration send --to bot:<bot> --type handoff`. Bot-to-bot mail and items already run
  without owner approval upstream; the team group is their shared room.

## Autonomous team room

While the lead's switch is on, its team group is an **autonomous room**:

- Any member posts there as itself with `orca bot team post --text "@Name …"` (from its Home chat or
  from the room). The bots it mentions answer in the room; the poster never answers itself. Up to 60
  bot posts per room per day, so two bots can't loop forever.
- Turns that serve a teammate's post may use the usual group question/handoff action, the same as
  turns that serve an owner post (upstream only allows owner posts as the root of a request).
- Turning the switch off makes the room an ordinary group again.

## Where it runs

All of it runs on the **bot's host** (the runtime that owns the bot):

- Bots on the Mac: works with the fork desktop app.
- Bots on a VPS: needs the **fork `orca-server`** on that VPS (new RPCs `orcaFork.teams.get/set/post`,
  the auto-accept in `bots.createOffer`, the autonomous room). Against a stock 1.4.266 server the switch is hidden and offers
  stay cards, exactly as upstream. A stock 1.4.266 desktop paired to a fork server keeps working; it
  just has no switch (the setting is stored on the server, so a switch set from the fork desktop still
  applies).

Settings live in `<userData>/orca-fork-agent-teams.json` on that host, outside every bot home, and only
the owner (desktop or paired device) can change them.

## Not yet

- The 60 posts/day room limit is in memory (resets when the host restarts) and not configurable.
