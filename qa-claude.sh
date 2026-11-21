#!/bin/bash
# Real Claude agent with the repo's TypeScript plugin: diagnostics before and after an idle stop of the server.
set -u
cd "$(git rev-parse --show-toplevel)"
H=$(mktemp -d /tmp/qa45857.XXXX); mkdir -p $H/.codex $H/.claude
CL=$HOME/.local/bin/claude
LB=$HOME/.local/bin/qa-with-lb
run() { HOME=$H CLAUDE_CONFIG_DIR=$H/.claude CODEX_HOME=$H/.codex "$LB" --claude --orca-env ORCA_TYPESCRIPT_LSP_IDLE_MINUTES=0.5 -- "$@"; }
run "$CL" plugin marketplace add ./config/agent-plugins < /dev/null 2>&1 | tail -2
run "$CL" plugin install orca-typescript@orca-agent-plugins < /dev/null 2>&1 | tail -2
echo "baseline tsrs=$(pgrep -x tsrs | wc -l | tr -d ' ')"
( for i in $(seq 1 120); do echo "$(date +%T) tsrs=$(pgrep -x tsrs | wc -l | tr -d ' ') wrappers=$(pgrep -f agent-typescript-lsp.mjs | wc -l | tr -d ' ')"; sleep 5; done ) > qa-procs.log &
SAMPLER=$!
PROMPT="Work in this repository. Step 1: create src/main/lsp-probe-qa.ts containing exactly: export const qaValue: number = 1
Report the TypeScript diagnostics your language server reported for that file after the write (say none if none).
Step 2: change that line to: export const qaValue: number = 'text'
Report the language-server diagnostics verbatim.
Step 3: run the bash command: sleep 75
Step 4: change the file to contain exactly these two lines: export const qaValue: number = 1 and export const qaOther: string = 2
Report the language-server diagnostics verbatim.
Step 5: delete src/main/lsp-probe-qa.ts.
Finish with a short list: step number and the diagnostics you saw."
run "$CL" -p --model 'claude-opus-5-5[1m]' --effort medium --permission-mode bypassPermissions "$PROMPT" < /dev/null > qa-claude.txt 2>&1
echo "claude exit $?"
sleep 10
kill $SAMPLER 2>/dev/null
rm -f src/main/lsp-probe-qa.ts
echo "=== claude output"; tail -40 qa-claude.txt
echo "=== process samples"; cat qa-procs.log
rm -rf "$H"
