#!/bin/bash

pipeline_name="royco-rwa-earn-concrete-pipeline"

# Function to prepare and deploy pipeline
prepare_and_deploy() {
    echo "Preparing ${pipeline_name}..."

    # preparation command
    mustache config/earn-concrete/metadata.json config/earn-concrete/pipeline.template.yaml > ${pipeline_name}.yaml

    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml" --force --status ACTIVE
    else
        echo "Error during preparation of ${pipeline_name}"
        return 1
    fi
}

# Main execution
echo "Starting pipeline management script..."

# Then handle preparations and deployments
echo -e "\n=== Preparation and Deployment Phase ==="

prepare_and_deploy

echo "Script completed!"
