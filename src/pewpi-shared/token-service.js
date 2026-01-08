/**
 * TokenService - Production-grade token management with IndexedDB (Dexie) backend
 * Provides localStorage fallback and event emission for cross-repo sync
 * 
 * Events emitted:
 * - pewpi.token.created
 * - pewpi.token.updated
 * - pewpi.token.deleted
 */

// Dexie will be loaded from CDN or npm and available globally
const Dexie = typeof window !== 'undefined' ? window.Dexie : null;

class TokenService {
  constructor() {
    this.db = null;
    this.useLocalStorage = false;
    this.listeners = new Map();
    this.autoTrackingEnabled = false;
    this.initPromise = null;
    
    // Start initialization but don't wait
    this.initPromise = this.initDatabase();
  }

  /**
   * Ensure database is initialized before operations
   */
  async _ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  /**
   * Initialize Dexie database with localStorage fallback
   */
  async initDatabase() {
    // Check if Dexie is available
    if (!Dexie) {
      console.warn('[TokenService] Dexie not available, using localStorage fallback');
      this.useLocalStorage = true;
      return;
    }
    
    try {
      this.db = new Dexie('PewpiTokenDB');
      
      this.db.version(1).stores({
        tokens: '++id, token_hash, created_at, value, balance',
        metadata: 'key, value'
      });

      await this.db.open();
      
      console.log('[TokenService] IndexedDB initialized successfully');
      this.useLocalStorage = false;
    } catch (error) {
      console.warn('[TokenService] IndexedDB initialization failed, using localStorage:', error);
      this.useLocalStorage = true;
      this.db = null;
    }
  }

  /**
   * Initialize auto-tracking for token events
   * Safe to call multiple times
   */
  async initAutoTracking() {
    await this._ensureInitialized();
    
    if (this.autoTrackingEnabled) {
      console.log('[TokenService] Auto-tracking already enabled');
      return;
    }
    
    console.log('[TokenService] Enabling auto-tracking for token events');
    this.autoTrackingEnabled = true;
    
    // Auto-tracking is handled by event emission in CRUD operations
    return true;
  }

  /**
   * Create a new token
   */
  async createToken(tokenData) {
    await this._ensureInitialized();
    
    const token = {
      token_hash: tokenData.token_hash || this._generateHash(),
      value: tokenData.value || 0,
      balance: tokenData.balance || tokenData.value || 0,
      metadata: tokenData.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (this.useLocalStorage) {
        const tokens = this._getTokensFromLocalStorage();
        token.id = tokens.length > 0 ? Math.max(...tokens.map(t => t.id || 0)) + 1 : 1;
        tokens.push(token);
        this._saveTokensToLocalStorage(tokens);
      } else {
        token.id = await this.db.tokens.add(token);
      }

      // Emit event
      this._emitEvent('pewpi.token.created', token);
      
      console.log('[TokenService] Token created:', token.token_hash);
      return token;
    } catch (error) {
      console.error('[TokenService] Error creating token:', error);
      throw error;
    }
  }

  /**
   * Get all tokens
   */
  async getAll() {
    await this._ensureInitialized();
    
    try {
      if (this.useLocalStorage) {
        return this._getTokensFromLocalStorage();
      } else {
        return await this.db.tokens.toArray();
      }
    } catch (error) {
      console.error('[TokenService] Error getting tokens:', error);
      return [];
    }
  }

  /**
   * Get token by hash
   */
  async getByHash(tokenHash) {
    await this._ensureInitialized();
    
    try {
      if (this.useLocalStorage) {
        const tokens = this._getTokensFromLocalStorage();
        return tokens.find(t => t.token_hash === tokenHash);
      } else {
        return await this.db.tokens.where('token_hash').equals(tokenHash).first();
      }
    } catch (error) {
      console.error('[TokenService] Error getting token by hash:', error);
      return null;
    }
  }

