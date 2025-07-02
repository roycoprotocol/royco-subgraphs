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
    console.log("Finding duplicate insert_*_history functions...");
    console.log(
      "=============================================================="
    );

    // First, get all the functions and group them by base name
    const findQuery = `
      SELECT 
        n.nspname as schema_name, 
        p.proname as function_name, 
        pg_get_function_identity_arguments(p.oid) as args,
        n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as full_signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname LIKE 'insert_%_history'
      ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
    `;

    const result = await client.query(findQuery);
    const allFunctions = result.rows;

    console.log(`Found ${allFunctions.length} insert_*_history functions:`);
    allFunctions.forEach((func) => {
      console.log(`  ${func.full_signature}`);
    });

    // Group functions by name to identify duplicates
    const functionGroups = {};
    allFunctions.forEach((func) => {
      if (!functionGroups[func.function_name]) {
        functionGroups[func.function_name] = [];
      }
      functionGroups[func.function_name].push(func);
    });

    // Identify which functions to drop (keep one per function name, drop the rest)
    const functionsToRemove = [];
    Object.entries(functionGroups).forEach(([functionName, functions]) => {
      if (functions.length > 1) {
        console.log(
          `\n📋 Function ${functionName} has ${functions.length} variants:`
        );
        functions.forEach((func, index) => {
          console.log(`  ${index + 1}. ${func.full_signature}`);
        });

        // Keep the first one (usually the simpler signature), drop the rest
        const toKeep = functions[0];
        const toDrop = functions.slice(1);

        console.log(`  ✅ Keeping: ${toKeep.full_signature}`);
        toDrop.forEach((func) => {
          console.log(`  ❌ Will remove: ${func.full_signature}`);
          functionsToRemove.push(func);
        });
      } else {
        console.log(
          `\n✅ Function ${functionName} has only one variant - keeping it`
        );
      }
    });

    if (functionsToRemove.length === 0) {
      console.log("\n🎉 No duplicate functions found - nothing to remove!");
    }

    console.log("");
    console.log(`Removing ${functionsToRemove.length} duplicate functions...`);
    console.log(
      "=============================================================="
    );

    // Drop only the duplicate functions
    for (const func of functionsToRemove) {
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
      console.log(
        `  Function exists before drop: ${existsResult.rows[0].exists}`
      );

      const dropStatement = `DROP FUNCTION ${func.schema_name}."${func.function_name}"(${func.args}) CASCADE`;

      try {
        const result = await client.query(dropStatement);
        console.log(`  DROP result:`, result);

        // Check if it still exists after drop
        const stillExistsResult = await client.query(checkQuery);
        console.log(
          `  Function exists after drop: ${stillExistsResult.rows[0].exists}`
        );

        if (stillExistsResult.rows[0].exists === "0") {
          console.log(`✅ Successfully dropped: ${func.function_name}`);
        } else {
          console.log(
            `❌ Function still exists after drop: ${func.function_name}`
          );
        }
      } catch (error) {
        console.log(`❌ Failed to drop: ${func.full_signature}`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
    }

    console.log("");
    console.log("Verifying cleanup...");
    console.log(
      "=============================================================="
    );

    // Verify cleanup
    const verifyResult = await client.query(findQuery);
    const remaining = verifyResult.rows.length;

    console.log(`Remaining insert_*_history functions: ${remaining}`);

    if (remaining === 0) {
      console.log("✅ All insert_*_history functions successfully removed!");
    } else {
      console.log(`⚠️  Warning: ${remaining} functions still remain`);
      verifyResult.rows.forEach((func) => {
        console.log(`  ${func.full_signature}`);
      });
    }

    console.log("");
    console.log(
      "=============================================================="
    );
    console.log("Function cleanup completed.");

    // Now reset Envio system tables
    console.log("");
    console.log("Resetting Envio system tables...");
    console.log(
      "=============================================================="
    );

    const systemTables = [
      "event_sync_state",
      "chain_metadata",
      "persisted_state",
      "end_of_block_range_scanned_data",
      "raw_events",
      "dynamic_contract_registry",
    ];

    for (const tableName of systemTables) {
      try {
        // Check if table exists first
        const checkTableQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          )
        `;

        const tableExists = await client.query(checkTableQuery);

        if (tableExists.rows[0].exists) {
          console.log(`\n📋 Resetting table: ${tableName}`);

          // Get row count before deletion
          const countBefore = await client.query(
            `SELECT COUNT(*) as count FROM "${tableName}"`
          );
          console.log(`  Rows before deletion: ${countBefore.rows[0].count}`);

          // Delete all rows from the table
          const deleteResult = await client.query(`DELETE FROM "${tableName}"`);
          console.log(`  Delete result: ${deleteResult.rowCount} rows deleted`);

          // Verify deletion
          const countAfter = await client.query(
            `SELECT COUNT(*) as count FROM "${tableName}"`
          );
          console.log(`  Rows after deletion: ${countAfter.rows[0].count}`);

          if (countAfter.rows[0].count === "0") {
            console.log(`  ✅ Successfully reset ${tableName}`);
          } else {
            console.log(
              `  ⚠️  Warning: ${tableName} still has ${countAfter.rows[0].count} rows`
            );
          }
        } else {
          console.log(`\n⚠️  Table ${tableName} does not exist - skipping`);
        }
      } catch (error) {
        console.log(`\n❌ Failed to reset table ${tableName}`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
    }

    console.log("");
    console.log(
      "=============================================================="
    );
    console.log("Envio system tables reset completed.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanup();
