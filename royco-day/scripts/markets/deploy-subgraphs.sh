#!/bin/bash
# Deploy the royco-day markets subgraph to Goldsky, one network at a time.
#
# Uses `npm exec` rather than bare `graph`/`mustache`: those are local
# devDependencies and are NOT on PATH when this script is run directly.
#
# Usage: npm run deploy:subgraphs:markets

set -uo pipefail

networks=(
    mainnet
)

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
