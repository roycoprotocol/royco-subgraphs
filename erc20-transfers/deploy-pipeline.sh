#!/bin/bash


# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local pipeline_name="ethereum-erc-20-transfers"
    
    echo "Preparing ${pipeline_name}..."
    
    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml"
    else
        echo "Error during prgoleparation of ${pipeline_name}"
        return 1
    fi
}

# Main execution
echo "Starting pipeline management script..."

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

prepare_and_deploy

echo "Script completed!"
