#!/usr/bin/env bash
# Runs on Omarchy from the repo root: the picture picker at the PR's base, with its full log.
set -u
OUT=/tmp/avatar-outfits-ba
BEFORE=/tmp/avatar-outfits-before
rm -rf "$OUT"; mkdir -p "$OUT/before"
git worktree remove -f "$BEFORE" >/dev/null 2>&1; rm -rf "$BEFORE"
git worktree add -f --detach "$BEFORE" b4a1c7e38a0ab2fbb779dc3410f4914af1e92822 >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
pnpm fixtures:shot --stop >/dev/null 2>&1
cd "$BEFORE"
pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
pnpm fixtures:shot 'bots/BotPicturePicker:newIdle' --scale 2 --out "$OUT/before" 2>&1 | tail -25
pnpm fixtures:shot 'bots/BotSidebarEntry' --scale 2 --out "$OUT/before" 2>&1 | tail -3
pnpm fixtures:shot --stop >/dev/null 2>&1
cd - >/dev/null
git worktree remove -f "$BEFORE" >/dev/null 2>&1; rm -rf "$BEFORE"
ls -R "$OUT"
tar -C "$OUT" -czf /tmp/avatar-outfits-b.tgz . && sha256sum /tmp/avatar-outfits-b.tgz
