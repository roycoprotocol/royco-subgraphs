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
goldsky pipeline delete "${pipeline_name}"

echo "Script completed!"
