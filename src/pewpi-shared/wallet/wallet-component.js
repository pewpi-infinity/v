/**
 * Wallet Component - Production wallet UI with balance, token list, and live feed
 */

import { tokenService } from '../token-service.js';

export class WalletComponent {
  constructor(options = {}) {
    this.options = {
      userId: options.userId || null,
      onTokenClick: options.onTokenClick || (() => {}),
      ...options
    };
    
    this.tokens = [];
    this.balance = 0;
    this.selectedToken = null;
    
    // Subscribe to token events
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for real-time updates
   */
  setupEventListeners() {
    // Listen for token creation events
    window.addEventListener('pewpi.token.created', (e) => {
      console.log('Token created event:', e.detail);
      this.refresh();
    });
    
    // Listen for login changes
    window.addEventListener('pewpi.login.changed', (e) => {
      console.log('Login changed event:', e.detail);
      if (e.detail.user) {
        this.options.userId = e.detail.user.userId;
        this.refresh();
      }
    });
    
    // Subscribe to tokenService updates
    tokenService.subscribe('tokenCreated', (token) => {
      console.log('TokenService: Token created:', token);
      this.refresh();
    });
  }

  /**
   * Render wallet UI
   * @param {string} containerId 
   */
  async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    // Load data
    await this.loadData();

    container.innerHTML = `
      <div class="pewpi-component pewpi-wallet">
        <div class="pewpi-card" style="max-width: 800px; margin: 0 auto;">
          <!-- Wallet Header -->
          <div style="margin-bottom: var(--pewpi-space-lg);">
            <h2 style="color: var(--pewpi-text-primary); margin-bottom: var(--pewpi-space-sm); display: flex; align-items: center; gap: var(--pewpi-space-sm);">
              💼 My Wallet
              <button id="pewpi-refresh-btn" class="pewpi-btn pewpi-btn-secondary" style="margin-left: auto; padding: 6px 12px; font-size: 12px;">
                🔄 Refresh
              </button>
            </h2>
            <div style="
              background: linear-gradient(135deg, var(--pewpi-primary) 0%, var(--pewpi-secondary) 100%);
              padding: var(--pewpi-space-xl);
              border-radius: var(--pewpi-radius-md);
              margin-bottom: var(--pewpi-space-lg);
            ">
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: var(--pewpi-space-sm);">
                Total Balance
              </div>
              <div style="color: white; font-size: 48px; font-weight: bold;">
                ${this.balance} <span style="font-size: 24px; opacity: 0.8;">tokens</span>
              </div>
            </div>
          </div>

          <!-- Token Actions -->
          <div style="margin-bottom: var(--pewpi-space-lg); display: flex; gap: var(--pewpi-space-md);">
            <button id="pewpi-create-token-btn" class="pewpi-btn pewpi-btn-primary">
              ➕ Create Token
            </button>
            <button id="pewpi-clear-tokens-btn" class="pewpi-btn pewpi-btn-secondary">
              🗑️ Clear All (Dev)
            </button>
          </div>

          <!-- Token List -->
          <div style="margin-bottom: var(--pewpi-space-lg);">
            <h3 style="color: var(--pewpi-text-primary); margin-bottom: var(--pewpi-space-md);">
              Token List (${this.tokens.length})
            </h3>
            <div id="pewpi-token-list" class="pewpi-flex-col pewpi-gap-sm">
              ${this.tokens.length === 0 ? `
                <div style="
                  text-align: center;
                  padding: var(--pewpi-space-xl);
                  color: var(--pewpi-text-muted);
                ">
                  No tokens yet. Create your first token!
                </div>
              ` : this.tokens.map(token => this.renderTokenCard(token)).join('')}
            </div>
          </div>

          <!-- Live Token Feed -->
          <div>
            <h3 style="color: var(--pewpi-text-primary); margin-bottom: var(--pewpi-space-md);">
              🔴 Live Token Feed
            </h3>
            <div id="pewpi-token-feed" style="
              max-height: 300px;
              overflow-y: auto;
              background: var(--pewpi-bg-dark);
              border-radius: var(--pewpi-radius-md);
              padding: var(--pewpi-space-md);
            ">
              <div style="color: var(--pewpi-text-muted); font-size: 12px;">
                Waiting for token events...
              </div>
            </div>
          </div>
        </div>

        <!-- Token Detail Modal -->
        <div id="pewpi-token-detail-modal" class="pewpi-hidden"></div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render individual token card
   * @param {Object} token 
   * @returns {string}
   */
  renderTokenCard(token) {
    const typeColors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2'
    };
    
    const color = typeColors[token.type] || typeColors.bronze;
    
    return `
      <div class="pewpi-token-card" data-token-id="${token.tokenId}" style="
        background: var(--pewpi-bg-card);
        border: 1px solid var(--pewpi-border);
        border-radius: var(--pewpi-radius-md);
        padding: var(--pewpi-space-md);
        cursor: pointer;
        transition: all var(--pewpi-transition);
        display: flex;
        align-items: center;
        gap: var(--pewpi-space-md);
      ">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        ">
          🪙
        </div>
        <div style="flex: 1;">
          <div style="color: var(--pewpi-text-primary); font-weight: 600; margin-bottom: 4px;">
            ${token.type.charAt(0).toUpperCase() + token.type.slice(1)} Token
          </div>
          <div style="color: var(--pewpi-text-muted); font-size: 12px;">
            Value: ${token.value} • Created: ${new Date(token.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div>
          <span class="pewpi-badge pewpi-badge-success">
            ${token.status}
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Load wallet data
   */
  async loadData() {
    try {
      const userId = this.options.userId || tokenService.getCurrentUserId();
      this.tokens = await tokenService.getByUserId(userId);
      this.balance = await tokenService.getBalance(userId);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  }

  /**
   * Refresh wallet data and UI
   */
  async refresh() {
    await this.loadData();
    
    // Update balance
    const balanceEl = document.querySelector('.pewpi-wallet [style*="font-size: 48px"]');
    if (balanceEl) {
      balanceEl.innerHTML = `${this.balance} <span style="font-size: 24px; opacity: 0.8;">tokens</span>`;
    }
    
    // Update token count
    const countEl = document.querySelector('.pewpi-wallet h3');
    if (countEl && countEl.textContent.includes('Token List')) {
      countEl.textContent = `Token List (${this.tokens.length})`;
    }
    
    // Update token list
    const listEl = document.getElementById('pewpi-token-list');
    if (listEl) {
      if (this.tokens.length === 0) {
        listEl.innerHTML = `
          <div style="
            text-align: center;
            padding: var(--pewpi-space-xl);
            color: var(--pewpi-text-muted);
          ">
            No tokens yet. Create your first token!
          </div>
        `;
      } else {
        listEl.innerHTML = this.tokens.map(token => this.renderTokenCard(token)).join('');
        this.attachTokenCardListeners();
      }
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('pewpi-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }
    
    // Create token button
    const createBtn = document.getElementById('pewpi-create-token-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateTokenDialog());
    }
    
    // Clear tokens button
    const clearBtn = document.getElementById('pewpi-clear-tokens-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllTokens());
    }
    
    // Token card click handlers
    this.attachTokenCardListeners();
  }

  /**
   * Attach listeners to token cards
   */
  attachTokenCardListeners() {
    const cards = document.querySelectorAll('.pewpi-token-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const tokenId = card.dataset.tokenId;
        const token = this.tokens.find(t => t.tokenId === tokenId);
        if (token) {
          this.showTokenDetail(token);
        }
      });
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = 'var(--pewpi-shadow-md)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
    });
  }

  /**
   * Show create token dialog
   */
  async showCreateTokenDialog() {
    const type = prompt('Token type (bronze/silver/gold/platinum):', 'bronze');
    if (!type) return;
    
    const value = parseInt(prompt('Token value:', '1'));
    if (isNaN(value)) return;
    
    try {
      const token = await tokenService.createToken({
        type,
        value,
        userId: this.options.userId || tokenService.getCurrentUserId()
      });
      
      this.addToFeed(`✨ Created ${type} token (value: ${value})`);
      await this.refresh();
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('Failed to create token: ' + error.message);
    }
  }

  /**
   * Clear all tokens (dev mode)
   */
  async clearAllTokens() {
    if (!confirm('Are you sure you want to clear all tokens? This cannot be undone.')) {
      return;
    }
    
    try {
      await tokenService.clearAll();
      this.addToFeed('🗑️ All tokens cleared');
      await this.refresh();
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      alert('Failed to clear tokens: ' + error.message);
    }
  }

  /**
   * Show token detail modal
   * @param {Object} token 
   */
  showTokenDetail(token) {
    const modal = document.getElementById('pewpi-token-detail-modal');
    if (!modal) return;
    
    modal.className = 'pewpi-overlay';
    modal.innerHTML = `
      <div class="pewpi-modal" style="padding: var(--pewpi-space-xl);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--pewpi-space-lg);">
          <h2 style="color: var(--pewpi-text-primary); margin: 0;">Token Details</h2>
          <button id="pewpi-close-modal" style="
            background: none;
            border: none;
            color: var(--pewpi-text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
          ">×</button>
        </div>
        
        <div class="pewpi-flex-col pewpi-gap-md">
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">Token ID</div>
            <div style="color: var(--pewpi-text-primary); font-family: monospace; font-size: 14px;">${token.tokenId}</div>
          </div>
          
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">Type</div>
            <div style="color: var(--pewpi-text-primary);">${token.type}</div>
          </div>
          
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">Value</div>
            <div style="color: var(--pewpi-text-primary);">${token.value}</div>
          </div>
          
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">Status</div>
            <div><span class="pewpi-badge pewpi-badge-success">${token.status}</span></div>
          </div>
          
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">Created</div>
            <div style="color: var(--pewpi-text-primary);">${new Date(token.createdAt).toLocaleString()}</div>
          </div>
          
          <div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px; margin-bottom: 4px;">User ID</div>
            <div style="color: var(--pewpi-text-primary); font-family: monospace; font-size: 14px;">${token.userId}</div>
          </div>
        </div>
      </div>
    `;
    
    const closeBtn = document.getElementById('pewpi-close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.className = 'pewpi-hidden';
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.className = 'pewpi-hidden';
      }
    });
  }

  /**
   * Add message to live feed
   * @param {string} message 
   */
  addToFeed(message) {
    const feed = document.getElementById('pewpi-token-feed');
    if (!feed) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.cssText = `
      color: var(--pewpi-text-primary);
      font-size: 12px;
      padding: var(--pewpi-space-sm);
      border-bottom: 1px solid var(--pewpi-border);
      animation: fadeIn 0.3s ease-in;
    `;
    entry.innerHTML = `<span style="color: var(--pewpi-text-muted);">[${timestamp}]</span> ${message}`;
    
    // Remove placeholder if exists
    if (feed.textContent.includes('Waiting for')) {
      feed.innerHTML = '';
    }
    
    feed.insertBefore(entry, feed.firstChild);
    
    // Limit to 50 entries
    while (feed.children.length > 50) {
      feed.removeChild(feed.lastChild);
    }
  }
}

export default WalletComponent;
