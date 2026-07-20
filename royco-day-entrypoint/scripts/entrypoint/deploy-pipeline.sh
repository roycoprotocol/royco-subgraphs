#!/bin/bash
# Render and apply the Goldsky pipeline that mirrors subgraph entities into Neon.
#
# !! This mutates production Postgres. It is deliberately human-gated: do not run
# it (or any `goldsky ...`) without explicit approval. !!
#
# Usage: deploy-pipeline.sh [pipeline_name] [metadata_file]
#        npm run deploy:pipeline:entrypoint

set -uo pipefail

pipeline_name="${1:-royco-day-entrypoint-pipeline}"
metadata_file="${2:-config/entrypoint/metadata.json}"
template_file="config/entrypoint/pipeline.template.yaml"

prepare_and_deploy() {
    echo "Preparing ${pipeline_name} (from ${metadata_file})..."

    # pipeline.template.yaml is hand-maintained (one source+sink pair per schema
    # entity); just render the per-network metadata into it.
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

prepare_and_deploy || exit 1

echo "Script completed!"
