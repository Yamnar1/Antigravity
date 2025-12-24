const { PERMISSIONS } = require('../config/permissions');

// Middleware to check if user has specific permission(s)
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // Check if user has any of the required permissions
        const hasPermission = req.user.hasAnyPermission(requiredPermissions);

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción',
                requiredPermissions
            });
        }

        next();
    };
};

// Middleware to check if user has ALL specified permissions
const authorizeAll = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const hasAllPermissions = req.user.hasAllPermissions(requiredPermissions);

        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: 'No tienes todos los permisos necesarios para realizar esta acción',
                requiredPermissions
            });
        }

        next();
    };
};

module.exports = { authorize, authorizeAll };
