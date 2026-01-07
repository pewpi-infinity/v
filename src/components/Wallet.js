/**
 * Wallet Component - Production wallet UI with balance, token list, and live feed
 */

import { tokenService } from '../lib/token-service.js';
import { authService } from '../lib/auth-service.js';

class WalletComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tokens = [];
    this.totalBalance = 0;
    this.feedItems = [];
  }

  connectedCallback() {
    this.render();
    this.loadData();
    this.setupEventListeners();
    this.subscribeToEvents();
  }

  disconnectedCallback() {
    // Clean up subscriptions
    if (this.unsubscribeToken) this.unsubscribeToken();
    if (this.unsubscribeTokenUpdate) this.unsubscribeTokenUpdate();
  }

  async loadData() {
    try {
      this.tokens = await tokenService.getAll();
      this.totalBalance = await tokenService.getTotalBalance();
      this.updateDisplay();
    } catch (error) {
      console.error('[Wallet] Error loading data:', error);
    }
  }

  subscribeToEvents() {
    // Subscribe to token creation events
    this.unsubscribeToken = tokenService.subscribe('pewpi.token.created', (token) => {
      this.tokens.push(token);
      this.totalBalance += token.balance || 0;
      this.addFeedItem('created', token);
      this.updateDisplay();
    });

    // Subscribe to token update events
    this.unsubscribeTokenUpdate = tokenService.subscribe('pewpi.token.updated', (token) => {
      const index = this.tokens.findIndex(t => t.token_hash === token.token_hash);
      if (index !== -1) {
        this.tokens[index] = token;
        this.addFeedItem('updated', token);
        this.updateDisplay();
      }
    });
  }

  addFeedItem(action, token) {
    const item = {
      action,
      token,
      timestamp: new Date().toISOString()
    };
    
    this.feedItems.unshift(item);
    
    // Keep only last 50 items
    if (this.feedItems.length > 50) {
      this.feedItems = this.feedItems.slice(0, 50);
    }
    
    this.updateFeed();
  }

  updateDisplay() {
    const balanceEl = this.shadowRoot.getElementById('totalBalance');
    const tokenCountEl = this.shadowRoot.getElementById('tokenCount');
    const tokenListEl = this.shadowRoot.getElementById('tokenList');
    
    if (balanceEl) {
      balanceEl.textContent = this.totalBalance.toFixed(2);
    }
    
    if (tokenCountEl) {
      tokenCountEl.textContent = this.tokens.length;
    }
    
    if (tokenListEl) {
      this.renderTokenList();
    }
  }

  updateFeed() {
    const feedEl = this.shadowRoot.getElementById('feedList');
    if (feedEl) {
      this.renderFeed();
    }
  }

  renderTokenList() {
    const tokenListEl = this.shadowRoot.getElementById('tokenList');
    
    if (this.tokens.length === 0) {
      tokenListEl.innerHTML = `
        <div class="empty-state">
          <p>No tokens yet. Create your first token to get started!</p>
        </div>
      `;
      return;
    }
    
    tokenListEl.innerHTML = this.tokens.map(token => `
      <div class="token-item" data-hash="${token.token_hash}">
        <div class="token-header">
          <div class="token-hash-short">${token.token_hash.substring(0, 8)}...</div>
          <div class="token-balance">${(token.balance || 0).toFixed(2)} ∞</div>
        </div>
        <div class="token-details">
          <div class="token-meta">
            <span class="token-date">${new Date(token.created_at).toLocaleString()}</span>
          </div>
          <button class="view-details-btn" data-hash="${token.token_hash}">View Details</button>
        </div>
      </div>
    `).join('');
    
    // Attach click listeners to view details buttons
    tokenListEl.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const hash = e.target.dataset.hash;
        this.showTokenDetails(hash);
      });
    });
  }

  renderFeed() {
    const feedEl = this.shadowRoot.getElementById('feedList');
    
    if (this.feedItems.length === 0) {
      feedEl.innerHTML = `
        <div class="empty-state">
          <p>No recent activity</p>
        </div>
      `;
      return;
    }
    
    feedEl.innerHTML = this.feedItems.map(item => {
      const actionText = item.action === 'created' ? 'Created' : 'Updated';
      const actionClass = item.action === 'created' ? 'feed-created' : 'feed-updated';
      const time = new Date(item.timestamp).toLocaleTimeString();
      
      return `
        <div class="feed-item ${actionClass}">
          <div class="feed-indicator"></div>
          <div class="feed-content">
            <div class="feed-action">${actionText} token</div>
            <div class="feed-hash">${item.token.token_hash.substring(0, 16)}...</div>
            <div class="feed-time">${time}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  showTokenDetails(hash) {
    const token = this.tokens.find(t => t.token_hash === hash);
    if (!token) return;
    
    const modal = this.shadowRoot.getElementById('tokenModal');
    const modalContent = this.shadowRoot.getElementById('modalContent');
    
    modalContent.innerHTML = `
      <h3>Token Details</h3>
      <div class="detail-row">
        <label>Token Hash:</label>
        <span class="detail-value mono">${token.token_hash}</span>
      </div>
      <div class="detail-row">
        <label>Balance:</label>
        <span class="detail-value">${(token.balance || 0).toFixed(2)} ∞</span>
      </div>
      <div class="detail-row">
        <label>Created:</label>
        <span class="detail-value">${new Date(token.created_at).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <label>Value:</label>
        <span class="detail-value">${token.value || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <label>Sources:</label>
        <span class="detail-value">${token.source_count_actual || 0} / ${token.source_count_requested || 0}</span>
      </div>
      <button class="button-primary" id="closeModal">Close</button>
    `;
    
    modal.classList.remove('hidden');
    
    // Close button
    this.shadowRoot.getElementById('closeModal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  setupEventListeners() {
    const createBtn = this.shadowRoot.getElementById('createTokenBtn');
    const modal = this.shadowRoot.getElementById('tokenModal');
    
    createBtn?.addEventListener('click', async () => {
      await this.createSampleToken();
    });
    
    // Close modal on background click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  async createSampleToken() {
    try {
      const token = await tokenService.createToken({
        value: `Sample token ${Date.now()}`,
        balance: Math.random() * 100
      });
      
      console.log('[Wallet] Created token:', token);
    } catch (error) {
      console.error('[Wallet] Error creating token:', error);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Import theme variables - using relative path */
        @import url('../../lib/theme.css');
        
        :host {
          display: block;
        }
        
        .wallet-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--pewpi-space-lg);
        }
        
        .wallet-header {
          text-align: center;
          margin-bottom: var(--pewpi-space-2xl);
        }
        
        .wallet-title {
          font-size: var(--pewpi-text-4xl);
          color: var(--pewpi-text-primary);
          margin-bottom: var(--pewpi-space-sm);
        }
        
        .wallet-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--pewpi-space-lg);
          margin-bottom: var(--pewpi-space-2xl);
        }
        
        .stat-card {
          background: var(--pewpi-bg-card);
          border: 1px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-lg);
          padding: var(--pewpi-space-xl);
          box-shadow: var(--pewpi-shadow-md);
          backdrop-filter: blur(10px);
        }
        
        .stat-card.accent {
          border-color: var(--pewpi-primary);
          box-shadow: var(--pewpi-shadow-glow);
        }
        
        .stat-label {
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-sm);
          margin-bottom: var(--pewpi-space-sm);
        }
        
        .stat-value {
          font-size: var(--pewpi-text-4xl);
          color: var(--pewpi-primary);
          font-weight: 700;
        }
        
        .wallet-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--pewpi-space-lg);
        }
        
        @media (max-width: 768px) {
          .wallet-content {
            grid-template-columns: 1fr;
          }
        }
        
        .section {
          background: var(--pewpi-bg-card);
          border: 1px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-lg);
          padding: var(--pewpi-space-xl);
          box-shadow: var(--pewpi-shadow-md);
          backdrop-filter: blur(10px);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--pewpi-space-lg);
        }
        
        .section-title {
          font-size: var(--pewpi-text-xl);
          color: var(--pewpi-text-primary);
        }
        
        .button-primary {
          padding: var(--pewpi-space-sm) var(--pewpi-space-md);
          background: var(--pewpi-primary);
          color: var(--pewpi-bg-primary);
          border: none;
          border-radius: var(--pewpi-radius-full);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--pewpi-transition-base);
          font-size: var(--pewpi-text-sm);
        }
        
        .button-primary:hover {
          background: var(--pewpi-primary-light);
          transform: translateY(-2px);
          box-shadow: var(--pewpi-shadow-glow);
        }
        
        .token-list {
          display: flex;
          flex-direction: column;
          gap: var(--pewpi-space-md);
          max-height: 500px;
          overflow-y: auto;
        }
        
        .token-item {
          background: var(--pewpi-bg-tertiary);
          border: 1px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-md);
          padding: var(--pewpi-space-md);
          transition: all var(--pewpi-transition-base);
        }
        
        .token-item:hover {
          border-color: var(--pewpi-primary);
          box-shadow: var(--pewpi-shadow-glow);
        }
        
        .token-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--pewpi-space-sm);
        }
        
        .token-hash-short {
          font-family: var(--pewpi-font-mono);
          color: var(--pewpi-primary);
          font-size: var(--pewpi-text-base);
        }
        
        .token-balance {
          font-size: var(--pewpi-text-lg);
          color: var(--pewpi-text-primary);
          font-weight: 600;
        }
        
        .token-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .token-meta {
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-xs);
        }
        
        .view-details-btn {
          padding: var(--pewpi-space-xs) var(--pewpi-space-sm);
          background: transparent;
          color: var(--pewpi-primary);
          border: 1px solid var(--pewpi-primary);
          border-radius: var(--pewpi-radius-sm);
          cursor: pointer;
          font-size: var(--pewpi-text-xs);
          transition: all var(--pewpi-transition-fast);
        }
        
        .view-details-btn:hover {
          background: var(--pewpi-primary);
          color: var(--pewpi-bg-primary);
        }
        
        .feed-list {
          display: flex;
          flex-direction: column;
          gap: var(--pewpi-space-sm);
          max-height: 500px;
          overflow-y: auto;
        }
        
        .feed-item {
          display: flex;
          gap: var(--pewpi-space-sm);
          padding: var(--pewpi-space-sm);
          background: var(--pewpi-bg-tertiary);
          border-radius: var(--pewpi-radius-sm);
          border-left: 3px solid transparent;
          transition: all var(--pewpi-transition-fast);
        }
        
        .feed-item:hover {
          background: var(--pewpi-bg-secondary);
        }
        
        .feed-created {
          border-left-color: var(--pewpi-success);
        }
        
        .feed-updated {
          border-left-color: var(--pewpi-info);
        }
        
        .feed-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--pewpi-primary);
          margin-top: 6px;
          flex-shrink: 0;
        }
        
        .feed-content {
          flex: 1;
        }
        
        .feed-action {
          color: var(--pewpi-text-primary);
          font-size: var(--pewpi-text-sm);
          font-weight: 600;
        }
        
        .feed-hash {
          font-family: var(--pewpi-font-mono);
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-xs);
        }
        
        .feed-time {
          color: var(--pewpi-text-muted);
          font-size: var(--pewpi-text-xs);
        }
        
        .empty-state {
          text-align: center;
          padding: var(--pewpi-space-2xl);
          color: var(--pewpi-text-tertiary);
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--pewpi-bg-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--pewpi-z-modal);
          backdrop-filter: blur(5px);
        }
        
        .modal-content {
          background: var(--pewpi-bg-secondary);
          border: 1px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-lg);
          padding: var(--pewpi-space-2xl);
          max-width: 600px;
          width: 90%;
          box-shadow: var(--pewpi-shadow-lg);
        }
        
        .modal h3 {
          color: var(--pewpi-text-primary);
          margin-bottom: var(--pewpi-space-lg);
        }
        
        .detail-row {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: var(--pewpi-space-md);
          margin-bottom: var(--pewpi-space-md);
          padding-bottom: var(--pewpi-space-md);
          border-bottom: 1px solid var(--pewpi-border);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-row label {
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-sm);
        }
        
        .detail-value {
          color: var(--pewpi-text-primary);
          font-size: var(--pewpi-text-sm);
          word-break: break-all;
        }
        
        .detail-value.mono {
          font-family: var(--pewpi-font-mono);
          font-size: var(--pewpi-text-xs);
        }
        
        .hidden {
          display: none;
        }
        
        /* Scrollbar styling */
        .token-list::-webkit-scrollbar,
        .feed-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .token-list::-webkit-scrollbar-track,
        .feed-list::-webkit-scrollbar-track {
          background: var(--pewpi-bg-tertiary);
        }
        
        .token-list::-webkit-scrollbar-thumb,
        .feed-list::-webkit-scrollbar-thumb {
          background: var(--pewpi-border);
          border-radius: var(--pewpi-radius-sm);
        }
        
        .token-list::-webkit-scrollbar-thumb:hover,
        .feed-list::-webkit-scrollbar-thumb:hover {
          background: var(--pewpi-primary);
        }
      </style>
      
      <div class="wallet-container">
        <div class="wallet-header">
          <h1 class="wallet-title">∞ Wallet</h1>
        </div>
        
        <div class="wallet-stats">
          <div class="stat-card accent">
            <div class="stat-label">Total Balance</div>
            <div class="stat-value" id="totalBalance">0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Tokens</div>
            <div class="stat-value" id="tokenCount">0</div>
          </div>
        </div>
        
        <div class="wallet-content">
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">Token List</h2>
              <button class="button-primary" id="createTokenBtn">+ Create Token</button>
            </div>
            <div class="token-list" id="tokenList">
              <div class="empty-state">
                <p>Loading tokens...</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">Live Feed</h2>
            </div>
            <div class="feed-list" id="feedList">
              <div class="empty-state">
                <p>No recent activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal hidden" id="tokenModal">
        <div class="modal-content" id="modalContent">
        </div>
      </div>
    `;
  }
}

customElements.define('pewpi-wallet', WalletComponent);

export default WalletComponent;
