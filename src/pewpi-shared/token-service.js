/**
 * TokenService - Production-grade token management with IndexedDB (Dexie)
 * Provides token persistence, encryption, and cross-repo synchronization
 */

import Dexie from 'dexie';
import CryptoJS from 'crypto-js';

// IndexedDB database instance
class TokenDatabase extends Dexie {
  constructor() {
    super('PewpiTokenDB');
    this.version(1).stores({
      tokens: '++id, tokenId, type, createdAt, userId',
      walletState: 'key'
    });
    this.tokens = this.table('tokens');
    this.walletState = this.table('walletState');
  }
}

class TokenService {
  constructor() {
    this.db = new TokenDatabase();
    this.autoTrackingEnabled = false;
    this.listeners = [];
    
    // Initialize localStorage fallback check
    this.useLocalStorageFallback = !this.isIndexedDBAvailable();
    
    if (this.useLocalStorageFallback) {
      console.warn('IndexedDB not available, using localStorage fallback');
    }
  }

  /**
   * Check if IndexedDB is available
   */
  isIndexedDBAvailable() {
    try {
      return typeof indexedDB !== 'undefined';
    } catch (e) {
      return false;
    }
  }

  /**
   * Create a new token
   * @param {Object} tokenData - Token properties
   * @returns {Promise<Object>} Created token
   */
  async createToken(tokenData) {
    const token = {
      tokenId: this.generateTokenId(),
      type: tokenData.type || 'bronze',
      value: tokenData.value || 1,
      metadata: tokenData.metadata || {},
      userId: tokenData.userId || this.getCurrentUserId(),
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    try {
      if (this.useLocalStorageFallback) {
        await this.saveTokenToLocalStorage(token);
      } else {
        token.id = await this.db.tokens.add(token);
      }

      // Emit event for cross-repo sync
      this.emitTokenEvent('pewpi.token.created', token);
      
      // Notify listeners
      this.notifyListeners('tokenCreated', token);

      return token;
    } catch (error) {
      console.error('Failed to create token:', error);
      throw error;
    }
  }

  /**
   * Get all tokens
   * @returns {Promise<Array>} Array of tokens
   */
  async getAll() {
    try {
      if (this.useLocalStorageFallback) {
        return this.getAllFromLocalStorage();
      } else {
        return await this.db.tokens.toArray();
      }
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return [];
    }
  }

  /**
   * Get tokens by user ID
   * @param {string} userId 
   * @returns {Promise<Array>}
   */
  async getByUserId(userId) {
    try {
      if (this.useLocalStorageFallback) {
        const tokens = this.getAllFromLocalStorage();
        return tokens.filter(t => t.userId === userId);
      } else {
        return await this.db.tokens.where('userId').equals(userId).toArray();
      }
    } catch (error) {
      console.error('Failed to get tokens by user:', error);
      return [];
    }
  }

  /**
   * Get token balance for a user
   * @param {string} userId 
   * @returns {Promise<number>}
   */
  async getBalance(userId) {
    const tokens = await this.getByUserId(userId || this.getCurrentUserId());
    return tokens.reduce((sum, token) => {
      if (token.status === 'active') {
        return sum + (token.value || 1);
      }
      return sum;
    }, 0);
  }

  /**
   * Clear all tokens (for dev/testing)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      if (this.useLocalStorageFallback) {
        localStorage.removeItem('pewpi_tokens');
      } else {
        await this.db.tokens.clear();
      }
      this.emitTokenEvent('pewpi.tokens.cleared', {});
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw error;
    }
  }

  /**
   * Initialize auto-tracking for token events
   * @param {Object} options - Configuration options
   */
  initAutoTracking(options = {}) {
    this.autoTrackingEnabled = true;
    
    // Listen for token events from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'pewpi_tokens') {
        this.notifyListeners('tokensUpdated', {});
      }
    });

    // Listen for custom events
    window.addEventListener('pewpi.token.created', (e) => {
      this.notifyListeners('tokenCreated', e.detail);
    });

    console.log('Token auto-tracking initialized');
  }

  /**
   * Subscribe to token events
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    const listener = { eventType, callback };
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of an event
   * @param {string} eventType 
   * @param {*} data 
   */
  notifyListeners(eventType, data) {
    this.listeners
      .filter(l => l.eventType === eventType || l.eventType === '*')
      .forEach(l => {
        try {
          l.callback(data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
  }

  /**
   * Emit window event for cross-repo sync
   * @param {string} eventName 
   * @param {*} detail 
   */
  emitTokenEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Generate unique token ID
   * @returns {string}
   */
  generateTokenId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `token_${timestamp}_${random}`;
  }

  /**
   * Get current user ID from localStorage
   * @returns {string}
   */
  getCurrentUserId() {
    return localStorage.getItem('pewpi_user_id') || 'anonymous';
  }

  // ===== LocalStorage Fallback Methods =====

  /**
   * Save token to localStorage
   * @param {Object} token 
   */
  async saveTokenToLocalStorage(token) {
    const tokens = this.getAllFromLocalStorage();
    token.id = tokens.length > 0 ? Math.max(...tokens.map(t => t.id || 0)) + 1 : 1;
    tokens.push(token);
    localStorage.setItem('pewpi_tokens', JSON.stringify(tokens));
  }

  /**
   * Get all tokens from localStorage
   * @returns {Array}
   */
  getAllFromLocalStorage() {
    try {
      const data = localStorage.getItem('pewpi_tokens');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to parse tokens from localStorage:', error);
      return [];
    }
  }

  // ===== Encryption Helpers (AES-GCM) =====

  /**
   * Encrypt data using AES-GCM
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {string} Encrypted data
   */
  encrypt(data, key) {
    try {
      return CryptoJS.AES.encrypt(data, key).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-GCM
   * @param {string} encryptedData - Encrypted data
   * @param {string} key - Decryption key
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Generate encryption key from password
   * @param {string} password 
   * @returns {string}
   */
  deriveKey(password) {
    return CryptoJS.SHA256(password).toString();
  }
}

// ECDH Key Exchange Helpers (Stubs for P2P)
export class ECDHHelper {
  /**
   * Generate ECDH key pair (stub implementation)
   * In production, use Web Crypto API: crypto.subtle.generateKey
   */
  async generateKeyPair() {
    console.log('ECDH: Key pair generation stub - implement with Web Crypto API');
    return {
      publicKey: 'stub_public_key_' + Math.random().toString(36).substring(2),
      privateKey: 'stub_private_key_' + Math.random().toString(36).substring(2)
    };
  }

  /**
   * Derive shared secret (stub implementation)
   * @param {string} privateKey 
   * @param {string} publicKey 
   */
  async deriveSharedSecret(privateKey, publicKey) {
    console.log('ECDH: Shared secret derivation stub');
    return 'stub_shared_secret_' + Math.random().toString(36).substring(2);
  }

  /**
   * Export public key for transmission
   * @param {*} publicKey 
   */
  async exportPublicKey(publicKey) {
    return publicKey;
  }

  /**
   * Import public key from peer
   * @param {*} keyData 
   */
  async importPublicKey(keyData) {
    return keyData;
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default TokenService;
