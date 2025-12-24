// ===================================
// API CLIENT MODULE
// ===================================

const API = {
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : 'https://antigravity-qub9.onrender.com/api',
    token: null,
    csrfToken: null,

    // Initialize - load token from localStorage
    async init() {
        this.token = this.getToken();

        // Auto-logout if token expired
        if (this.isTokenExpired()) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            this.token = null;
        }

        // Fetch CSRF token on init
        try {
            await this.fetchCsrfToken();
        } catch (e) {
            console.error('Failed to fetch CSRF token:', e);
        }
    },

    // Fetch CSRF token from server
    async fetchCsrfToken() {
        try {
            const response = await fetch(`${this.baseURL}/csrf-token`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            if (data.csrfToken) {
                this.csrfToken = data.csrfToken;
            }
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
        }
    },

    // Set authorization and CSRF headers
    getHeaders(method = 'GET') {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add CSRF token for state-changing requests
        if (method !== 'GET' && method !== 'HEAD' && this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Use getToken() to ensure we're getting a valid, non-expired token
        const validToken = this.getToken();
        if (validToken) {
            headers['Authorization'] = `Bearer ${validToken}`;
        }

        return headers;
    },

    // Generic request method
    async request(endpoint, options = {}) {
        const method = options.method || 'GET';
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: this.getHeaders(method)
            });

            // If we get a 403 Forbidden (likely CSRF error), try to refresh token once
            if (response.status === 403 && endpoint !== '/csrf-token') {
                await this.fetchCsrfToken();
                // Retry request with new token
                const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
                    ...options,
                    headers: this.getHeaders(method)
                });
                const data = await retryResponse.json();
                if (!retryResponse.ok) throw new Error(data.message || 'Error en la petición');
                return data;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }

            return data;
        } catch (error) {
            // Don't log to console - let calling functions handle errors appropriately
            throw error;
        }
    },

    // Authentication
    async login(username, password) {
        // Rate limiting: Max 5 attempts per minute
        if (!SecurityUtils.rateLimiter.canAttempt('login', 5, 60000)) {
            const resetTime = SecurityUtils.rateLimiter.getResetTime('login', 60000);
            const seconds = Math.ceil(resetTime / 1000);
            throw new Error(`Demasiados intentos de login. Espera ${seconds} segundos.`);
        }

        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.success && data.token) {
            this.token = data.token;

            // Store token with expiration (8 hours from now)
            const tokenData = {
                token: data.token,
                expiresAt: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
            };

            localStorage.setItem('authToken', JSON.stringify(tokenData));
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            // Clear rate limit on successful login
            SecurityUtils.rateLimiter.clear('login');
        }

        return data;
    },

    // Check if token is expired
    isTokenExpired() {
        const tokenStr = localStorage.getItem('authToken');
        if (!tokenStr) return true;

        try {
            // Try to parse as JSON (new format)
            const tokenData = JSON.parse(tokenStr);

            // If it's just a string (old format), treat as expired to force re-login
            if (typeof tokenData === 'string') {
                return true;
            }

            // Check if expired
            if (Date.now() > tokenData.expiresAt) {
                console.warn('Token expired');
                return true;
            }

            return false;
        } catch (e) {
            // If it's not valid JSON, it might be an old raw token string
            // Treat as expired to force a clean state
            return true;
        }
    },

    // Get valid token
    getToken() {
        const tokenStr = localStorage.getItem('authToken');
        if (!tokenStr) return null;

        try {
            const tokenData = JSON.parse(tokenStr);

            // Old format compatibility (if it was a JSON-encoded string)
            if (typeof tokenData === 'string') {
                return tokenData;
            }

            // Check expiration
            if (Date.now() > tokenData.expiresAt) {
                return null;
            }

            return tokenData.token;
        } catch (e) {
            // If it's not JSON, it's likely an old raw token string
            return tokenStr;
        }
    },

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Save username for next login
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                try {
                    const user = JSON.parse(currentUser);
                    if (user.username) {
                        localStorage.setItem('savedUsername', user.username);
                    }
                } catch (e) {
                    console.error('Error saving username:', e);
                }
            }

            this.token = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    },

    async getCurrentUser() {
        return await this.request('/auth/me');
    },

    // Users
    async getUsers() {
        return await this.request('/users');
    },

    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async updateUser(id, userData) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    },

    // Aircraft
    async getAircraft() {
        return await this.request('/aircraft');
    },

    async getAircraftStats() {
        return await this.request('/aircraft/stats');
    },

    async getAircraftById(id) {
        return await this.request(`/aircraft/${id}`);
    },

    async createAircraft(aircraftData) {
        return await this.request('/aircraft', {
            method: 'POST',
            body: JSON.stringify(aircraftData)
        });
    },

    async updateAircraft(id, aircraftData) {
        return await this.request(`/aircraft/${id}`, {
            method: 'PUT',
            body: JSON.stringify(aircraftData)
        });
    },

    async deleteAircraft(id) {
        return await this.request(`/aircraft/${id}`, {
            method: 'DELETE'
        });
    },

    // Pilots
    async getPilots() {
        return await this.request('/pilots');
    },

    async getPilotStats() {
        return await this.request('/pilots/stats');
    },

    async getPilotById(id) {
        return await this.request(`/pilots/${id}`);
    },

    async createPilot(pilotData) {
        return await this.request('/pilots', {
            method: 'POST',
            body: JSON.stringify(pilotData)
        });
    },

    async updatePilot(id, pilotData) {
        return await this.request(`/pilots/${id}`, {
            method: 'PUT',
            body: JSON.stringify(pilotData)
        });
    },

    async deletePilot(id) {
        return await this.request(`/pilots/${id}`, {
            method: 'DELETE'
        });
    },

    // Audit Logs
    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/audit-logs?${params}`);
    },

    async getAuditLogStats() {
        return await this.request('/audit-logs/stats');
    }
};

// Initialize API on load
API.init();
