/**
 * UnifiedLoginModal - Simple login modal component (plain JavaScript)
 * Can be used as-is or as reference for framework implementations
 */

import { authService } from './auth-service.js';

class UnifiedLoginModal {
  constructor() {
    this.modal = null;
    this.isVisible = false;
  }

  /**
   * Create and show the login modal
   */
  show() {
    if (this.isVisible) {
      return;
    }

    this.modal = this.createModal();
    document.body.appendChild(this.modal);
    this.isVisible = true;

    // Check for magic token in URL
    this.checkMagicToken();
  }

  /**
   * Hide and remove the modal
   */
  hide() {
    if (!this.isVisible || !this.modal) {
      return;
    }

    this.modal.remove();
    this.modal = null;
    this.isVisible = false;
  }

  /**
   * Create the modal DOM structure
   */
  createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'pewpi-login-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #1a1a1a;
      color: #eaeaea;
      padding: 30px;
      border-radius: 8px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    modal.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #00ffcc;">Login to Pewpi Wallet</h2>
      
      <div id="login-form">
        <label style="display: block; margin-bottom: 8px;">
          Email Address
        </label>
        <input 
          type="email" 
          id="pewpi-email-input" 
          placeholder="your@email.com"
          style="
            width: 100%;
            padding: 10px;
            background: #0e0e0e;
            border: 1px solid #333;
            color: #eaeaea;
            border-radius: 4px;
            margin-bottom: 15px;
            box-sizing: border-box;
          "
        />
        
        <button 
          id="pewpi-login-btn"
          style="
            width: 100%;
            padding: 12px;
            background: #00ffcc;
            border: none;
            color: #000;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          Send Magic Link
        </button>
        
        <div id="pewpi-login-message" style="
          margin-top: 15px;
          padding: 10px;
          border-radius: 4px;
          display: none;
        "></div>
      </div>
      
      <button 
        id="pewpi-close-modal"
        style="
          margin-top: 20px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #666;
          color: #999;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        Close
      </button>
    `;

    overlay.appendChild(modal);

    // Add event listeners
    const emailInput = modal.querySelector('#pewpi-email-input');
    const loginBtn = modal.querySelector('#pewpi-login-btn');
    const closeBtn = modal.querySelector('#pewpi-close-modal');
    const messageDiv = modal.querySelector('#pewpi-login-message');

    loginBtn.addEventListener('click', async () => {
      await this.handleLogin(emailInput, messageDiv);
    });

    emailInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await this.handleLogin(emailInput, messageDiv);
      }
    });

    closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    return overlay;
  }

  /**
   * Handle login request
   */
  async handleLogin(emailInput, messageDiv) {
    const email = emailInput.value.trim();

    if (!email) {
      this.showMessage(messageDiv, 'Please enter your email address', 'error');
      return;
    }

    try {
      messageDiv.style.display = 'block';
      this.showMessage(messageDiv, 'Sending magic link...', 'info');

      const result = await authService.requestMagicLink(email);

      if (result.success && result.magicLink) {
        // Dev mode - show link
        this.showMessage(
          messageDiv,
          `<strong>Dev Mode:</strong> Click to login: <br><a href="${result.magicLink}" style="color: #00ffcc; word-break: break-all;">${result.magicLink}</a>`,
          'success'
        );
      } else {
        this.showMessage(messageDiv, result.message, 'success');
      }
    } catch (error) {
      this.showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
  }

  /**
   * Show message in the modal
   */
  showMessage(messageDiv, message, type) {
    messageDiv.style.display = 'block';
    messageDiv.innerHTML = message;

    if (type === 'error') {
      messageDiv.style.background = '#ff4444';
      messageDiv.style.color = '#fff';
    } else if (type === 'success') {
      messageDiv.style.background = '#00ffcc';
      messageDiv.style.color = '#000';
    } else {
      messageDiv.style.background = '#333';
      messageDiv.style.color = '#eaeaea';
    }
  }

  /**
   * Check for magic token in URL and auto-login
   */
  async checkMagicToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('magic_token');

    if (token) {
      try {
        const user = await authService.verifyMagicLink(token);
        
        // Show success and close modal
        const messageDiv = this.modal.querySelector('#pewpi-login-message');
        this.showMessage(messageDiv, `Welcome, ${user.email}!`, 'success');
        
        setTimeout(() => {
          this.hide();
          
          // Clean up URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }, 2000);
      } catch (error) {
        const messageDiv = this.modal.querySelector('#pewpi-login-message');
        this.showMessage(messageDiv, `Login failed: ${error.message}`, 'error');
      }
    }
  }
}

// Export singleton instance and class
export const unifiedLoginModal = new UnifiedLoginModal();
export default UnifiedLoginModal;
