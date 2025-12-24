const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'),
        allowNull: false
    },
    resource: {
        type: DataTypes.ENUM('aircraft', 'pilot', 'user', 'auth'),
        allowNull: false
    },
    resourceId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    resourceName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('details');
            return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
            this.setDataValue('details', value ? JSON.stringify(value) : null);
        }
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false
});

module.exports = AuditLog;
