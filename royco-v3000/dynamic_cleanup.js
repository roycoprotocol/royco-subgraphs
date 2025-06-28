#!/usr/bin/env node

const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL;

const config = {
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
};

async function cleanup() {
  const client = new Client(config);

  try {
    console.log("Testing database connection...");
    await client.connect();
    await client.query("SELECT 1");
    console.log("✅ Connection test successful");

    console.log("");
    console.log("Finding all insert_*_history functions...");
    console.log("==============================================================");

    // First, get all the functions we need to drop
    const findQuery = `
      SELECT 
        n.nspname as schema_name, 
        p.proname as function_name, 
        pg_get_function_identity_arguments(p.oid) as args,
        n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as full_signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname LIKE 'insert_%_history'
      ORDER BY p.proname;
    `;

    const result = await client.query(findQuery);
    const functions = result.rows;

    console.log(`Found ${functions.length} functions to drop:`);
    functions.forEach(func => {
      console.log(`  ${func.full_signature}`);
    });

    console.log("");
    console.log("Dropping functions...");
    console.log("==============================================================");

    // Drop each function with detailed error reporting
    for (const func of functions) {
      console.log(`\nAttempting to drop: ${func.full_signature}`);
      
      // First check if function exists
      const checkQuery = `
        SELECT COUNT(*) as exists 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = '${func.schema_name}' 
        AND p.proname = '${func.function_name}'
        AND pg_get_function_identity_arguments(p.oid) = '${func.args}'
      `;
      
      const existsResult = await client.query(checkQuery);
      console.log(`  Function exists before drop: ${existsResult.rows[0].exists}`);
      
      const dropStatement = `DROP FUNCTION ${func.schema_name}."${func.function_name}"(${func.args}) CASCADE`;
      
      try {
        const result = await client.query(dropStatement);
        console.log(`  DROP result:`, result);
        
        // Check if it still exists after drop
        const stillExistsResult = await client.query(checkQuery);
        console.log(`  Function exists after drop: ${stillExistsResult.rows[0].exists}`);
        
        if (stillExistsResult.rows[0].exists === '0') {
          console.log(`✅ Successfully dropped: ${func.function_name}`);
        } else {
          console.log(`❌ Function still exists after drop: ${func.function_name}`);
        }
      } catch (error) {
        console.log(`❌ Failed to drop: ${func.full_signature}`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
    }

    console.log("");
    console.log("Verifying cleanup...");
    console.log("==============================================================");

    // Verify cleanup
    const verifyResult = await client.query(findQuery);
    const remaining = verifyResult.rows.length;

    console.log(`Remaining insert_*_history functions: ${remaining}`);

    if (remaining === 0) {
      console.log("✅ All insert_*_history functions successfully removed!");
    } else {
      console.log(`⚠️  Warning: ${remaining} functions still remain`);
      verifyResult.rows.forEach(func => {
        console.log(`  ${func.full_signature}`);
      });
    }

    console.log("");
    console.log("==============================================================");
    console.log("Function cleanup completed.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanup();