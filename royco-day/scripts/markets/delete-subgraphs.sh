#!/bin/bash
# Delete the royco-day markets subgraph(s) from Goldsky.
#
# Each name is a DEPLOY LABEL (subgraph-name suffix): `mainnet` + `staging` are
# separate Goldsky subgraphs (see deploy-subgraphs.sh).
#
# !! DESTRUCTIVE + human-gated. Denied in .claude/settings.json. !!
#
# Usage:
#   npm run delete:subgraphs:markets          # all (mainnet + staging)
#   npm run delete:subgraphs:staging          # just staging
#   bash ./scripts/markets/delete-subgraphs.sh staging

set -uo pipefail

# Default to every configured deployment; override with args to target one.
networks=(
    mainnet
    staging
)
if [ "$#" -gt 0 ]; then
    networks=("$@")
fi

version="1.0.0"

for network in "${networks[@]}"; do
    subgraph_name="royco-day-markets-${network}/${version}"
    echo "Deleting ${subgraph_name}..."
    goldsky subgraph delete "${subgraph_name}"
done

echo "Script completed!"
