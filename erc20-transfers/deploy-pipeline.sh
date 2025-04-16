#!/bin/bash

# Exit on error
set -e

# Function to check if goldsky CLI is installed
check_goldsky() {
    if ! command -v goldsky &> /dev/null; then
        echo "Error: goldsky CLI is not installed or not in PATH"
        exit 1
    fi
}

# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local pipeline_name="ethereum-erc-20-transfers"
    local pipeline_file="${pipeline_name}.yaml"
    
    echo "Preparing ${pipeline_name}..."
    
    # Check if pipeline file exists
    if [ ! -f "$pipeline_file" ]; then
        echo "Error: Pipeline file ${pipeline_file} not found"
        return 1
    fi
    
    # Deploy the pipeline
    echo "Deploying ${pipeline_name}..."
    if goldsky pipeline apply "$pipeline_file"; then
        echo "Successfully deployed ${pipeline_name}"
        return 0
    else
        echo "Error during deployment of ${pipeline_name}"
        return 1
    fi
}

# Main execution
echo "Starting pipeline management script..."

# Check if goldsky CLI is installed
check_goldsky

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

if prepare_and_deploy; then
    echo "Script completed successfully!"
    exit 0
else
    echo "Script failed!"
    exit 1
fi
