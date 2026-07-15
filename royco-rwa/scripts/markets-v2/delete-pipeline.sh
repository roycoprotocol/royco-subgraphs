#!/bin/bash

# Usage: delete-pipeline.sh [pipeline_name]
# Defaults target the 3-chain (matching schema) pipeline.
pipeline_name="${1:-royco-rwa-markets-v2-pipeline}"

# Function to delete pipeline with confirmation
delete_pipeline() {
    echo "Attempting to stop ${pipeline_name}..."
    goldsky pipeline stop "${pipeline_name}" --force || true 

    echo "Attempting to delete ${pipeline_name}..."
    goldsky pipeline delete "${pipeline_name}" --force || true 
}

# Main execution
echo "Starting pipeline management script..."

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

delete_pipeline

echo "Script completed!"
