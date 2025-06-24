#!/bin/bash

# Array of networks
networks=(
    "sepolia"
    # "mainnet"
    # "base"
)

# Function to get current version from metadata.json
get_version() {
    local network=$1
    local current_version=$(jq -r ".metadata[] | select(.network == \"$network\") | .version" metadata.json)
    if [ "$current_version" == "null" ] || [ -z "$current_version" ]; then
        echo "1.0.0"
    else
        echo "$current_version"
    fi
}

# Function to increment version
increment_version() {
    local network=$1
    local current_version=$2
    local major=$(echo $current_version | cut -d. -f1)
    local minor=$(echo $current_version | cut -d. -f2)
    local patch=$(echo $current_version | cut -d. -f3)
    local new_patch=$((patch + 1))
    local new_version="${major}.${minor}.${new_patch}"
    
    # Update metadata.json
    jq ".metadata = (.metadata | map(if .network == \"$network\" then .version = \"$new_version\" else . end))" metadata.json > temp.json && mv temp.json metadata.json
    echo "$new_version"
}

# Function to decrement version (rollback on failure)
decrement_version() {
    local network=$1
    local current_version=$2
    local major=$(echo $current_version | cut -d. -f1)
    local minor=$(echo $current_version | cut -d. -f2)
    local patch=$(echo $current_version | cut -d. -f3)
    if [ $patch -gt 0 ]; then
        local new_patch=$((patch - 1))
        local new_version="${major}.${minor}.${new_patch}"
        
        # Update metadata.json
        jq ".metadata = (.metadata | map(if .network == \"$network\" then .version = \"$new_version\" else . end))" metadata.json > temp.json && mv temp.json metadata.json
        echo "$new_version"
    else
        echo "$current_version"
    fi
}

# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local network=$1
    local current_version=$(get_version "$network")
    local new_version=$(increment_version "$network" "$current_version")
    local subgraph_name="royco-v3000-${network}/${new_version}"
    
    echo "Preparing and deploying ${subgraph_name}..."
    yarn prepare:${network} && graph codegen && graph build
    
    if [ $? -eq 0 ]; then
        goldsky subgraph deploy "${subgraph_name}" --path .
        if [ $? -eq 0 ]; then
            echo "Successfully deployed ${subgraph_name}"
        else
            echo "Deployment failed for ${subgraph_name}, rolling back version..."
            decrement_version "$network" "$new_version"
            return 1
        fi
    else
        echo "Error during preparation of ${subgraph_name}, rolling back version..."
        decrement_version "$network" "$new_version"
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