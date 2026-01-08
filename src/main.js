/**
 * Main Application - Integrates login, wallet, and token sync
 */

import { tokenService } from './lib/token-service.js';
import { authService } from './lib/auth-service.js';
import { integrationListener } from './lib/integration-listener.js';
import './components/Login.js';
import './components/Wallet.js';

class PewpiApp {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) {
      console.log('[PewpiApp] Already initialized');
      return;
    }

    console.log('[PewpiApp] Initializing...');

    // Initialize TokenService
    await tokenService.initDatabase();
    tokenService.initAutoTracking();

    // Initialize pewpi-shared services (optional, backward-compatible)
    try {
      const { tokenService: sharedTokenService } = await import('./pewpi-shared/token-service.js');
      const { authService: sharedAuthService } = await import('./pewpi-shared/auth/auth-service.js');
      
      console.log('[PewpiApp] Initializing pewpi-shared services...');
      
      // Initialize shared token service auto-tracking
      if (sharedTokenService && typeof sharedTokenService.initAutoTracking === 'function') {
        sharedTokenService.initAutoTracking();
      }
      
      // Restore session for shared auth service
      if (sharedAuthService && typeof sharedAuthService.restoreSession === 'function') {
        await sharedAuthService.restoreSession();
      }
      
      console.log('[PewpiApp] pewpi-shared services initialized successfully');
    } catch (error) {
      console.log('[PewpiApp] pewpi-shared services not available or failed to initialize:', error.message);
      // Continue with existing services
    }

    // Initialize integration listener for cross-repo sync
    integrationListener.init();

    // Check for magic link token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magic_token');
    
    if (magicToken) {
      await this.handleMagicLinkLogin(magicToken);
    }

    // Check authentication state
    const user = authService.getCurrentUser();
    
    if (user) {
      this.showWallet();
    } else {
      this.showLogin();
    }

    // Subscribe to login changes
    authService.subscribe('pewpi.login.changed', ({ user, action }) => {
      if (action === 'login') {
        this.showWallet();
      } else if (action === 'logout') {
        this.showLogin();
      }
    });

    this.initialized = true;
    console.log('[PewpiApp] Ready');
  }

  /**
   * Handle magic link login
   */
  async handleMagicLinkLogin(token) {
    try {
      const user = await authService.verifyMagicLink(token);
      console.log('[PewpiApp] Magic link login successful:', user);
      
      // Remove token from URL
      const url = new URL(window.location);
      url.searchParams.delete('magic_token');
      window.history.replaceState({}, document.title, url);
      
      // Show success message
      this.showToast('Login successful!', 'success');
    } catch (error) {
      console.error('[PewpiApp] Magic link login failed:', error);
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Show login view
   */
  showLogin() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;
    
    appContainer.innerHTML = '<pewpi-login></pewpi-login>';
    
    // Add logout from any existing session
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
  }

  /**
   * Show wallet view
   */
  showWallet() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;
    
    const user = authService.getCurrentUser();
    
    appContainer.innerHTML = `
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="color: var(--pewpi-text-secondary);">
            Logged in as: <strong>${user.email}</strong>
          </div>
          <button id="logoutBtn" class="pewpi-button">Logout</button>
        </div>
        <pewpi-wallet></pewpi-wallet>
      </div>
    `;
    
    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await authService.logout();
      });
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'pewpi-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--pewpi-bg-card);
      border: 1px solid ${type === 'success' ? 'var(--pewpi-success)' : 'var(--pewpi-error)'};
      border-radius: 8px;
      padding: 16px 24px;
      color: var(--pewpi-text-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideUp 300ms ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize app when DOM is ready
const app = new PewpiApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for external use
window.PewpiApp = app;
export default app;
