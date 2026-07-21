#!/bin/bash
# Deploy the royco-day markets subgraph(s) to Goldsky, one deployment at a time.
#
# Each name here is a DEPLOY LABEL (the subgraph-name suffix), not necessarily a
# distinct chain: `mainnet` and `staging` both index Ethereum mainnet, but from
# SEPARATE factories (staging = mock markets for simulation) and deploy as
# separate subgraphs (royco-day-markets-mainnet / -staging). The graph-node chain
# for each comes from config/markets/networks/<label>.json's `network` field.
#
# Uses `npm exec` rather than bare `graph`/`mustache`: those are local
# devDependencies and are NOT on PATH when this script is run directly.
#
# Usage:
#   npm run deploy:subgraphs:markets          # all (mainnet + staging)
#   npm run deploy:subgraphs:staging          # just staging
#   bash ./scripts/markets/deploy-subgraphs.sh mainnet staging

set -uo pipefail

# Default to every configured deployment; override with args to target one.
networks=(
    mainnet
    staging
)
if [ "$#" -gt 0 ]; then
    networks=("$@")
fi

version="1.0.0" # Note: bump when redeploying a changed schema/mapping

prepare_and_deploy() {
    local network=$1
    local subgraph_name="royco-day-markets-${network}/${version}"

    echo "Preparing and deploying ${subgraph_name}..."

    npm run "prepare:markets:${network}" \
      && npm exec -- graph codegen \
      && npm exec -- graph build

    if [ $? -eq 0 ]; then
        goldsky subgraph deploy "${subgraph_name}" --path .
    else
        echo "Error during preparation of ${subgraph_name}"
        return 1
    fi
}

echo "Starting subgraph management script..."

echo "Cleaning up build and generated directories..."
rm -rf build generated

echo -e "\n=== Preparation and Deployment Phase ==="
for network in "${networks[@]}"; do
    prepare_and_deploy "$network"
done

echo "Script completed!"
