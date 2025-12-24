const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authenticate = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Find user
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '8h' } // Match frontend expiration
        );

        // Set HttpOnly cookie (NEW - for enhanced security)
        res.cookie('authToken', token, {
            httpOnly: true,  // Cannot be accessed via JavaScript
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // CSRF protection
            maxAge: 8 * 60 * 60 * 1000 // 8 hours (matches token expiration)
        });

        // ALSO return token in response (BACKWARD COMPATIBILITY)
        // This allows frontend to work while we transition to cookies
        res.json({
            success: true,
            token,  // ← Send token for old frontend
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                permissions: user.permissions,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                name: req.user.name,
                permissions: req.user.permissions, // ✅ Include permissions
                created_at: req.user.created_at
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario actual'
        });
    }
});

// Logout (clear cookie)
router.post('/logout', authenticate, (req, res) => {
    // Clear the HttpOnly cookie
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
    });
});

module.exports = router;
