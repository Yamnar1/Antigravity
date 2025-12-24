const express = require('express');
const router = express.Router();
const { Pilot } = require('../models');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../config/permissions');
const { Op } = require('sequelize');
const auditLogger = require('../middleware/auditLogger');

// Get all pilots
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const pilots = await Pilot.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            pilots
        });
    } catch (error) {
        console.error('Get pilots error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pilotos'
        });
    }
});

// Get pilot statistics
router.get('/stats', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const total = await Pilot.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredLicense = await Pilot.count({
            where: {
                license_expiry: {
                    [Op.lt]: today
                }
            }
        });

        const expiredMedical = await Pilot.count({
            where: {
                medical_expiry: {
                    [Op.lt]: today
                }
            }
        });

        const alerts = expiredLicense + expiredMedical;

        res.json({
            success: true,
            stats: {
                total,
                expiredLicense,
                expiredMedical,
                alerts
            }
        });
    } catch (error) {
        console.error('Get pilot stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Search pilot by name or ID number (with audit) - MUST BE BEFORE /:id
router.get('/search/:query', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'pilot'), async (req, res) => {
    try {
        const pilot = await Pilot.findOne({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${req.params.query}%` } },
                    { id_number: req.params.query }
                ]
            }
        });

        if (!pilot) {
            return res.status(404).json({
                success: false,
                message: 'Piloto no encontrado'
            });
        }

        res.json({
            success: true,
            pilot
        });
    } catch (error) {
        console.error('Search pilot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar piloto'
        });
    }
});

// Get single pilot
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'pilot'), async (req, res) => {
    try {
        const pilot = await Pilot.findByPk(req.params.id);

        if (!pilot) {
            return res.status(404).json({
                success: false,
                message: 'Piloto no encontrado'
            });
        }

        res.json({
            success: true,
            pilot
        });
    } catch (error) {
        console.error('Get pilot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener piloto'
        });
    }
});

// Create pilot
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_PILOT), auditLogger('CREATE', 'pilot'), async (req, res) => {
    try {
        // Check if ID number exists
        const existing = await Pilot.findOne({ where: { id_number: req.body.id_number } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'El número de identificación ya existe'
            });
        }

        // Create pilot with all fields from request body
        const pilot = await Pilot.create(req.body);

        res.status(201).json({
            success: true,
            pilot
        });
    } catch (error) {
        console.error('Create pilot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear piloto'
        });
    }
});

// Update pilot - Full update (requires multiple permissions)
router.put('/:id', authenticate, auditLogger('UPDATE', 'pilot'), async (req, res) => {
    try {
        const pilot = await Pilot.findByPk(req.params.id);

        if (!pilot) {
            return res.status(404).json({
                success: false,
                message: 'Piloto no encontrado'
            });
        }

        const updates = {};

        // Check permissions for each field
        if (req.body.name !== undefined || req.body.id_number !== undefined ||
            req.body.email !== undefined || req.body.phone !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_PILOT_BASIC)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar información básica'
                });
            }
            if (req.body.name) updates.name = req.body.name;
            if (req.body.id_number) updates.id_number = req.body.id_number;
            if (req.body.email) updates.email = req.body.email;
            if (req.body.phone) updates.phone = req.body.phone;
        }

        if (req.body.license_number !== undefined || req.body.license_type !== undefined ||
            req.body.license_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_PILOT_LICENSE)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar la licencia'
                });
            }
            if (req.body.license_number) updates.license_number = req.body.license_number;
            if (req.body.license_type) updates.license_type = req.body.license_type;
            if (req.body.license_expiry) updates.license_expiry = req.body.license_expiry;
        }

        if (req.body.medical_cert !== undefined || req.body.medical_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_PILOT_MEDICAL)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el certificado médico'
                });
            }
            if (req.body.medical_cert) updates.medical_cert = req.body.medical_cert;
            if (req.body.medical_expiry) updates.medical_expiry = req.body.medical_expiry;
        }

        const ratingFields = [
            'aircraft_rating_1', 'aircraft_rating_1_function', 'aircraft_rating_1_expiry',
            'aircraft_rating_2', 'aircraft_rating_2_function', 'aircraft_rating_2_expiry',
            'aircraft_rating_3', 'aircraft_rating_3_function', 'aircraft_rating_3_expiry',
            'aircraft_rating_4', 'aircraft_rating_4_function', 'aircraft_rating_4_expiry',
            'aircraft_rating_5', 'aircraft_rating_5_function', 'aircraft_rating_5_expiry',
            'aircraft_rating_6', 'aircraft_rating_6_function', 'aircraft_rating_6_expiry',
            'aircraft_rating_7', 'aircraft_rating_7_function', 'aircraft_rating_7_expiry',
            'aircraft_rating_8', 'aircraft_rating_8_function', 'aircraft_rating_8_expiry',
            'aircraft_rating_9', 'aircraft_rating_9_function', 'aircraft_rating_9_expiry',
            'aircraft_rating_10', 'aircraft_rating_10_function', 'aircraft_rating_10_expiry',
            'ifr_rating', 'ifr_rating_obs', 'ifr_rating_expiry',
            'language_proficiency', 'language_proficiency_obs', 'language_proficiency_expiry',
            'night_rating', 'night_rating_obs', 'night_rating_expiry',
            'multi_engine_rating', 'multi_engine_rating_obs', 'multi_engine_rating_expiry',
            'formation_rating', 'formation_rating_obs', 'formation_rating_expiry',
            'instructor_rating', 'instructor_rating_obs', 'instructor_rating_expiry',
            'other_rating', 'other_rating_obs', 'other_rating_expiry',
            'other_rating_2', 'other_rating_2_obs', 'other_rating_2_expiry',
            'other_rating_3', 'other_rating_3_obs', 'other_rating_3_expiry',
            'other_rating_4', 'other_rating_4_obs', 'other_rating_4_expiry'
        ];
        ratingFields.forEach(field => {
            if (req.body[field] !== undefined) {
                // Convert empty strings to null for date fields
                if (field.endsWith('_expiry')) {
                    updates[field] = req.body[field] || null;
                } else {
                    // Only update if there's a real value (not empty string)
                    if (req.body[field] !== '') {
                        updates[field] = req.body[field];
                    } else {
                        updates[field] = null;
                    }
                }
            }
        });

        // Check if new ID number conflicts
        if (updates.id_number && updates.id_number !== pilot.id_number) {
            const existing = await Pilot.findOne({ where: { id_number: updates.id_number } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'El número de identificación ya existe'
                });
            }
        }

        await pilot.update(updates);

        res.json({
            success: true,
            pilot
        });
    } catch (error) {
        console.error('Update pilot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar piloto'
        });
    }
});

// Update license only
router.patch('/:id/license', authenticate, authorize(PERMISSIONS.MANAGE_PILOT_LICENSE), async (req, res) => {
    try {
        const pilot = await Pilot.findByPk(req.params.id);
        if (!pilot) {
            return res.status(404).json({ success: false, message: 'Piloto no encontrado' });
        }

        const updates = {};
        if (req.body.license_number) updates.license_number = req.body.license_number;
        if (req.body.license_type) updates.license_type = req.body.license_type;
        if (req.body.license_expiry) updates.license_expiry = req.body.license_expiry;

        await pilot.update(updates);
        res.json({ success: true, pilot });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar licencia' });
    }
});

// Update medical certificate only
router.patch('/:id/medical', authenticate, authorize(PERMISSIONS.MANAGE_PILOT_MEDICAL), async (req, res) => {
    try {
        const pilot = await Pilot.findByPk(req.params.id);
        if (!pilot) {
            return res.status(404).json({ success: false, message: 'Piloto no encontrado' });
        }

        const updates = {};
        if (req.body.medical_cert) updates.medical_cert = req.body.medical_cert;
        if (req.body.medical_expiry) updates.medical_expiry = req.body.medical_expiry;

        await pilot.update(updates);
        res.json({ success: true, pilot });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar certificado médico' });
    }
});

// Delete pilot
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_PILOT), auditLogger('DELETE', 'pilot'), async (req, res) => {
    try {
        const pilot = await Pilot.findByPk(req.params.id);

        if (!pilot) {
            return res.status(404).json({
                success: false,
                message: 'Piloto no encontrado'
            });
        }

        await pilot.destroy();

        res.json({
            success: true,
            message: 'Piloto eliminado correctamente'
        });
    } catch (error) {
        console.error('Delete pilot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar piloto'
        });
    }
});

module.exports = router;
