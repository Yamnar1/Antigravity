const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { sequelize, testConnection, syncDatabase } = require('./models'); // Added sequelize to imports
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const aircraftRoutes = require('./routes/aircraft');
const pilotRoutes = require('./routes/pilots');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// CORS - Allow credentials (for cookies)
// CORS - Allow credentials (for cookies)
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://vpfs.netlify.app'],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// CSRF Protection (after cookie-parser)
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// CSRF token endpoint (no protection on this route itself, but generates token)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF to all /api routes except specific ones
app.use('/api', (req, res, next) => {
    // Skip CSRF for login and csrf-token endpoints
    // Note: req.path here is relative to '/api'
    if (req.path === '/auth/login' || req.path === '/csrf-token') {
        return next();
    }
    csrfProtection(req, res, next);
});

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Serve static files from root directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();

        // Sync database (create tables)
        // Set force: true to drop and recreate tables (only for development)
        await syncDatabase(false);

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(50));
            console.log('✈️  VPFS - Sistema de Verificación Prevuelo - API');
            console.log('='.repeat(50));
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 API URL: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log('');
            console.log('Available endpoints:');
            console.log('  POST   /api/auth/login');
            console.log('  GET    /api/auth/me');
            console.log('  GET    /api/users');
            console.log('  POST   /api/users');
            console.log('  GET    /api/aircraft');
            console.log('  GET    /api/aircraft/stats');
            console.log('  GET    /api/pilots');
            console.log('  GET    /api/pilots/stats');
            console.log('='.repeat(50));
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
