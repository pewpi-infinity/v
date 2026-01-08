/**
 * Integration Listener - Cross-repo sync and event broadcasting
 * Enables synchronization across multiple repositories and browser tabs
 */

import { tokenService } from './token-service.js';
import { authService } from './auth-service.js';

class IntegrationListener {
  constructor() {
    this.listeners = [];
    this.enabled = false;
    this.broadcastChannel = null; // Persistent channel
  }

  /**
   * Initialize integration listener
   */
  init() {
    if (this.enabled) {
      console.log('[IntegrationListener] Already initialized');
      return;
    }

    console.log('[IntegrationListener] Initializing cross-repo sync...');

    // Initialize persistent broadcast channel
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('pewpi-sync');
    }

    // Listen for token events
    this.setupTokenListeners();
    
    // Listen for authentication events
    this.setupAuthListeners();
    
    this.enabled = true;
    console.log('[IntegrationListener] Ready for cross-repo synchronization');
  }

  /**
   * Setup token event listeners
   */
  setupTokenListeners() {
    // Token created
    window.addEventListener('pewpi.token.created', (event) => {
      const token = event.detail;
      console.log('[IntegrationListener] Token created:', token);
      
      // Broadcast to other repos/tabs
      this.broadcastToOtherContexts('token.created', token);
      
      // Store in sync log
      this.logSyncEvent('token.created', token);
    });

    // Token updated
    window.addEventListener('pewpi.token.updated', (event) => {
      const token = event.detail;
      console.log('[IntegrationListener] Token updated:', token);
      
      this.broadcastToOtherContexts('token.updated', token);
      this.logSyncEvent('token.updated', token);
    });

    // Token deleted
    window.addEventListener('pewpi.token.deleted', (event) => {
      const data = event.detail;
      console.log('[IntegrationListener] Token deleted:', data);
      
      this.broadcastToOtherContexts('token.deleted', data);
      this.logSyncEvent('token.deleted', data);
    });
  }

  /**
   * Setup authentication event listeners
   */
  setupAuthListeners() {
    // Login state changed
    window.addEventListener('pewpi.login.changed', (event) => {
      const { user, action } = event.detail;
      console.log(`[IntegrationListener] Login ${action}:`, user);
      
      this.broadcastToOtherContexts('login.changed', { user, action });
      this.logSyncEvent('login.changed', { user, action });
    });
  }

  /**
   * Broadcast events to other browser contexts (tabs, windows)
   */
  broadcastToOtherContexts(eventType, data) {
    if (this.broadcastChannel) {
      // Use persistent BroadcastChannel
      this.broadcastChannel.postMessage({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'pewpi-shared'
      });
    } else if (typeof BroadcastChannel !== 'undefined') {
      // Fallback: create temporary channel if persistent one not initialized
      const channel = new BroadcastChannel('pewpi-sync');
      channel.postMessage({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'pewpi-shared'
      });
      channel.close();
    } else {
      // Fallback to localStorage events
      localStorage.setItem('pewpi_sync_event', JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'pewpi-shared'
      }));
    }
  }

  /**
   * Listen for events from other contexts
   */
  listenToOtherContexts(callback) {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('pewpi-sync');
      channel.onmessage = (event) => {
        callback(event.data);
      };
      
      this.listeners.push(() => channel.close());
    } else {
      // Fallback to localStorage events
      const handler = (e) => {
        if (e.key === 'pewpi_sync_event' && e.newValue) {
          callback(JSON.parse(e.newValue));
        }
      };
      
      window.addEventListener('storage', handler);
      this.listeners.push(() => window.removeEventListener('storage', handler));
    }
  }

  /**
   * Log sync events for debugging
   */
  logSyncEvent(eventType, data) {
    const syncLog = this.getSyncLog();
    syncLog.unshift({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events
    if (syncLog.length > 100) {
      syncLog.length = 100;
    }
    
    localStorage.setItem('pewpi_sync_log', JSON.stringify(syncLog));
  }

  /**
   * Get sync log
   */
  getSyncLog() {
    try {
      const log = localStorage.getItem('pewpi_sync_log');
      return log ? JSON.parse(log) : [];
    } catch (error) {
      console.error('[IntegrationListener] Error reading sync log:', error);
      return [];
    }
  }

  /**
   * Clear sync log
   */
  clearSyncLog() {
    localStorage.removeItem('pewpi_sync_log');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    
    // Close persistent broadcast channel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    this.enabled = false;
    console.log('[IntegrationListener] Destroyed');
  }
}

// Export singleton instance
export const integrationListener = new IntegrationListener();

/**
 * Helper function for other repos to import and use
 * 
 * Example usage in other repositories:
 * 
 * import { subscribeToWalletUpdates } from './pewpi-shared/integration-listener.js';
 * 
 * subscribeToWalletUpdates((event) => {
 *   console.log('Received wallet update:', event);
 *   // Update local state accordingly
 * });
 */
export function subscribeToWalletUpdates(callback) {
  integrationListener.listenToOtherContexts((event) => {
    if (event.type.startsWith('token.') || event.type === 'login.changed') {
      callback(event);
    }
  });
}

export default IntegrationListener;
