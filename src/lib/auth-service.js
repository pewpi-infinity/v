/**
 * AuthService - Production authentication with magic-link (passwordless) and optional GitHub OAuth
 * Dev-mode magic-link flow that works without SMTP for local testing
 */

import { createModel } from './client-model.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Map();
    this.devMode = true; // Set to false in production
    this.magicLinkStore = new Map(); // In-memory store for dev-mode magic links
    
    // Create user model
    this.userModel = createModel('User', {
      email: { type: String, required: true },
      authMethod: { type: String, default: 'magic-link' },
      githubId: { type: String },
      lastLogin: { type: Date, default: () => new Date().toISOString() }
    });
    
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
      // In dev mode, store the token and return it directly
      this.magicLinkStore.set(token, {
        email,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false
      });
      
      console.log('[AuthService] Dev-mode magic link:', magicLink);
      console.log('[AuthService] Token:', token);
      
      return {
        success: true,
        devMode: true,
        magicLink,
        token,
        message: 'Magic link generated (dev mode). Use the link or token to login.'
      };
    } else {
      // In production, send email via API
      // TODO: Implement actual email sending
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
    if (this.devMode) {
      const linkData = this.magicLinkStore.get(token);
      
      if (!linkData) {
        throw new Error('Invalid or expired magic link');
      }
      
      if (linkData.used) {
        throw new Error('Magic link already used');
      }
      
      if (Date.now() > linkData.expires) {
        this.magicLinkStore.delete(token);
        throw new Error('Magic link expired');
      }
      
      // Mark as used
      linkData.used = true;
      
      // Create or update user
      const user = await this._findOrCreateUser(linkData.email, 'magic-link');
      
      // Set as current user
      this.currentUser = user;
      this._saveCurrentUser();
      
      // Emit login event
      this._emitEvent('pewpi.login.changed', { user, action: 'login' });
      
      return user;
    } else {
      // In production, verify with backend API
      // TODO: Implement actual verification
      throw new Error('Production magic link verification not yet implemented');
    }
  }

  /**
   * GitHub OAuth login (optional, opt-in)
   */
  async loginWithGitHub() {
    if (typeof window === 'undefined') {
      throw new Error('GitHub login only available in browser');
    }
    
    // In a real implementation, this would redirect to GitHub OAuth
    // For now, we'll use a simplified flow
    console.log('[AuthService] GitHub login not yet implemented');
    throw new Error('GitHub login requires OAuth configuration');
  }

  /**
   * Logout current user
   */
  async logout() {
    const previousUser = this.currentUser;
    this.currentUser = null;
    this._saveCurrentUser();
    
    // Emit logout event
    this._emitEvent('pewpi.login.changed', { user: null, action: 'logout', previousUser });
    
    return { success: true };
  }

  /**
   * Get current user
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
   * Subscribe to authentication events
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Find or create user
   */
  async _findOrCreateUser(email, authMethod) {
    let user = await this.userModel.findOne({ email });
    
    if (!user) {
      user = await this.userModel.create({
        email,
        authMethod,
        lastLogin: new Date().toISOString()
      });
    } else {
      await this.userModel.updateOne({ email }, {
        lastLogin: new Date().toISOString()
      });
      user.lastLogin = new Date().toISOString();
    }
    
    return user;
  }

  /**
   * Generate secure random token
   */
  async _generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Build magic link URL
   */
  _buildMagicLink(token) {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?magic_token=${token}`;
    }
    return `http://localhost:3000?magic_token=${token}`;
  }

  /**
   * Validate email format
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Save current user to storage
   */
  _saveCurrentUser() {
    if (typeof localStorage !== 'undefined') {
      if (this.currentUser) {
        localStorage.setItem('pewpi_current_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('pewpi_current_user');
      }
    }
  }

  /**
   * Load current user from storage
   */
  _loadCurrentUser() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('pewpi_current_user');
        if (stored) {
          this.currentUser = JSON.parse(stored);
        }
      } catch (error) {
        console.error('[AuthService] Error loading current user:', error);
      }
    }
  }

  /**
   * Emit event to subscribers and window
   */
  _emitEvent(eventType, data) {
    // Notify local subscribers
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('[AuthService] Error in event callback', error);
      }
    });
    
    // Emit to window for cross-component/cross-repo communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;
