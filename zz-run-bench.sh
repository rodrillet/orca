#!/usr/bin/env bash
# Runs the bench on Omarchy inside a memory-capped user scope, with a page-cache churner beside it.
set -u
root=/tmp/checkpoint-pressure-bench-$(git rev-parse --short HEAD)
mkdir -p "$root"
cp ~/zz-checkpoint-pressure.local.test.ts src/main/native-chat/agent-session-journal/database/ 2>/dev/null || true
free -m; nproc
churn() { while [ -f "$root/churn" ]; do dd if=/dev/zero of="$root/churn.bin" bs=1M count=2048 conv=fsync status=none; cat "$root/churn.bin" >/dev/null; rm -f "$root/churn.bin"; done; }
touch "$root/churn"
systemd-run --user --scope -q -p MemoryHigh=${BENCH_MEM_HIGH:-450M} -p MemoryMax=${BENCH_MEM_MAX:-900M} -p MemorySwapMax=2G -- bash -c "$(declare -f churn); root=$root; churn" &
churner=$!
BENCH_ROOT=$root systemd-run --user --scope -q -p MemoryHigh=${BENCH_MEM_HIGH:-450M} -p MemoryMax=${BENCH_MEM_MAX:-900M} -p MemorySwapMax=2G -- \
  env BENCH_ROOT=$root BENCH_MIN=${BENCH_MIN:-12} node node_modules/vitest/vitest.mjs run --config config/vitest.config.ts \
  src/main/native-chat/agent-session-journal/database/zz-checkpoint-pressure.local.test.ts --testTimeout=10800000
status=$?
rm -f "$root/churn"; wait $churner
grep -c '"stopped":true' "$root/result.jsonl"; awk 'NR%5==0' "$root/result.jsonl" | sed 's/^/SAMPLE /'; tail -1 "$root/result.jsonl"
rm -rf "$root"
exit $status
