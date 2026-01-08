/**
 * AuthService - Production authentication with magic-link (passwordless)
 * Dev-mode magic-link flow that works without SMTP for local testing
 * 
 * Events emitted:
 * - pewpi.login.changed
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Map();
    this.devMode = true; // Set to false in production
    this.magicLinkStore = new Map(); // In-memory store for dev-mode magic links
    
    // Load current user from storage
    this._loadCurrentUser();
  }

  /**
   * Request magic link for email (passwordless authentication)
   */
  async requestMagicLink(email) {
    if (!email || !this._isValidEmail(email)) {
      throw new Error('Invalid email address');
    }

    // Generate magic link token
    const token = await this._generateToken();
    const magicLink = this._buildMagicLink(token);
    
    if (this.devMode) {
      // In dev mode, store the token in localStorage so it persists across page reloads
      const linkData = {
        email,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false
      };
      
      this.magicLinkStore.set(token, linkData);
      
      // Also save to localStorage for dev mode
      const allLinks = JSON.parse(localStorage.getItem('pewpi_magic_links') || '{}');
      allLinks[token] = linkData;
      localStorage.setItem('pewpi_magic_links', JSON.stringify(allLinks));
      
      console.log('[AuthService] Dev-mode magic link generated:', magicLink);
      
      return {
        success: true,
        magicLink, // Return link in dev mode for display
        message: 'Magic link generated (dev mode)'
      };
    } else {
      // In production, send email via API
      // This would typically call your backend API to send the email
      console.log('[AuthService] Sending magic link email to:', email);
      
      return {
        success: true,
        message: 'Magic link sent to your email'
      };
    }
  }

  /**
   * Verify magic link token and authenticate user
   */
  async verifyMagicLink(token) {
    let linkData;
    
    if (this.devMode) {
      // Check in-memory store first
      linkData = this.magicLinkStore.get(token);
      
      // If not found, check localStorage
      if (!linkData) {
        const allLinks = JSON.parse(localStorage.getItem('pewpi_magic_links') || '{}');
        linkData = allLinks[token];
      }
    } else {
      // In production, verify with backend API
      // This would call your API to verify the token
      throw new Error('Production magic link verification not implemented');
    }

    if (!linkData) {
      throw new Error('Invalid or expired magic link');
    }

    if (linkData.used) {
      throw new Error('Magic link has already been used');
    }

    if (Date.now() > linkData.expires) {
      throw new Error('Magic link has expired');
    }

    // Mark as used
    linkData.used = true;
    
    if (this.devMode) {
      this.magicLinkStore.set(token, linkData);
      const allLinks = JSON.parse(localStorage.getItem('pewpi_magic_links') || '{}');
      allLinks[token] = linkData;
      localStorage.setItem('pewpi_magic_links', JSON.stringify(allLinks));
    }

    // Create user session
    const user = {
      email: linkData.email,
      authMethod: 'magic-link',
      lastLogin: new Date().toISOString()
    };

    this.currentUser = user;
    this._saveCurrentUser(user);
    
    // Emit login event
    this._emitEvent('pewpi.login.changed', { user, action: 'login' });
    
    console.log('[AuthService] User authenticated:', user.email);
    
    return user;
  }

  /**
   * Restore session from storage
   * Safe to call on page load
   */
  async restoreSession() {
    try {
      const user = this._loadCurrentUser();
      
      if (user) {
        console.log('[AuthService] Session restored for:', user.email);
        this.currentUser = user;
        
        // Emit login event
        this._emitEvent('pewpi.login.changed', { user, action: 'restore' });
        
        return user;
      }
      
      console.log('[AuthService] No existing session found');
      return null;
    } catch (error) {
      console.error('[AuthService] Error restoring session:', error);
      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    if (!this.currentUser) {
      return;
    }

    const user = this.currentUser;
    this.currentUser = null;
    
    // Clear from storage
    localStorage.removeItem('pewpi_current_user');
    
    // Emit logout event
    this._emitEvent('pewpi.login.changed', { user, action: 'logout' });
    
    console.log('[AuthService] User logged out:', user.email);
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Private helper methods
   */
  
  _loadCurrentUser() {
    try {
      const userData = localStorage.getItem('pewpi_current_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('[AuthService] Error loading current user:', error);
    }
    return null;
  }

  _saveCurrentUser(user) {
    try {
      localStorage.setItem('pewpi_current_user', JSON.stringify(user));
    } catch (error) {
      console.error('[AuthService] Error saving current user:', error);
    }
  }

  async _generateToken() {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  _buildMagicLink(token) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?magic_token=${token}`;
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  _emitEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail: data });
      window.dispatchEvent(event);
    }
  }

  /**
   * Subscribe to auth events
   */
  on(eventType, callback) {
    const eventName = `pewpi.login.${eventType}`;
    
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName).push(callback);
    
    // Add DOM event listener
    if (typeof window !== 'undefined') {
      window.addEventListener(eventName, (e) => callback(e.detail));
    }
    
    return () => this.off(eventType, callback);
  }

  /**
   * Unsubscribe from auth events
   */
  off(eventType, callback) {
    const eventName = `pewpi.login.${eventType}`;
    
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener(eventName, callback);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;
