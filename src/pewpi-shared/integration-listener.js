/**
 * Integration Listener Module
 * Demonstrates how other repos can subscribe to wallet/login state changes
 * 
 * Usage in other repos:
 * 
 * import { IntegrationListener } from './pewpi-shared/integration-listener.js';
 * 
 * const listener = new IntegrationListener({
 *   onTokenCreated: (token) => {
 *     console.log('New token:', token);
 *     // Update your app state
 *   },
 *   onLoginChanged: (loginData) => {
 *     console.log('Login changed:', loginData);
 *     // Update your app state
 *   }
 * });
 * 
 * listener.start();
 */

export class IntegrationListener {
  constructor(options = {}) {
    this.options = {
      onTokenCreated: options.onTokenCreated || ((token) => console.log('Token created:', token)),
      onTokensCleared: options.onTokensCleared || (() => console.log('Tokens cleared')),
      onLoginChanged: options.onLoginChanged || ((data) => console.log('Login changed:', data)),
      onP2PMessage: options.onP2PMessage || ((data) => console.log('P2P message:', data)),
      debug: options.debug !== false,
      ...options
    };
    
    this.listeners = [];
    this.isRunning = false;
  }

  /**
   * Start listening to events
   */
  start() {
    if (this.isRunning) {
      console.warn('[IntegrationListener] Already running');
      return;
    }
    
    this.isRunning = true;
    
    // Listen for token created events
    const tokenCreatedListener = (event) => {
      if (this.options.debug) {
        console.log('[IntegrationListener] Token created event:', event.detail);
      }
      this.options.onTokenCreated(event.detail);
    };
    window.addEventListener('pewpi.token.created', tokenCreatedListener);
    this.listeners.push({ event: 'pewpi.token.created', handler: tokenCreatedListener });
    
    // Listen for tokens cleared events
    const tokensClearedListener = (event) => {
      if (this.options.debug) {
        console.log('[IntegrationListener] Tokens cleared event');
      }
      this.options.onTokensCleared(event.detail);
    };
    window.addEventListener('pewpi.tokens.cleared', tokensClearedListener);
    this.listeners.push({ event: 'pewpi.tokens.cleared', handler: tokensClearedListener });
    
    // Listen for login changed events
    const loginChangedListener = (event) => {
      if (this.options.debug) {
        console.log('[IntegrationListener] Login changed event:', event.detail);
      }
      this.options.onLoginChanged(event.detail);
    };
    window.addEventListener('pewpi.login.changed', loginChangedListener);
    this.listeners.push({ event: 'pewpi.login.changed', handler: loginChangedListener });
    
    // Listen for P2P messages (if P2P is enabled)
    const p2pMessageListener = (event) => {
      if (this.options.debug) {
        console.log('[IntegrationListener] P2P message:', event.detail);
      }
      this.options.onP2PMessage(event.detail);
    };
    window.addEventListener('pewpi.p2p.message', p2pMessageListener);
    this.listeners.push({ event: 'pewpi.p2p.message', handler: p2pMessageListener });
    
    if (this.options.debug) {
      console.log('[IntegrationListener] Started listening to pewpi events');
    }
  }

  /**
   * Stop listening to events
   */
  stop() {
    if (!this.isRunning) {
      console.warn('[IntegrationListener] Not running');
      return;
    }
    
    this.isRunning = false;
    
    // Remove all listeners
    this.listeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    
    this.listeners = [];
    
    if (this.options.debug) {
      console.log('[IntegrationListener] Stopped listening to pewpi events');
    }
  }

  /**
   * Check if listener is running
   * @returns {boolean}
   */
  isActive() {
    return this.isRunning;
  }
}

/**
 * Helper function to quickly set up integration listener
 * @param {Object} callbacks 
 * @returns {IntegrationListener}
 */
export function setupIntegration(callbacks) {
  const listener = new IntegrationListener(callbacks);
  listener.start();
  return listener;
}

/**
 * Example integration for other repos
 */
export function exampleIntegration() {
  console.log('=== Example Integration ===');
  console.log('This demonstrates how other repos can integrate with pewpi token/wallet system');
  
  const listener = setupIntegration({
    onTokenCreated: (token) => {
      console.log('✨ New token detected:', {
        id: token.tokenId,
        type: token.type,
        value: token.value,
        user: token.userId
      });
      
      // Example: Update your repo's state
      // updateLocalTokenCache(token);
      // refreshUI();
      // notifyUser(`New ${token.type} token created!`);
    },
    
    onTokensCleared: () => {
      console.log('🗑️ All tokens cleared');
      
      // Example: Clear your repo's token cache
      // clearLocalTokenCache();
      // refreshUI();
    },
    
    onLoginChanged: (data) => {
      console.log('👤 Login state changed:', {
        loggedIn: data.loggedIn,
        user: data.user
      });
      
      // Example: Update your repo's auth state
      // if (data.loggedIn) {
      //   setCurrentUser(data.user);
      //   loadUserData(data.user.userId);
      // } else {
      //   clearCurrentUser();
      //   clearUserData();
      // }
    },
    
    onP2PMessage: (data) => {
      console.log('🔄 P2P sync message:', data);
      
      // Example: Handle P2P sync
      // if (data.type === 'token-sync') {
      //   syncRemoteToken(data.token);
      // } else if (data.type === 'login-sync') {
      //   syncRemoteLogin(data.loginData);
      // }
    },
    
    debug: true
  });
  
  return listener;
}

export default IntegrationListener;
