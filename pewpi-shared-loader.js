/**
 * Pewpi-Shared Loader
 * Dynamically imports and initializes pewpi-shared services
 * Safe initialization with error handling
 */

(async function() {
  try {
    console.log('[Pewpi-Shared] Initializing...');
    
    // Check if Dexie is available
    if (typeof window.Dexie === 'undefined') {
      console.warn('[Pewpi-Shared] Dexie not loaded, services will use localStorage fallback');
    }
    
    // Import services with error handling
    let tokenService, authService, integrationListener;
    
    try {
      const tokenModule = await import('./src/pewpi-shared/token-service.js');
      tokenService = tokenModule.tokenService;
    } catch (error) {
      console.error('[Pewpi-Shared] Failed to load token-service:', error);
      return;
    }
    
    try {
      const authModule = await import('./src/pewpi-shared/auth-service.js');
      authService = authModule.authService;
    } catch (error) {
      console.error('[Pewpi-Shared] Failed to load auth-service:', error);
      return;
    }
    
    try {
      const integrationModule = await import('./src/pewpi-shared/integration-listener.js');
      integrationListener = integrationModule.integrationListener;
    } catch (error) {
      console.error('[Pewpi-Shared] Failed to load integration-listener:', error);
      return;
    }
    
    // Initialize services safely
    try {
      // Initialize token tracking
      await tokenService.initAutoTracking();
      console.log('[Pewpi-Shared] ✓ Token service initialized');
    } catch (error) {
      console.error('[Pewpi-Shared] Token service initialization failed:', error);
    }
    
    try {
      // Restore authentication session
      const session = await authService.restoreSession();
      if (session) {
        console.log('[Pewpi-Shared] ✓ Session restored for:', session.email);
      } else {
        console.log('[Pewpi-Shared] ✓ Auth service initialized (no existing session)');
      }
    } catch (error) {
      console.error('[Pewpi-Shared] Session restoration failed:', error);
    }
    
    try {
      // Initialize cross-repo sync
      integrationListener.init();
      console.log('[Pewpi-Shared] ✓ Integration listener initialized');
    } catch (error) {
      console.error('[Pewpi-Shared] Integration listener initialization failed:', error);
    }
    
    // Make services globally available
    window.pewpiShared = {
      tokenService,
      authService,
      integrationListener,
      version: '1.0.0'
    };
    
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('pewpi.shared.ready', {
      detail: {
        version: '1.0.0',
        services: ['tokenService', 'authService', 'integrationListener']
      }
    }));
    
    console.log('[Pewpi-Shared] ✓ Ready! Services available at window.pewpiShared');
    
  } catch (error) {
    console.error('[Pewpi-Shared] Critical initialization error:', error);
  }
})();
