#!/bin/bash

pipeline_name="royco-rwa-earn-concrete-pipeline"

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
