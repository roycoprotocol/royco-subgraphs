#!/bin/bash
# Delete the royco-day markets subgraph(s) from Goldsky.
#
# !! DESTRUCTIVE + human-gated. Denied in .claude/settings.json. !!
#
# Usage: npm run delete:subgraphs:markets

set -uo pipefail

networks=(
    mainnet
)

version="1.0.0"

for network in "${networks[@]}"; do
    subgraph_name="royco-day-markets-${network}/${version}"
    echo "Deleting ${subgraph_name}..."
    goldsky subgraph delete "${subgraph_name}"
done

echo "Script completed!"
