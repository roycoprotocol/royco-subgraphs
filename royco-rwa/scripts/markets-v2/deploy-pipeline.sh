#!/bin/bash

# Usage: deploy-pipeline.sh [pipeline_name] [metadata_file]
# Defaults target the 3-chain (matching schema) pipeline.
pipeline_name="${1:-royco-rwa-markets-v2-pipeline}"
metadata_file="${2:-config/markets-v2/metadata.json}"
template_file="config/markets-v2/pipeline.template.yaml"

# Function to prepare and deploy pipeline
prepare_and_deploy() {
    echo "Preparing ${pipeline_name} (from ${metadata_file})..."

    # preparation command
    mustache "${metadata_file}" "${template_file}" > "${pipeline_name}.yaml"

    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml" --status ACTIVE
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
