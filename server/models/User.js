const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');
const { ADMIN_PERMISSIONS, validatePermissions } = require('../config/permissions');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [3, 50]
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [6, 100]
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    permissions: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '["view_all"]',
        get() {
            const rawValue = this.getDataValue('permissions');
            return rawValue ? JSON.parse(rawValue) : ['view_all'];
        },
        set(value) {
            if (!Array.isArray(value)) {
                throw new Error('Permissions must be an array');
            }
            if (!validatePermissions(value)) {
                throw new Error('Invalid permissions');
            }
            this.setDataValue('permissions', JSON.stringify(value));
        }
    }
}, {
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

// Instance method to compare passwords
User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if user has a specific permission
User.prototype.hasPermission = function (permission) {
    const userPermissions = this.permissions;
    return userPermissions.includes(permission);
};

// Instance method to check if user has any of the specified permissions
User.prototype.hasAnyPermission = function (permissions) {
    const userPermissions = this.permissions;
    return permissions.some(p => userPermissions.includes(p));
};

// Instance method to check if user has all of the specified permissions
User.prototype.hasAllPermissions = function (permissions) {
    const userPermissions = this.permissions;
    return permissions.every(p => userPermissions.includes(p));
};

// Instance method to check if user is admin (has all permissions)
User.prototype.isAdmin = function () {
    return this.hasAllPermissions(ADMIN_PERMISSIONS);
};

// Remove password from JSON output
User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

module.exports = User;
