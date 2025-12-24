// ===================================
// AUTHENTICATION MODULE (API Version with Permissions)
// ===================================

const Auth = {
  // Initialize
  init() {
    // Check if we have a token using the API helper
    const token = API.getToken();
    if (token) {
      API.token = token;
    }
  },

  // Login user
  async login(username, password) {
    try {
      const result = await API.login(username, password);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al iniciar sesión' };
    }
  },

  // Logout user
  async logout() {
    await API.logout();
  },

  // Get current user (with security validation)
  getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);

      // Validate user object structure to prevent injection
      if (!user || typeof user !== 'object') {
        console.warn('Invalid user object in localStorage');
        localStorage.removeItem('currentUser');
        return null;
      }

      // Ensure required fields exist
      if (!user.id || !user.username) {
        console.warn('User missing required fields');
        localStorage.removeItem('currentUser');
        return null;
      }

      // Ensure permissions is an array
      if (!Array.isArray(user.permissions)) {
        console.warn('User permissions invalid');
        localStorage.removeItem('currentUser');
        return null;
      }

      return user;
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e.message);
      localStorage.removeItem('currentUser');
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },

  // Check if user has a specific permission
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  },

  // Check if user has any of the specified permissions
  hasAnyPermission(...permissions) {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    return permissions.some(p => user.permissions.includes(p));
  },

  // Check if user has all of the specified permissions
  hasAllPermissions(...permissions) {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    return permissions.every(p => user.permissions.includes(p));
  },

  // Check if user is admin (has MANAGE_USERS permission)
  isAdmin() {
    return this.hasPermission(PERMISSIONS.MANAGE_USERS);
  }
};

// Initialize auth on load
Auth.init();
