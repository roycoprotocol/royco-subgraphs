#!/bin/bash

# Exit on error
set -e

# Define paths relative to the script location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
TEMPLATE_PATH="$SCRIPT_DIR/ethereum-erc-20-transfers.template.yaml"
OUTPUT_PATH="$SCRIPT_DIR/ethereum-erc-20-transfers.yaml"

# Check if template file exists
if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "Error: Template file not found at $TEMPLATE_PATH"
    exit 1
fi

# Define addresses array
addresses=(
    "0x74d1fafa4e0163b2f1035f1b052137f3f9bad5cc"
    "0x514910771af9ca656af840dff83e8264ecf986ca"
)

# Process addresses to lowercase and format for SQL IN clause
formatted_addresses=""
for addr in "${addresses[@]}"; do
    addr_lower=$(echo "$addr" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
    formatted_addresses+="'$addr_lower', "
done
formatted_addresses=${formatted_addresses%, }  # Remove trailing comma and space

# Read template and replace placeholder
template_content=$(cat "$TEMPLATE_PATH")
processed_content=$(echo "$template_content" | sed "s/{{addresses}}/$formatted_addresses/g")

# Write processed content to output file
echo "$processed_content" > "$OUTPUT_PATH"

echo "Pipeline configuration generated successfully at $OUTPUT_PATH!"
echo "Please deploy the generated file using your preferred method." 