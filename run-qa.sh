#!/bin/bash
set -u
cd "$(git rev-parse --show-toplevel)"
bash qa-claude.sh
