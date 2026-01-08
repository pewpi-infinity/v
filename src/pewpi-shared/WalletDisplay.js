/**
 * WalletDisplay - Simple wallet display component (plain JavaScript)
 * Shows token balance, list, and basic wallet information
 */

import { walletUnified } from './wallet-unified.js';
import { authService } from './auth-service.js';

class WalletDisplay {
  constructor() {
    this.container = null;
    this.updateInterval = null;
  }

  /**
   * Render wallet display in a container
   * @param {string|HTMLElement} containerSelector - CSS selector or DOM element
   */
  async render(containerSelector) {
    // Get container
    if (typeof containerSelector === 'string') {
      this.container = document.querySelector(containerSelector);
    } else {
      this.container = containerSelector;
    }

    if (!this.container) {
      console.error('[WalletDisplay] Container not found');
      return;
    }

    // Check authentication
    if (!authService.isAuthenticated()) {
      this.renderLoginPrompt();
      return;
    }

    // Initialize wallet
    await walletUnified.init();

    // Render wallet UI
    await this.renderWallet();

    // Set up auto-refresh
    this.startAutoRefresh();

    // Listen for token events
    this.setupEventListeners();
  }

  /**
   * Render login prompt
   */
  renderLoginPrompt() {
    this.container.innerHTML = `
      <div style="
        padding: 20px;
        background: #1a1a1a;
        border-radius: 8px;
        text-align: center;
        color: #eaeaea;
      ">
        <h3 style="margin: 0 0 10px 0; color: #00ffcc;">Pewpi Wallet</h3>
        <p>Please login to view your wallet</p>
        <button id="wallet-login-btn" style="
          padding: 10px 20px;
          background: #00ffcc;
          border: none;
          color: #000;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        ">Login</button>
      </div>
    `;

    // Add login button listener
    const loginBtn = this.container.querySelector('#wallet-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        // Import and show login modal
        import('./UnifiedLoginModal.js').then(module => {
          module.unifiedLoginModal.show();
        });
      });
    }
  }

  /**
   * Render wallet UI
   */
  async renderWallet() {
    const summary = await walletUnified.getSummary();

    this.container.innerHTML = `
      <div style="
        padding: 20px;
        background: #1a1a1a;
        border-radius: 8px;
        color: #eaeaea;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #00ffcc;">Pewpi Wallet</h3>
          <button id="wallet-logout-btn" style="
            padding: 6px 12px;
            background: transparent;
            border: 1px solid #666;
            color: #999;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Logout</button>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #0e0e0e; border-radius: 4px;">
          <div style="font-size: 12px; color: #999; margin-bottom: 5px;">User</div>
          <div style="font-size: 14px;">${summary.user}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="padding: 15px; background: #0e0e0e; border-radius: 4px;">
            <div style="font-size: 12px; color: #999; margin-bottom: 5px;">Total Balance</div>
            <div style="font-size: 24px; color: #00ffcc; font-weight: bold;">${summary.totalBalance.toFixed(2)}</div>
          </div>
          
          <div style="padding: 15px; background: #0e0e0e; border-radius: 4px;">
            <div style="font-size: 12px; color: #999; margin-bottom: 5px;">Token Count</div>
            <div style="font-size: 24px; color: #00ffcc; font-weight: bold;">${summary.tokenCount}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <button id="wallet-create-token-btn" style="
            padding: 10px 20px;
            background: #00ffcc;
            border: none;
            color: #000;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
          ">Create Token</button>
        </div>
        
        <div style="margin-bottom: 10px; font-weight: bold; color: #00ffcc;">Your Tokens</div>
        <div id="wallet-token-list">
          ${this.renderTokenList(summary.tokens)}
        </div>
      </div>
    `;

    // Add event listeners
    this.addWalletEventListeners();
  }

  /**
   * Render token list
   */
  renderTokenList(tokens) {
    if (tokens.length === 0) {
      return '<div style="padding: 15px; background: #0e0e0e; border-radius: 4px; text-align: center; color: #999;">No tokens yet</div>';
    }

    return tokens.map(token => `
      <div style="
        padding: 12px;
        background: #0e0e0e;
        border-radius: 4px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="flex: 1;">
          <div style="font-size: 12px; color: #999; margin-bottom: 4px;">
            ${new Date(token.created).toLocaleDateString()}
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #00ffcc;">
            ${token.hash.substring(0, 16)}...
          </div>
        </div>
        <div style="font-size: 16px; font-weight: bold; color: #00ffcc;">
          ${token.balance.toFixed(2)}
        </div>
      </div>
    `).join('');
  }

  /**
   * Add event listeners to wallet buttons
   */
  addWalletEventListeners() {
    const logoutBtn = this.container.querySelector('#wallet-logout-btn');
    const createBtn = this.container.querySelector('#wallet-create-token-btn');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await authService.logout();
        this.stopAutoRefresh();
        this.renderLoginPrompt();
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        await this.handleCreateToken();
      });
    }
  }

  /**
   * Handle create token
   */
  async handleCreateToken() {
    try {
      const randomValue = Math.floor(Math.random() * 100) + 1;
      await walletUnified.createToken({
        value: randomValue,
        balance: randomValue,
        metadata: {
          created_by: 'wallet_ui',
          created_at: new Date().toISOString()
        }
      });

      // Refresh wallet display
      await this.renderWallet();
    } catch (error) {
      console.error('[WalletDisplay] Error creating token:', error);
    }
  }

  /**
   * Setup event listeners for token changes
   */
  setupEventListeners() {
    // Listen for token created
    walletUnified.onTokenCreated(async () => {
      await this.renderWallet();
    });

    // Listen for token updated
    walletUnified.onTokenUpdated(async () => {
      await this.renderWallet();
    });

    // Listen for token deleted
    walletUnified.onTokenDeleted(async () => {
      await this.renderWallet();
    });

    // Listen for login changes
    walletUnified.onLoginChanged(async (event) => {
      if (event.action === 'logout') {
        this.stopAutoRefresh();
        this.renderLoginPrompt();
      } else if (event.action === 'login') {
        await this.renderWallet();
      }
    });
  }

  /**
   * Start auto-refresh of wallet data
   */
  startAutoRefresh(intervalMs = 30000) {
    if (this.updateInterval) {
      return;
    }

    this.updateInterval = setInterval(async () => {
      if (authService.isAuthenticated()) {
        await this.renderWallet();
      }
    }, intervalMs);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Destroy the wallet display
   */
  destroy() {
    this.stopAutoRefresh();
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
}

// Export singleton instance and class
export const walletDisplay = new WalletDisplay();
export default WalletDisplay;
