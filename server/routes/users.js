const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS, validatePermissions } = require('../config/permissions');
const auditLogger = require('../middleware/auditLogger');

// Get all users (requires MANAGE_USERS permission)
router.get('/', authenticate, authorize(PERMISSIONS.MANAGE_USERS), async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
});

// Create user (requires MANAGE_USERS permission)
router.post('/', authenticate, authorize(PERMISSIONS.MANAGE_USERS), auditLogger('CREATE', 'user'), async (req, res) => {
    try {
        const { username, password, name, permissions } = req.body;

        // Validation
        if (!username || !password || !name || !permissions) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Validate permissions array
        if (!validatePermissions(permissions)) {
            return res.status(400).json({
                success: false,
                message: 'Permisos inválidos'
            });
        }

        // Check if username exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya existe'
            });
        }

        // Create user
        const user = await User.create({
            username,
            password,
            name,
            permissions
        });

        res.status(201).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario'
        });
    }
});

// Update user (requires MANAGE_USERS permission)
router.put('/:id', authenticate, authorize(PERMISSIONS.MANAGE_USERS), auditLogger('UPDATE', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, permissions } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Check if new username conflicts
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de usuario ya existe'
                });
            }
        }

        // Validate permissions if provided
        if (permissions && !validatePermissions(permissions)) {
            return res.status(400).json({
                success: false,
                message: 'Permisos inválidos'
            });
        }

        // Update fields
        if (username) user.username = username;
        if (password) user.password = password;
        if (name) user.name = name;
        if (permissions) user.permissions = permissions;

        await user.save();

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
});

// Delete user (requires MANAGE_USERS permission)
router.delete('/:id', authenticate, authorize(PERMISSIONS.MANAGE_USERS), auditLogger('DELETE', 'user'), async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Prevent deleting the last user with MANAGE_USERS permission
        if (user.hasPermission(PERMISSIONS.MANAGE_USERS)) {
            const usersWithManagePermission = await User.findAll();
            const count = usersWithManagePermission.filter(u =>
                u.hasPermission(PERMISSIONS.MANAGE_USERS)
            ).length;

            if (count === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'No puedes eliminar el último usuario con permisos de gestión'
                });
            }
        }

        await user.destroy();

        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario'
        });
    }
});

module.exports = router;