  /**
   * Update token
   */
  async updateToken(tokenHash, updates) {
    await this._ensureInitialized();
    
    try {
      const token = await this.getByHash(tokenHash);
      if (!token) {
        throw new Error('Token not found');
      }

      const updatedToken = {
        ...token,
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (this.useLocalStorage) {
        const tokens = this._getTokensFromLocalStorage();
        const index = tokens.findIndex(t => t.token_hash === tokenHash);
        if (index !== -1) {
          tokens[index] = updatedToken;
          this._saveTokensToLocalStorage(tokens);
        }
      } else {
        // Use put instead of modify to properly update the record
        await this.db.tokens.put(updatedToken);
      }

      // Emit event
      this._emitEvent('pewpi.token.updated', updatedToken);
      
      console.log('[TokenService] Token updated:', tokenHash);
      return updatedToken;
    } catch (error) {
      console.error('[TokenService] Error updating token:', error);
      throw error;
    }
  }

  /**
   * Delete token
   */
  async deleteToken(tokenHash) {
    await this._ensureInitialized();
    
    try {
      if (this.useLocalStorage) {
        const tokens = this._getTokensFromLocalStorage();
        const filtered = tokens.filter(t => t.token_hash !== tokenHash);
        this._saveTokensToLocalStorage(filtered);
      } else {
        await this.db.tokens.where('token_hash').equals(tokenHash).delete();
      }

      // Emit event
      this._emitEvent('pewpi.token.deleted', { token_hash: tokenHash });
      
      console.log('[TokenService] Token deleted:', tokenHash);
      return true;
    } catch (error) {
      console.error('[TokenService] Error deleting token:', error);
      throw error;
    }
  }

  /**
   * Get total balance
   */
  async getTotalBalance() {
    await this._ensureInitialized();
    
    const tokens = await this.getAll();
    return tokens.reduce((sum, token) => sum + (token.balance || 0), 0);
  }

  /**
   * Clear all tokens (for testing)
   */
  async clearAll() {
    await this._ensureInitialized();
    
    try {
      if (this.useLocalStorage) {
        this._saveTokensToLocalStorage([]);
      } else {
        await this.db.tokens.clear();
      }
      
      console.log('[TokenService] All tokens cleared');
      return true;
    } catch (error) {
      console.error('[TokenService] Error clearing tokens:', error);
      throw error;
    }
  }

  /**
   * LocalStorage helpers
   */
  _getTokensFromLocalStorage() {
    try {
      const data = localStorage.getItem('pewpi_tokens');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[TokenService] Error reading from localStorage:', error);
      return [];
    }
  }

  _saveTokensToLocalStorage(tokens) {
    try {
      localStorage.setItem('pewpi_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('[TokenService] Error saving to localStorage:', error);
    }
  }

  /**
   * Generate a random hash for tokens
   */
  _generateHash() {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('Web Crypto API not available. Secure random number generation is required for token creation.');
    }
    
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail: data });
      window.dispatchEvent(event);
    }
  }

  /**
   * Subscribe to token events
   */
  on(eventType, callback) {
    const eventName = `pewpi.token.${eventType}`;
    
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    // Create wrapper function and store it for proper cleanup
    const wrapper = (e) => callback(e.detail);
    this.listeners.get(eventName).push({ callback, wrapper });
    
    // Add DOM event listener with wrapper
    if (typeof window !== 'undefined') {
      window.addEventListener(eventName, wrapper);
    }
    
    return () => this.off(eventType, callback);
  }

  /**
   * Unsubscribe from token events
   */
  off(eventType, callback) {
    const eventName = `pewpi.token.${eventType}`;
    
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.findIndex(item => item.callback === callback);
      if (index > -1) {
        const { wrapper } = callbacks[index];
        callbacks.splice(index, 1);
        
        // Remove DOM event listener with the correct wrapper
        if (typeof window !== 'undefined') {
          window.removeEventListener(eventName, wrapper);
        }
      }
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default TokenService;
