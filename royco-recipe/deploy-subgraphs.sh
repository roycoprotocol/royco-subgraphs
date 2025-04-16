#!/bin/bash

# Array of networks
networks=(
    # "sepolia"
    # "mainnet"
    # "arbitrum-one"
    "base"
    "plume-mainnet"
    "corn-maizenet"
    "sonic"
    "hyperevm"
)

# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local network=$1

    # Note: update version if needed
    local subgraph_name="royco-recipe-${network}/2.0.29" 
    
    echo "Preparing and deploying ${subgraph_name}..."
    yarn prepare:${network} && graph codegen && graph build
    
    if [ $? -eq 0 ]; then
        goldsky subgraph deploy "${subgraph_name}" --path .
    else
        echo "Error during preparation of ${subgraph_name}"
        return 1
    fi
}

# Main execution
echo "Starting subgraph management script..."

# Clean up existing build and generated directories
echo "Cleaning up build and generated directories..."
rm -rf build generated

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

# Deploy subgraphs
for network in "${networks[@]}"; do
    prepare_and_deploy "$network"
done

echo "Script completed!"
