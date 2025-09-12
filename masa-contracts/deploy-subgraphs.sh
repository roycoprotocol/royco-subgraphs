#!/bin/bash

# Array of networks
networks=(
    "sepolia"
    # "base"
)

# Function to get current version
get_version() {
    local network=$1
    # Read current version from metadata.json
    local current_version=$(jq -r ".metadata[] | select(.network == \"$network\") | .version" metadata.json)
    echo "$current_version"
}

# Function to increment and save version
increment_version() {
    local network=$1
    local current_version=$2
    
    # Split version into parts
    IFS='.' read -r major minor patch <<< "$current_version"
    
    # Increment patch version
    new_patch=$((patch + 1))
    new_version="${major}.${minor}.${new_patch}"
    
    # Update metadata.json with new version
    tmp=$(mktemp)
    jq "(.metadata[] | select(.network == \"$network\").version) |= \"$new_version\"" metadata.json > "$tmp" && mv "$tmp" metadata.json
    
    echo "Updated \"$network\" version to $new_version"
}

# Function to increment and save version
decrement_version() {
    local network=$1
    local current_version=$2
    
    # Split version into parts
    IFS='.' read -r major minor patch <<< "$current_version"
    
    # Decrement patch version
    new_patch=$((patch - 1))
    new_version="${major}.${minor}.${new_patch}"
    
    # Update metadata.json with new version
    tmp=$(mktemp)
    jq "(.metadata[] | select(.network == \"$network\").version) |= \"$new_version\"" metadata.json > "$tmp" && mv "$tmp" metadata.json
    
    echo "Updated \"$network\" version to $new_version"
}

# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local network=$1

    # Get current version (without incrementing)
    local version=$(get_version "$network")
    increment_version "$network" "$version"

    version=$(get_version "$network") 
    local subgraph_name="masa-contracts-${network}/${version}"
    
    echo "Preparing and deploying ${subgraph_name}..."
    yarn prepare:${network} && graph codegen && graph build
    
    if [ $? -eq 0 ]; then
        if goldsky subgraph deploy "${subgraph_name}" --path .; then
            echo "Successfully deployed ${subgraph_name}"
            return 0
        else
            decrement_version "$network" "$version"
            echo "Deployment failed for ${subgraph_name}"
            return 1
        fi
    else
        decrement_version "$network" "$version"
        echo "Error during preparation of ${subgraph_name}"
        return 1
    fi
}

# Main execution
echo "Starting subgraph management script..."

# Clean up existing build and generated directories
echo "Cleaning up build and generated directories..."
rm -rf build generated

# Handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

# Deploy subgraphs
for network in "${networks[@]}"; do
    prepare_and_deploy "$network"
done

echo "Script completed!"
