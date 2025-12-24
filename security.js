// ===================================
// SECURITY UTILITIES
// ===================================

const SecurityUtils = {
    /**
     * Escapes HTML special characters to prevent XSS attacks
     * @param {string} text - The text to escape
     * @returns {string} - Escaped text safe for HTML insertion
     */
    escapeHtml(text) {
        if (text == null) return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;'
        };

        return String(text).replace(/[&<>"'\/]/g, char => map[char]);
    },

    /**
     * Validates and safely parses JSON from localStorage
     * @param {string} key - localStorage key
     * @param {Function} validator - Optional validation function
     * @returns {Object|null} - Parsed object or null if invalid
     */
    safeJsonParse(jsonString, validator = null) {
        if (!jsonString) return null;

        try {
            const parsed = JSON.parse(jsonString);

            // Run custom validator if provided
            if (validator && !validator(parsed)) {
                console.warn('JSON validation failed');
                return null;
            }

            return parsed;
        } catch (e) {
            console.error('Invalid JSON:', e.message);
            return null;
        }
    },

    /**
     * Validates user object structure
     * @param {Object} user - User object to validate
     * @returns {boolean} - True if valid
     */
    validateUserObject(user) {
        if (!user || typeof user !== 'object') return false;
        if (!user.id || !user.username) return false;
        if (!Array.isArray(user.permissions)) return false;
        return true;
    },

    /**
     * Rate Limiter - Prevents brute force attacks
     */
    rateLimiter: {
        attempts: {},

        /**
         * Check if action is allowed based on rate limit
         * @param {string} key - Unique key for this action (e.g., 'login', 'search')
         * @param {number} maxAttempts - Maximum attempts allowed
         * @param {number} windowMs - Time window in milliseconds
         * @returns {boolean} - True if action is allowed
         */
        canAttempt(key, maxAttempts = 5, windowMs = 60000) {
            const now = Date.now();
            const attempts = this.attempts[key] || [];

            // Clean up old attempts outside the time window
            const recentAttempts = attempts.filter(time => now - time < windowMs);

            if (recentAttempts.length >= maxAttempts) {
                return false;
            }

            // Log this attempt
            this.attempts[key] = [...recentAttempts, now];
            return true;
        },

        /**
         * Get remaining time until rate limit resets
         * @param {string} key - Rate limit key
         * @param {number} windowMs - Time window in milliseconds
         * @returns {number} - Milliseconds until reset
         */
        getResetTime(key, windowMs = 60000) {
            const attempts = this.attempts[key] || [];
            if (attempts.length === 0) return 0;

            const oldestAttempt = Math.min(...attempts);
            const resetTime = oldestAttempt + windowMs;
            return Math.max(0, resetTime - Date.now());
        },

        /**
         * Clear rate limit for a key
         * @param {string} key - Rate limit key to clear
         */
        clear(key) {
            delete this.attempts[key];
        }
    }
};
