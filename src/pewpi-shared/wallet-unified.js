/**
 * WalletUnified - Unified wallet management
 * Combines token management with authentication for complete wallet functionality
 */

import { tokenService } from './token-service.js';
import { authService } from './auth-service.js';

class WalletUnified {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize wallet (requires authentication)
   */
  async init() {
    if (this.initialized) {
      console.log('[WalletUnified] Already initialized');
      return;
    }

    // Ensure user is authenticated
    if (!authService.isAuthenticated()) {
      console.warn('[WalletUnified] User not authenticated');
      return false;
    }

    // Initialize token service
    await tokenService.initAutoTracking();
    
    this.initialized = true;
    console.log('[WalletUnified] Wallet initialized for user:', authService.getCurrentUser()?.email);
    
    return true;
  }

  /**
   * Get wallet summary
   */
  async getSummary() {
    if (!this.initialized) {
      await this.init();
    }

    const tokens = await tokenService.getAll();
    const totalBalance = await tokenService.getTotalBalance();
    const user = authService.getCurrentUser();

    return {
      user: user?.email,
      tokenCount: tokens.length,
      totalBalance,
      tokens: tokens.map(t => ({
        hash: t.token_hash,
        balance: t.balance,
        created: t.created_at
      }))
    };
  }

  /**
   * Get all tokens for current user
   */
  async getTokens() {
    if (!this.initialized) {
      await this.init();
    }

    return await tokenService.getAll();
  }

  /**
   * Create a new token
   */
  async createToken(tokenData) {
    if (!this.initialized) {
      await this.init();
    }

    if (!authService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    return await tokenService.createToken(tokenData);
  }

  /**
   * Update token
   */
  async updateToken(tokenHash, updates) {
    if (!this.initialized) {
      await this.init();
    }

    if (!authService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    return await tokenService.updateToken(tokenHash, updates);
  }

  /**
   * Delete token
   */
  async deleteToken(tokenHash) {
    if (!this.initialized) {
      await this.init();
    }

    if (!authService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    return await tokenService.deleteToken(tokenHash);
  }

  /**
   * Get total balance
   */
  async getTotalBalance() {
    if (!this.initialized) {
      await this.init();
    }

    return await tokenService.getTotalBalance();
  }

  /**
   * Clear all tokens (for testing)
   */
  async clearAll() {
    if (!this.initialized) {
      await this.init();
    }

    if (!authService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    return await tokenService.clearAll();
  }

  /**
   * Subscribe to wallet events
   */
  onTokenCreated(callback) {
    return tokenService.on('created', callback);
  }

  onTokenUpdated(callback) {
    return tokenService.on('updated', callback);
  }

  onTokenDeleted(callback) {
    return tokenService.on('deleted', callback);
  }

  onLoginChanged(callback) {
    return authService.on('changed', callback);
  }
}

// Export singleton instance
export const walletUnified = new WalletUnified();
export default WalletUnified;
