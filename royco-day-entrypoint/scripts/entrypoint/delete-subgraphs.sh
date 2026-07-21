#!/bin/bash
# Delete the royco-day-entrypoint subgraph(s) from Goldsky.
#
# !! DESTRUCTIVE + human-gated. Do not run without explicit approval. !!
#
# Usage: npm run delete:subgraphs:entrypoint

set -uo pipefail

networks=(
    mainnet
)

version="1.0.0"

for network in "${networks[@]}"; do
    subgraph_name="royco-day-entrypoint-${network}/${version}"
    echo "Deleting ${subgraph_name}..."
    goldsky subgraph delete "${subgraph_name}" || exit 1
done

echo "Script completed!"
