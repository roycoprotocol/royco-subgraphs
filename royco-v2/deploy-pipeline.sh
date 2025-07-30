#!/bin/bash

# Function to deploy pipeline
deploy_pipeline() {
    local pipeline_name="royco-multiverse-pipeline"
    
    echo "Preparing $pipeline_name..."
    npm run prepare:pipeline
    
    if [ $? -eq 0 ]; then
<<<<<<< HEAD
        goldsky pipeline apply "${pipeline_name}.yaml" --status ACTIVE
=======
        goldsky pipeline apply "${pipeline_name}.yaml"
>>>>>>> 481d67c3a059bb2fd5f4c2f9c95598cd4046d523
    else
        echo "Error during preparation of $pipeline_name"
        return 1
    fi
}

# Main execution
echo "Starting pipeline deployment..."

deploy_pipeline

echo "Pipeline deployment completed!"
