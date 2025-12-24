// ===================================
// PERMISSIONS CONSTANTS
// ===================================

const PERMISSIONS = {
    // Lectura
    VIEW_ALL: 'view_all',

    // Aeronaves - Gestión
    VIEW_AIRCRAFT_MODULE: 'view_aircraft_module',
    CREATE_AIRCRAFT: 'create_aircraft',
    DELETE_AIRCRAFT: 'delete_aircraft',
    MANAGE_AIRCRAFT_BASIC: 'manage_aircraft_basic',

    // Aeronaves - Campos específicos
    MANAGE_DEBT: 'manage_debt',
    MANAGE_INSURANCE: 'manage_insurance',
    MANAGE_AIRWORTHINESS: 'manage_airworthiness',
    MANAGE_RADIO: 'manage_radio',

    // Pilotos - Gestión
    VIEW_PILOTS_MODULE: 'view_pilots_module',
    CREATE_PILOT: 'create_pilot',
    DELETE_PILOT: 'delete_pilot',
    MANAGE_PILOT_BASIC: 'manage_pilot_basic',

    // Pilotos - Campos específicos
    MANAGE_PILOT_LICENSE: 'manage_pilot_license',
    MANAGE_PILOT_MEDICAL: 'manage_pilot_medical',

    // Administración
    MANAGE_USERS: 'manage_users'
};

// Grupos de permisos para UI
const PERMISSION_GROUPS = {
    aircraft: {
        label: 'Aeronaves',
        permissions: [
            { key: PERMISSIONS.VIEW_AIRCRAFT_MODULE, label: 'Ver módulo de aeronaves' },
            { key: PERMISSIONS.CREATE_AIRCRAFT, label: 'Crear aeronaves' },
            { key: PERMISSIONS.DELETE_AIRCRAFT, label: 'Eliminar aeronaves' },
            { key: PERMISSIONS.MANAGE_AIRCRAFT_BASIC, label: 'Modificar información básica' },
            { key: PERMISSIONS.MANAGE_DEBT, label: 'Modificar estatus de deuda' },
            { key: PERMISSIONS.MANAGE_INSURANCE, label: 'Modificar seguro' },
            { key: PERMISSIONS.MANAGE_AIRWORTHINESS, label: 'Modificar certificado de aeronavegabilidad' },
            { key: PERMISSIONS.MANAGE_RADIO, label: 'Modificar certificado de radio' }
        ]
    },
    pilots: {
        label: 'Pilotos',
        permissions: [
            { key: PERMISSIONS.VIEW_PILOTS_MODULE, label: 'Ver módulo de pilotos' },
            { key: PERMISSIONS.CREATE_PILOT, label: 'Crear pilotos' },
            { key: PERMISSIONS.DELETE_PILOT, label: 'Eliminar pilotos' },
            { key: PERMISSIONS.MANAGE_PILOT_BASIC, label: 'Modificar información básica' },
            { key: PERMISSIONS.MANAGE_PILOT_LICENSE, label: 'Modificar licencia' },
            { key: PERMISSIONS.MANAGE_PILOT_MEDICAL, label: 'Modificar certificado médico' }
        ]
    },
    system: {
        label: 'Sistema',
        permissions: [
            { key: PERMISSIONS.VIEW_ALL, label: 'Ver toda la información' },
            { key: PERMISSIONS.MANAGE_USERS, label: 'Gestionar usuarios y permisos' }
        ]
    }
};

// Permisos de admin (todos)
const ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

// Permisos de viewer (solo lectura)
const VIEWER_PERMISSIONS = [PERMISSIONS.VIEW_ALL];

// Validar si un permiso existe
const isValidPermission = (permission) => {
    return Object.values(PERMISSIONS).includes(permission);
};

// Validar array de permisos
const validatePermissions = (permissions) => {
    if (!Array.isArray(permissions)) return false;
    return permissions.every(p => isValidPermission(p));
};

module.exports = {
    PERMISSIONS,
    PERMISSION_GROUPS,
    ADMIN_PERMISSIONS,
    VIEWER_PERMISSIONS,
    isValidPermission,
    validatePermissions
};
