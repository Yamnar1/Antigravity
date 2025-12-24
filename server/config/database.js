const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration based on environment
const dbDialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dbDialect === 'mysql') {
    // MySQL/MariaDB configuration (for production/cPanel)
    sequelize = new Sequelize(
        process.env.DB_NAME || 'vpfs_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            define: {
                timestamps: true,
                underscored: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            dialectOptions: {
                charset: 'utf8mb4',
                collate: 'utf8mb4_unicode_ci'
            },
            timezone: '+00:00'
        }
    );
} else {
    // SQLite configuration (for local development)
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DATABASE_PATH || './database.sqlite',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    });
}

// Test connection with retry logic
const testConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log(`✅ Database connection established successfully (${dbDialect.toUpperCase()}).`);
            return true;
        } catch (error) {
            console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
            if (i === retries - 1) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
};

module.exports = { sequelize, testConnection };
