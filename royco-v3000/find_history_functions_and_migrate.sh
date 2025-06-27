#!/bin/bash

# Load environment variables from royco-v3000/.env
source "$(dirname "$0")/.env"

# Database connection parameters
DB_HOST="${ENVIO_PG_HOST}"
DB_PORT="${ENVIO_PG_PORT}"
DB_NAME="${ENVIO_PG_DATABASE}"
DB_USER="${ENVIO_PG_USER}"
DB_PASSWORD="${ENVIO_POSTGRES_PASSWORD}"
SSL_MODE="${ENVIO_PG_SSL_MODE}"

echo "Connecting to PostgreSQL database..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# SQL query to find all functions containing insert_*_history pattern
FIND_QUERY="
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%insert_%_history%'
ORDER BY n.nspname, p.proname;
"

echo "Searching for functions containing 'insert_*_history' pattern..."
echo "=============================================================="

# Execute the query to find functions
FUNCTIONS_OUTPUT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    -U "$DB_USER" \
    --set=sslmode="$SSL_MODE" \
    -t \
    -c "$FIND_QUERY")

echo "$FUNCTIONS_OUTPUT"

# Check if any functions were found
if [ ! -z "$FUNCTIONS_OUTPUT" ] && [ "$FUNCTIONS_OUTPUT" != " " ]; then
    echo ""
    echo "Found functions with insert_*_history pattern. Removing them..."
    echo "=============================================================="
    
    # Parse the output and create DROP statements
    while IFS='|' read -r schema_name function_name arguments; do
        # Trim whitespace
        schema_name=$(echo "$schema_name" | xargs)
        function_name=$(echo "$function_name" | xargs)
        arguments=$(echo "$arguments" | xargs)
        
        if [ ! -z "$function_name" ]; then
            echo "Dropping function: $schema_name.$function_name($arguments)"
            
            DROP_QUERY="DROP FUNCTION IF EXISTS $schema_name.$function_name($arguments) CASCADE;"
            
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -d "$DB_NAME" \
                -U "$DB_USER" \
                --set=sslmode="$SSL_MODE" \
                -c "$DROP_QUERY"
        fi
    done <<< "$FUNCTIONS_OUTPUT"
    
    echo "All insert_*_history functions have been removed."
else
    echo "No functions with insert_*_history pattern found."
fi

# Check if the query was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================================="
    echo "Database query completed successfully."
    echo ""
    echo "Now running migration..."
    echo "=============================================================="
    
    # Change to royco-v3000 directory and run the migration
    cd "$(dirname "$0")"
    
    # Run the envio migration command
    npx envio local db-migrate up
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "Migration completed successfully!"
    else
        echo ""
        echo "Error: Migration failed!"
        exit 1
    fi
else
    echo "Error: Failed to connect to database or execute query!"
    exit 1
fi