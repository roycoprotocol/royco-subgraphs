#!/bin/bash
# Delete the royco-day-entrypoint Goldsky pipeline.
#
# !! DESTRUCTIVE: drops the pipeline feeding Neon. Human-gated; do not run
# without explicit approval. !!
#
# Usage: delete-pipeline.sh [pipeline_name]
#        npm run delete:pipeline:entrypoint

set -uo pipefail

pipeline_name="${1:-royco-day-entrypoint-pipeline}"

echo "Deleting ${pipeline_name}..."
goldsky pipeline delete "${pipeline_name}" || exit 1

echo "Script completed!"
