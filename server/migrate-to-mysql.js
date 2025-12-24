/**
 * VPFS - Database Migration Script
 * Migrates data from SQLite to MySQL
 * 
 * Usage:
 * 1. Configure MySQL credentials in .env file
 * 2. Run: node migrate-to-mysql.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// SQLite connection (source)
const sqliteDb = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './database.sqlite',
    logging: false
});

// MySQL connection (destination)
const mysqlDb = new Sequelize(
    process.env.DB_NAME || 'vpfs_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    }
);

// Tables to migrate in order (respecting foreign keys)
const TABLES = ['users', 'aircraft', 'pilots', 'audit_logs'];

async function testConnections() {
    console.log('🔍 Testing database connections...\n');

    try {
        await sqliteDb.authenticate();
        console.log('✅ SQLite connection: OK');
    } catch (error) {
        console.error('❌ SQLite connection failed:', error.message);
        throw error;
    }

    try {
        await mysqlDb.authenticate();
        console.log('✅ MySQL connection: OK\n');
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        console.error('\n💡 Make sure your MySQL credentials in .env are correct:');
        console.error('   DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT\n');
        throw error;
    }
}

async function getTableSchema(db, tableName) {
    const [results] = await db.query(`SELECT * FROM ${tableName} LIMIT 1`);
    return results[0] ? Object.keys(results[0]) : [];
}

async function migrateTable(tableName) {
    console.log(`\n📦 Migrating table: ${tableName}`);
    console.log('─'.repeat(50));

    try {
        // Get data from SQLite
        const [rows] = await sqliteDb.query(`SELECT * FROM ${tableName}`);

        if (rows.length === 0) {
            console.log(`   ℹ️  Table is empty, skipping...`);
            return { table: tableName, count: 0, success: true };
        }

        console.log(`   Found ${rows.length} records`);

        // Get table schema
        const columns = await getTableSchema(sqliteDb, tableName);

        let successCount = 0;
        let errorCount = 0;

        // Insert each row into MySQL
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Build INSERT query
                const columnNames = columns.join(', ');
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map(col => row[col]);

                await mysqlDb.query(
                    `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
                    { replacements: values, type: Sequelize.QueryTypes.INSERT }
                );

                successCount++;

                // Progress indicator
                if ((i + 1) % 10 === 0 || i === rows.length - 1) {
                    process.stdout.write(`\r   Progress: ${i + 1}/${rows.length}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`\n   ⚠️  Error migrating record ${i + 1}:`, error.message);
            }
        }

        console.log(`\n   ✅ Successfully migrated ${successCount} records`);
        if (errorCount > 0) {
            console.log(`   ⚠️  Failed to migrate ${errorCount} records`);
        }

        return { table: tableName, count: successCount, errors: errorCount, success: errorCount === 0 };

    } catch (error) {
        console.error(`   ❌ Error migrating table ${tableName}:`, error.message);
        return { table: tableName, count: 0, errors: 0, success: false, error: error.message };
    }
}

async function createMySQLTables() {
    console.log('\n🔨 Creating MySQL tables...');

    // Import models to create tables
    process.env.DB_DIALECT = 'mysql';
    const { sequelize: dbInstance } = require('./config/database');
    const { syncDatabase } = require('./models');

    try {
        await syncDatabase(false);
        console.log('✅ MySQL tables created successfully\n');
    } catch (error) {
        console.error('❌ Error creating MySQL tables:', error.message);
        throw error;
    }
}

async function runMigration() {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   VPFS - Database Migration: SQLite → MySQL      ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    try {
        // Test connections
        await testConnections();

        // Create MySQL tables
        await createMySQLTables();

        console.log('📊 Starting data migration...');

        const results = [];

        // Migrate each table
        for (const table of TABLES) {
            const result = await migrateTable(table);
            results.push(result);
        }

        // Summary
        console.log('\n' + '═'.repeat(50));
        console.log('📈 MIGRATION SUMMARY');
        console.log('═'.repeat(50));

        let totalRecords = 0;
        let totalErrors = 0;

        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.table.padEnd(20)} ${result.count} records`);
            totalRecords += result.count;
            totalErrors += result.errors || 0;
        });

        console.log('─'.repeat(50));
        console.log(`Total records migrated: ${totalRecords}`);
        if (totalErrors > 0) {
            console.log(`Total errors: ${totalErrors}`);
        }
        console.log('═'.repeat(50));

        const allSuccess = results.every(r => r.success);

        if (allSuccess) {
            console.log('\n🎉 Migration completed successfully!\n');
            console.log('Next steps:');
            console.log('1. Update your .env file: set DB_DIALECT=mysql');
            console.log('2. Restart your server');
            console.log('3. Test the application to ensure everything works\n');
        } else {
            console.log('\n⚠️  Migration completed with errors.');
            console.log('Please review the errors above and fix any issues.\n');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. Your MySQL server is running');
        console.error('2. Database credentials in .env are correct');
        console.error('3. The MySQL database exists\n');
        process.exit(1);
    } finally {
        // Close connections
        await sqliteDb.close();
        await mysqlDb.close();
    }
}

// Run migration
runMigration();
