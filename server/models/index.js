const { sequelize } = require('../config/database');
const User = require('./User');
const Aircraft = require('./Aircraft');
const Pilot = require('./Pilot');
const AuditLog = require('./AuditLog');

// Define relationships
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const models = {
    User,
    Aircraft,
    Pilot,
    AuditLog
};

// Test database connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};

// Sync database
const syncDatabase = async (force = false) => {
    try {
        // Use normal sync - SQLite doesn't handle alter well with foreign keys
        await sequelize.sync({ force });
        console.log('✅ Database synchronized successfully.');

        const { ADMIN_PERMISSIONS } = require('../config/permissions');

        // Create default admin user if not exists
        if (force) {
            await User.create({
                username: 'admin',
                password: 'admin123',
                name: 'Administrador',
                permissions: ADMIN_PERMISSIONS
            });
            console.log('✅ Default admin user created with all permissions.');
        } else {
            // Check if admin exists, if not create it
            const adminExists = await User.findOne({ where: { username: 'admin' } });
            if (!adminExists) {
                await User.create({
                    username: 'admin',
                    password: 'admin123',
                    name: 'Administrador',
                    permissions: ADMIN_PERMISSIONS
                });
                console.log('✅ Default admin user created with all permissions.');
            }
        }
    } catch (error) {
        console.error('❌ Error synchronizing database:', error);
        throw error;
    }
};

module.exports = {
    sequelize,
    ...models,
    syncDatabase,
    testConnection
};
