/**
 * TokenService - Production-grade token management with IndexedDB (Dexie) backend
 * Provides localStorage fallback and cross-repo sync capabilities
 */

// Dexie will be loaded from CDN and available globally
const Dexie = typeof window !== 'undefined' ? window.Dexie : null;

class TokenService {
  constructor() {
    this.db = null;
    this.useLocalStorage = false;
    this.listeners = new Map();
    this.autoTrackingEnabled = false;
    
    this.initDatabase();
  }

  /**
   * Initialize Dexie database with localStorage fallback
   */
  async initDatabase() {
    // Check if Dexie is available
    if (!Dexie) {
      console.warn('[TokenService] Dexie not available, using localStorage');
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
    } catch (error) {
      console.warn('[TokenService] IndexedDB failed, falling back to localStorage', error);
      this.useLocalStorage = true;
    }
  }

  /**
   * Create a new token
   */
  async createToken(tokenData) {
    const token = {
      token_hash: tokenData.token_hash || await this._generateHash(tokenData.value || ''),
      value: tokenData.value || '',
      created_at: tokenData.created_at || new Date().toISOString(),
      balance: tokenData.balance || 0,
      source_count_requested: tokenData.source_count_requested || 0,
      source_count_actual: tokenData.source_count_actual || 0,
      snippets: tokenData.snippets || [],
      links: tokenData.links || [],
      metadata: tokenData.metadata || {}
    };

    if (this.useLocalStorage) {
      return this._createTokenLocalStorage(token);
    } else {
      const id = await this.db.tokens.add(token);
      token.id = id;
      
      // Emit token creation event
      this._emitEvent('pewpi.token.created', token);
      
      return token;
    }
  }

  /**
   * Get all tokens
   */
  async getAll() {
    if (this.useLocalStorage) {
      return this._getAllLocalStorage();
    } else {
      return await this.db.tokens.toArray();
    }
  }

  /**
   * Get token by hash
   */
  async getByHash(tokenHash) {
    if (this.useLocalStorage) {
      return this._getByHashLocalStorage(tokenHash);
    } else {
      return await this.db.tokens.where('token_hash').equals(tokenHash).first();
    }
  }

  /**
   * Update token
   */
  async updateToken(tokenHash, updates) {
    if (this.useLocalStorage) {
      return this._updateTokenLocalStorage(tokenHash, updates);
    } else {
      await this.db.tokens.where('token_hash').equals(tokenHash).modify(updates);
      const updated = await this.getByHash(tokenHash);
      
      // Emit token update event
      this._emitEvent('pewpi.token.updated', updated);
      
      return updated;
    }
  }

  /**
   * Delete token
   */
  async deleteToken(tokenHash) {
    if (this.useLocalStorage) {
      return this._deleteTokenLocalStorage(tokenHash);
    } else {
      await this.db.tokens.where('token_hash').equals(tokenHash).delete();
      
      // Emit token deletion event
      this._emitEvent('pewpi.token.deleted', { token_hash: tokenHash });
    }
  }

  /**
   * Clear all tokens
   */
  async clearAll() {
    if (this.useLocalStorage) {
      return this._clearAllLocalStorage();
    } else {
      await this.db.tokens.clear();
      
      // Emit clear event
      this._emitEvent('pewpi.tokens.cleared', {});
    }
  }

  /**
   * Get total balance
   */
  async getTotalBalance() {
    const tokens = await this.getAll();
    return tokens.reduce((sum, token) => sum + (token.balance || 0), 0);
  }

  /**
   * Initialize auto-tracking for token creation
   */
  initAutoTracking() {
    if (this.autoTrackingEnabled) return;
    
    this.autoTrackingEnabled = true;
    
    // Listen for window events from other components
    if (typeof window !== 'undefined') {
      window.addEventListener('pewpi.token.create.request', async (event) => {
        const tokenData = event.detail;
        await this.createToken(tokenData);
      });
    }
    
    console.log('[TokenService] Auto-tracking enabled');
  }

  /**
   * Subscribe to token events
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
   * Emit event to subscribers and window
   */
  _emitEvent(eventType, data) {
    // Notify local subscribers
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('[TokenService] Error in event callback', error);
      }
    });
    
    // Emit to window for cross-component/cross-repo communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
  }

  /**
   * Generate SHA-256 hash
   */
  async _generateHash(message) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for Node.js
      const crypto = await import('crypto');
      return crypto.createHash('sha256').update(message).digest('hex');
    }
  }

  // LocalStorage fallback methods
  _getLocalStorageKey() {
    return 'pewpi_tokens';
  }

  _createTokenLocalStorage(token) {
    const tokens = this._getAllLocalStorage();
    token.id = Date.now();
    tokens.push(token);
    localStorage.setItem(this._getLocalStorageKey(), JSON.stringify(tokens));
    
    this._emitEvent('pewpi.token.created', token);
    return token;
  }

  _getAllLocalStorage() {
    try {
      const data = localStorage.getItem(this._getLocalStorageKey());
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[TokenService] Error reading from localStorage', error);
      return [];
    }
  }

  _getByHashLocalStorage(tokenHash) {
    const tokens = this._getAllLocalStorage();
    return tokens.find(t => t.token_hash === tokenHash);
  }

  _updateTokenLocalStorage(tokenHash, updates) {
    const tokens = this._getAllLocalStorage();
    const index = tokens.findIndex(t => t.token_hash === tokenHash);
    if (index !== -1) {
      tokens[index] = { ...tokens[index], ...updates };
      localStorage.setItem(this._getLocalStorageKey(), JSON.stringify(tokens));
      
      this._emitEvent('pewpi.token.updated', tokens[index]);
      return tokens[index];
    }
    return null;
  }

  _deleteTokenLocalStorage(tokenHash) {
    const tokens = this._getAllLocalStorage();
    const filtered = tokens.filter(t => t.token_hash !== tokenHash);
    localStorage.setItem(this._getLocalStorageKey(), JSON.stringify(filtered));
    
    this._emitEvent('pewpi.token.deleted', { token_hash: tokenHash });
  }

  _clearAllLocalStorage() {
    localStorage.removeItem(this._getLocalStorageKey());
    
    this._emitEvent('pewpi.tokens.cleared', {});
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default TokenService;
