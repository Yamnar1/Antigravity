const express = require('express');
const router = express.Router();
const { Aircraft } = require('../models');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../config/permissions');
const { Op } = require('sequelize');
const auditLogger = require('../middleware/auditLogger');

// Get all aircraft (requires VIEW_ALL)
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const aircraft = await Aircraft.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Get aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener aeronaves'
        });
    }
});

// Get aircraft statistics
router.get('/stats', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const total = await Aircraft.count();
        const withDebt = await Aircraft.count({
            where: {
                debt_status: { [Op.ne]: 'paid' }
            }
        });

        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const validAirworthiness = await Aircraft.count({
            where: {
                airworthiness_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const validRadio = await Aircraft.count({
            where: {
                radio_station_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const validInsurance = await Aircraft.count({
            where: {
                insurance_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const alerts = total - Math.min(validAirworthiness, validRadio, validInsurance);

        res.json({
            success: true,
            stats: {
                total,
                withDebt,
                validAirworthiness,
                validRadio,
                validInsurance,
                alerts
            }
        });
    } catch (error) {
        console.error('Get aircraft stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Search aircraft by registration (with audit) - MUST BE BEFORE /:id
router.get('/search/:registration', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findOne({
            where: {
                registration: {
                    [Op.like]: `%${req.params.registration}%`
                }
            }
        });

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Search aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar aeronave'
        });
    }
});

// Get single aircraft
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Get aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener aeronave'
        });
    }
});

// Create aircraft
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_AIRCRAFT), auditLogger('CREATE', 'aircraft'), async (req, res) => {
    try {
        const {
            registration,
            manufacturer,
            model,
            serial_number,
            debt_status,
            debt_details,
            debt_amount,
            debt_currency,
            airworthiness_cert,
            airworthiness_classification,
            airworthiness_expiry,
            radio_station_cert,
            radio_station_expiry,
            insurance,
            insurance_company,
            insurance_expiry,
            registration_cert,
            registration_date,
            acoustic_cert,
            acoustic_expiry,
            predominant_colors,
            aircraft_use_type,
            holders,
            base_airport
        } = req.body;

        // Check if registration exists
        const existing = await Aircraft.findOne({ where: { registration } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'La matrícula ya existe'
            });
        }

        // Validar unicidad de certificados por tipo
        if (airworthiness_cert) {
            const existingAir = await Aircraft.findOne({ where: { airworthiness_cert } });
            if (existingAir) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de aeronavegabilidad "${airworthiness_cert}" ya está asignado a otra aeronave (${existingAir.registration})`
                });
            }
        }

        if (radio_station_cert) {
            const existingRadio = await Aircraft.findOne({ where: { radio_station_cert } });
            if (existingRadio) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de estación de radio "${radio_station_cert}" ya está asignado a otra aeronave (${existingRadio.registration})`
                });
            }
        }

        if (insurance) {
            const existingInsurance = await Aircraft.findOne({ where: { insurance } });
            if (existingInsurance) {
                return res.status(400).json({
                    success: false,
                    message: `La póliza de seguro "${insurance}" ya está asignada a otra aeronave (${existingInsurance.registration})`
                });
            }
        }

        if (registration_cert) {
            const existingRegCert = await Aircraft.findOne({ where: { registration_cert } });
            if (existingRegCert) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de matrícula "${registration_cert}" ya está asignado a otra aeronave (${existingRegCert.registration})`
                });
            }
        }

        if (acoustic_cert) {
            const existingAcoustic = await Aircraft.findOne({ where: { acoustic_cert } });
            if (existingAcoustic) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de homologación acústica "${acoustic_cert}" ya está asignado a otra aeronave (${existingAcoustic.registration})`
                });
            }
        }

        // Convert empty strings to null for date fields
        const cleanData = {
            registration,
            manufacturer,
            model,
            serial_number,
            debt_status,
            debt_details,
            debt_amount,
            debt_currency,
            airworthiness_cert,
            airworthiness_classification,
            airworthiness_expiry: airworthiness_expiry || null,
            radio_station_cert,
            radio_station_expiry: radio_station_expiry || null,
            insurance,
            insurance_company,
            insurance_expiry: insurance_expiry || null,
            registration_cert,
            registration_date: registration_date || null,
            acoustic_cert,
            acoustic_expiry: acoustic_expiry || null,
            predominant_colors,
            aircraft_use_type,
            holders,
            base_airport
        };

        const aircraft = await Aircraft.create(cleanData);

        res.status(201).json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Create aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear aeronave'
        });
    }
});

