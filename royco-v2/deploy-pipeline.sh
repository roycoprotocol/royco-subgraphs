#!/bin/bash

# Function to deploy pipeline
deploy_pipeline() {
    local pipeline_name="royco-v2-pipeline"
    
    echo "Preparing $pipeline_name..."
    npm run prepare:pipeline
    
    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml"
    else
        echo "Error during preparation of $pipeline_name"
        return 1
    fi
}

# Main execution
echo "Starting pipeline deployment..."

deploy_pipeline

echo "Pipeline deployment completed!"
