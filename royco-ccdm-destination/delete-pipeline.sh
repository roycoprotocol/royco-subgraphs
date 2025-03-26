#!/bin/bash

# Function to delete pipeline with confirmation
delete_pipeline() {
    local pipeline_name="royco-ccdm-pipeline" 
    
    echo "Attempting to stop ${pipeline_name}..."
    goldsky pipeline stop "${pipeline_name}" --force || true 

    echo "Attempting to delete ${pipeline_name}..."
    goldsky pipeline delete "${pipeline_name}" --force || true 
}

# Function to prepare and deploy subgraph
prepare_and_deploy() {
    local pipeline_name="royco-ccdm-pipeline"
    
    echo "Preparing ${pipeline_name}..."
    npm run prepare:pipeline
    
    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml"
    else
        echo "Error during preparation of ${pipeline_name}"
        return 1
    fi
}

# Main execution
echo "Starting pipeline management script..."

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

delete_pipeline

echo "Script completed!"
