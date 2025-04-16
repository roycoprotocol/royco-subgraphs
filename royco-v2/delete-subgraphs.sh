#!/bin/bash

# Array of networks
networks=(
   "sepolia"
)

# Function to delete pipeline with confirmation
delete_pipeline() {
    local pipeline_name="royco-v2-pipeline" 
    
    echo "Attempting to stop ${pipeline_name}..."
    goldsky pipeline stop "${pipeline_name}" --force || true 

    echo "Attempting to delete ${pipeline_name}..."
    goldsky pipeline delete "${pipeline_name}" --force || true 
}

# Function to delete subgraph with confirmation
delete_subgraph() {
    local network=$1

    # Note: update version if needed
    local subgraph_name="royco-v2-${network}/1.0.0" 
    
    echo "Attempting to delete ${subgraph_name}..."
    goldsky subgraph delete "${subgraph_name}" --force || true 
}

# Main execution
echo "Starting subgraph management script..."

# delete_pipeline

for network in "${networks[@]}"; do
    delete_subgraph "$network"
done

# First, handle deletions
echo "=== Deletion Phase ==="