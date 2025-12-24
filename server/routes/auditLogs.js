const express = require('express');
const router = express.Router();
const { AuditLog, User, sequelize } = require('../models');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../config/permissions');
const { Op } = require('sequelize');

// Get all audit logs with filters (admin only)
router.get('/', authenticate, authorize(PERMISSIONS.MANAGE_USERS), async (req, res) => {
    try {
        const {
            userId,
            action,
            resource,
            startDate,
            endDate,
            limit = 100,
            offset = 0
        } = req.query;

        // Build where clause
        const where = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resource) where.resource = resource;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'name'],
                required: false
            }]
        });

        res.json({
            success: true,
            logs: rows,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener registros de auditoría'
        });
    }
});

// Get audit log statistics
router.get('/stats', authenticate, authorize(PERMISSIONS.MANAGE_USERS), async (req, res) => {
    try {
        const total = await AuditLog.count();

        const actionCounts = await AuditLog.findAll({
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('action')), 'count']
            ],
            group: ['action']
        });

        const resourceCounts = await AuditLog.findAll({
            attributes: [
                'resource',
                [sequelize.fn('COUNT', sequelize.col('resource')), 'count']
            ],
            group: ['resource']
        });

        res.json({
            success: true,
            stats: {
                total,
                byAction: actionCounts.map(a => ({ action: a.action, count: parseInt(a.get('count')) })),
                byResource: resourceCounts.map(r => ({ resource: r.resource, count: parseInt(r.get('count')) }))
            }
        });
    } catch (error) {
        console.error('Get audit log stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de auditoría'
        });
    }
});

module.exports = router;
