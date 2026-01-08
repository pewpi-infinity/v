/**
 * Integration Listener - Example module demonstrating cross-repo sync
 * Shows how other repos can subscribe to wallet/login state changes
 */

import { tokenService } from './token-service.js';
import { authService } from './auth-service.js';

class IntegrationListener {
  constructor() {
    this.listeners = [];
    this.enabled = false;
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
    if (typeof BroadcastChannel !== 'undefined') {
      // Use BroadcastChannel API for cross-tab communication
      const channel = new BroadcastChannel('pewpi-sync');
      channel.postMessage({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'v-repo'
      });
      channel.close();
    } else {
      // Fallback to localStorage events
      localStorage.setItem('pewpi_sync_event', JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'v-repo'
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
   * Example: Sync wallet state to external system
   */
  async syncToExternalSystem() {
    const tokens = await tokenService.getAll();
    const user = authService.getCurrentUser();
    
    const syncData = {
      user,
      tokens,
      totalBalance: await tokenService.getTotalBalance(),
      timestamp: new Date().toISOString()
    };
    
    console.log('[IntegrationListener] Sync data prepared:', syncData);
    
    // In a real implementation, this would POST to an API
    // Example:
    // await fetch('/api/sync', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(syncData)
    // });
    
    return syncData;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    this.enabled = false;
    console.log('[IntegrationListener] Destroyed');
  }
}

// Export singleton instance
export const integrationListener = new IntegrationListener();

/**
 * Helper function for other repos to import and use
 * 
 * Example usage in banksy, infinity-brain-search, etc.:
 * 
 * import { subscribeToWalletUpdates } from '@pewpi-infinity/v/src/lib/integration-listener.js';
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
