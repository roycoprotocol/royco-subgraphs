#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    set -a
    source .env
    set +a
else
    echo "No .env file found. Using existing environment variables."
fi

# Function to extract table names from pipeline.yaml
extract_tables() {
    local pipeline_name="royco-boring-vault-pipeline" 
    # Use yq to parse the YAML file and extract table names from sinks
    yq '.sinks | keys | .[]' $pipeline_name.yaml | while read -r sink_name; do
        yq ".sinks.$sink_name.table" $pipeline_name.yaml
    done
}

# Function to generate and execute ALTER TABLE statements
update_vid_columns() {
    # Get database connection details from environment variable
    if [ -z "$DATABASE_URL" ]; then
        echo "Error: DATABASE_URL environment variable is not set"
        echo "Please ensure DATABASE_URL is set in your .env file or environment"
        exit 1
    fi

    # Extract tables and generate ALTER TABLE statements
    extract_tables | while read -r table_name; do
        if [ -n "$table_name" ]; then
            echo "Updating vid column for table: $table_name"
            psql "$DATABASE_URL" -c "UPDATE public.$table_name SET vid = 0;"
        fi
    done
}

# Main execution
echo "Starting vid column updates..."
update_vid_columns
echo "Completed vid column updates." 