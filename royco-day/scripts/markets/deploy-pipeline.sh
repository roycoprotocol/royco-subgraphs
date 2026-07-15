#!/bin/bash
# Render and apply the Goldsky pipeline that mirrors subgraph entities into Neon.
#
# !! This mutates production Postgres. It is deliberately human-gated: .claude/
# settings.json denies both `goldsky:*` and this script. !!
#
# Usage: deploy-pipeline.sh [pipeline_name] [metadata_file]
#        npm run deploy:pipeline:markets

set -uo pipefail

pipeline_name="${1:-royco-day-markets-pipeline}"
metadata_file="${2:-config/markets/metadata.json}"
template_file="config/markets/pipeline.template.yaml"

prepare_and_deploy() {
    echo "Preparing ${pipeline_name} (from ${metadata_file})..."

    # Regenerate the template from schema.graphql first, so an apply can never
    # ship a template that has drifted from the schema it claims to mirror.
    node scripts/generate-pipeline-template.mjs || return 1

    npm exec -- mustache "${metadata_file}" "${template_file}" > "${pipeline_name}.yaml"

    if [ $? -eq 0 ]; then
        goldsky pipeline apply "${pipeline_name}.yaml" --status ACTIVE
    else
        echo "Error during preparation of ${pipeline_name}"
        return 1
    fi
}

echo "Starting pipeline management script..."
echo -e "\n=== Preparation and Deployment Phase ==="

prepare_and_deploy

echo "Script completed!"