// Update aircraft - Full update (requires multiple permissions)
router.put('/:id', authenticate, auditLogger('UPDATE', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        const updates = {};

        // Check permissions for each field
        if (req.body.registration !== undefined || req.body.manufacturer !== undefined ||
            req.body.model !== undefined || req.body.serial_number !== undefined ||
            req.body.predominant_colors !== undefined || req.body.aircraft_use_type !== undefined ||
            req.body.holders !== undefined || req.body.base_airport !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_AIRCRAFT_BASIC)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar información básica'
                });
            }
            if (req.body.registration) updates.registration = req.body.registration;
            if (req.body.manufacturer) updates.manufacturer = req.body.manufacturer;
            if (req.body.model) updates.model = req.body.model;
            if (req.body.serial_number !== undefined) updates.serial_number = req.body.serial_number;
            if (req.body.predominant_colors !== undefined) updates.predominant_colors = req.body.predominant_colors;
            if (req.body.aircraft_use_type !== undefined) updates.aircraft_use_type = req.body.aircraft_use_type;
            if (req.body.holders !== undefined) updates.holders = req.body.holders;
            if (req.body.base_airport !== undefined) updates.base_airport = req.body.base_airport;
        }

        if (req.body.debt_status !== undefined || req.body.debt_details !== undefined ||
            req.body.debt_amount !== undefined || req.body.debt_currency !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_DEBT)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el estatus de deuda'
                });
            }
            if (req.body.debt_status) updates.debt_status = req.body.debt_status;
            if (req.body.debt_details !== undefined) updates.debt_details = req.body.debt_details;
            if (req.body.debt_amount !== undefined) updates.debt_amount = req.body.debt_amount;
            if (req.body.debt_currency !== undefined) updates.debt_currency = req.body.debt_currency;
        }

        if (req.body.insurance !== undefined || req.body.insurance_company !== undefined || req.body.insurance_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_INSURANCE)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el seguro'
                });
            }
            if (req.body.insurance !== undefined) updates.insurance = req.body.insurance;
            if (req.body.insurance_company !== undefined) updates.insurance_company = req.body.insurance_company;
            if (req.body.insurance_expiry !== undefined) updates.insurance_expiry = req.body.insurance_expiry;
        }

        if (req.body.airworthiness_cert !== undefined || req.body.airworthiness_classification !== undefined || req.body.airworthiness_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_AIRWORTHINESS)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el certificado de aeronavegabilidad'
                });
            }
            if (req.body.airworthiness_cert !== undefined) updates.airworthiness_cert = req.body.airworthiness_cert;
            if (req.body.airworthiness_classification !== undefined) updates.airworthiness_classification = req.body.airworthiness_classification;
            if (req.body.airworthiness_expiry !== undefined) updates.airworthiness_expiry = req.body.airworthiness_expiry;
        }

        if (req.body.radio_station_cert !== undefined || req.body.radio_station_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_RADIO)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el certificado de radio'
                });
            }
            if (req.body.radio_station_cert) updates.radio_station_cert = req.body.radio_station_cert;
            if (req.body.radio_station_expiry) updates.radio_station_expiry = req.body.radio_station_expiry;
        }

        // Nuevos certificados - cualquier usuario con permisos básicos puede actualizarlos
        if (req.body.registration_cert !== undefined || req.body.registration_date !== undefined) {
            if (req.body.registration_cert !== undefined) updates.registration_cert = req.body.registration_cert;
            if (req.body.registration_date !== undefined) updates.registration_date = req.body.registration_date;
        }

        if (req.body.acoustic_cert !== undefined || req.body.acoustic_expiry !== undefined) {
            if (req.body.acoustic_cert !== undefined) updates.acoustic_cert = req.body.acoustic_cert;
            if (req.body.acoustic_expiry !== undefined) updates.acoustic_expiry = req.body.acoustic_expiry;
        }

        // Check if new registration conflicts
        if (updates.registration && updates.registration !== aircraft.registration) {
            const existing = await Aircraft.findOne({ where: { registration: updates.registration } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'La matrícula ya existe'
                });
            }
        }

        // Validar unicidad de certificados al actualizar
        if (updates.airworthiness_cert && updates.airworthiness_cert !== aircraft.airworthiness_cert) {
            const existingAir = await Aircraft.findOne({ where: { airworthiness_cert: updates.airworthiness_cert } });
            if (existingAir) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de aeronavegabilidad "${updates.airworthiness_cert}" ya está asignado a otra aeronave (${existingAir.registration})`
                });
            }
        }

        if (updates.radio_station_cert && updates.radio_station_cert !== aircraft.radio_station_cert) {
            const existingRadio = await Aircraft.findOne({ where: { radio_station_cert: updates.radio_station_cert } });
            if (existingRadio) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de estación de radio "${updates.radio_station_cert}" ya está asignado a otra aeronave (${existingRadio.registration})`
                });
            }
        }

        if (updates.insurance && updates.insurance !== aircraft.insurance) {
            const existingInsurance = await Aircraft.findOne({ where: { insurance: updates.insurance } });
            if (existingInsurance) {
                return res.status(400).json({
                    success: false,
                    message: `La póliza de seguro "${updates.insurance}" ya está asignada a otra aeronave (${existingInsurance.registration})`
                });
            }
        }

        if (updates.registration_cert && updates.registration_cert !== aircraft.registration_cert) {
            const existingRegCert = await Aircraft.findOne({ where: { registration_cert: updates.registration_cert } });
            if (existingRegCert) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de matrícula "${updates.registration_cert}" ya está asignado a otra aeronave (${existingRegCert.registration})`
                });
            }
        }

        if (updates.acoustic_cert && updates.acoustic_cert !== aircraft.acoustic_cert) {
            const existingAcoustic = await Aircraft.findOne({ where: { acoustic_cert: updates.acoustic_cert } });
            if (existingAcoustic) {
                return res.status(400).json({
                    success: false,
                    message: `El certificado de homologación acústica "${updates.acoustic_cert}" ya está asignado a otra aeronave (${existingAcoustic.registration})`
                });
            }
        }

        await aircraft.update(updates);

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Update aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar aeronave'
        });
    }
});

// Update debt status only
router.patch('/:id/debt', authenticate, authorize(PERMISSIONS.MANAGE_DEBT), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        await aircraft.update({ debt_status: req.body.debt_status });
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar deuda' });
    }
});

// Update insurance only
router.patch('/:id/insurance', authenticate, authorize(PERMISSIONS.MANAGE_INSURANCE), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.insurance) updates.insurance = req.body.insurance;
        if (req.body.insurance_expiry) updates.insurance_expiry = req.body.insurance_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar seguro' });
    }
});

// Update airworthiness certificate only
router.patch('/:id/airworthiness', authenticate, authorize(PERMISSIONS.MANAGE_AIRWORTHINESS), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.airworthiness_cert) updates.airworthiness_cert = req.body.airworthiness_cert;
        if (req.body.airworthiness_expiry) updates.airworthiness_expiry = req.body.airworthiness_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar certificado' });
    }
});

// Update radio certificate only
router.patch('/:id/radio', authenticate, authorize(PERMISSIONS.MANAGE_RADIO), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.radio_station_cert) updates.radio_station_cert = req.body.radio_station_cert;
        if (req.body.radio_station_expiry) updates.radio_station_expiry = req.body.radio_station_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar certificado de radio' });
    }
});

// Delete aircraft
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_AIRCRAFT), auditLogger('DELETE', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        await aircraft.destroy();

        res.json({
            success: true,
            message: 'Aeronave eliminada correctamente'
        });
    } catch (error) {
        console.error('Delete aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar aeronave'
        });
    }
});

module.exports = router;
