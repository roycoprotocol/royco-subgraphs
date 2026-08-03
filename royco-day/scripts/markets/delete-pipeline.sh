#!/bin/bash
# Delete the royco-day markets Goldsky pipeline.
#
# !! DESTRUCTIVE: drops the pipeline feeding Neon. Human-gated; denied in
# .claude/settings.json. !!
#
# Usage: delete-pipeline.sh [pipeline_name]
#        npm run delete:pipeline:markets

set -uo pipefail

pipeline_name="${1:-royco-day-markets-pipeline}"

echo "Deleting ${pipeline_name}..."
# --force: skip Goldsky's "retype the name" prompt. The human gate is running
# this script at all (see the banner), not the CLI's re-prompt.
goldsky pipeline delete "${pipeline_name}" --force

echo "Script completed!"
