/**
 * Login Component - Production authentication UI
 * Supports passwordless magic-link and optional GitHub OAuth
 */

import { authService } from '../lib/auth-service.js';

class LoginComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Import theme variables - using relative path */
        @import url('../../lib/theme.css');
        
        :host {
          display: block;
        }
        
        .login-container {
          max-width: 400px;
          margin: 0 auto;
          padding: var(--pewpi-space-2xl);
        }
        
        .login-card {
          background: var(--pewpi-bg-card);
          border: 1px solid var(--pewpi-border-accent);
          border-radius: var(--pewpi-radius-lg);
          padding: var(--pewpi-space-2xl);
          box-shadow: var(--pewpi-shadow-glow);
          backdrop-filter: blur(10px);
        }
        
        .login-header {
          text-align: center;
          margin-bottom: var(--pewpi-space-xl);
        }
        
        .login-title {
          font-size: var(--pewpi-text-3xl);
          color: var(--pewpi-text-primary);
          margin-bottom: var(--pewpi-space-sm);
        }
        
        .login-subtitle {
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-sm);
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--pewpi-space-md);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--pewpi-space-sm);
        }
        
        label {
          color: var(--pewpi-text-secondary);
          font-size: var(--pewpi-text-sm);
          font-weight: 500;
        }
        
        input {
          width: 100%;
          padding: var(--pewpi-space-md);
          background: var(--pewpi-bg-tertiary);
          color: var(--pewpi-text-primary);
          border: 2px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-md);
          font-size: var(--pewpi-text-base);
          transition: border-color var(--pewpi-transition-base);
        }
        
        input:focus {
          outline: none;
          border-color: var(--pewpi-primary);
          box-shadow: var(--pewpi-shadow-glow);
        }
        
        input::placeholder {
          color: var(--pewpi-text-muted);
        }
        
        .button-primary {
          padding: var(--pewpi-space-md) var(--pewpi-space-lg);
          background: var(--pewpi-primary);
          color: var(--pewpi-bg-primary);
          border: none;
          border-radius: var(--pewpi-radius-full);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--pewpi-transition-base);
          font-size: var(--pewpi-text-base);
        }
        
        .button-primary:hover:not(:disabled) {
          background: var(--pewpi-primary-light);
          transform: translateY(-2px);
          box-shadow: var(--pewpi-shadow-glow);
        }
        
        .button-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .button-secondary {
          background: transparent;
          color: var(--pewpi-primary);
          border: 2px solid var(--pewpi-primary);
        }
        
        .button-secondary:hover:not(:disabled) {
          background: var(--pewpi-primary);
          color: var(--pewpi-bg-primary);
        }
        
        .divider {
          text-align: center;
          margin: var(--pewpi-space-lg) 0;
          position: relative;
        }
        
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--pewpi-border);
        }
        
        .divider-text {
          background: var(--pewpi-bg-card);
          padding: 0 var(--pewpi-space-md);
          position: relative;
          color: var(--pewpi-text-tertiary);
          font-size: var(--pewpi-text-sm);
        }
        
        .message {
          padding: var(--pewpi-space-md);
          border-radius: var(--pewpi-radius-md);
          margin-top: var(--pewpi-space-md);
          font-size: var(--pewpi-text-sm);
        }
        
        .message-success {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid var(--pewpi-success);
          color: var(--pewpi-success);
        }
        
        .message-error {
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid var(--pewpi-error);
          color: var(--pewpi-error);
        }
        
        .magic-link-display {
          background: var(--pewpi-bg-tertiary);
          border: 1px solid var(--pewpi-border);
          border-radius: var(--pewpi-radius-md);
          padding: var(--pewpi-space-md);
          margin-top: var(--pewpi-space-md);
          font-family: var(--pewpi-font-mono);
          font-size: var(--pewpi-text-xs);
          word-break: break-all;
        }
        
        .magic-link-display a {
          color: var(--pewpi-primary);
          text-decoration: none;
        }
        
        .magic-link-display a:hover {
          text-decoration: underline;
        }
        
        .hidden {
          display: none;
        }
      </style>
      
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-title">∞ Login</h1>
            <p class="login-subtitle">Secure passwordless authentication</p>
          </div>
          
          <form class="login-form" id="loginForm">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="your@email.com" 
                required 
                autocomplete="email"
              />
            </div>
            
            <button type="submit" class="button-primary" id="submitBtn">
              Send Magic Link
            </button>
          </form>
          
          <div id="message" class="message hidden"></div>
          <div id="magicLinkDisplay" class="magic-link-display hidden"></div>
          
          <div class="divider">
            <span class="divider-text">or</span>
          </div>
          
          <button class="button-primary button-secondary" id="githubBtn">
            Continue with GitHub (Optional)
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const form = this.shadowRoot.getElementById('loginForm');
    const submitBtn = this.shadowRoot.getElementById('submitBtn');
    const githubBtn = this.shadowRoot.getElementById('githubBtn');
    const messageEl = this.shadowRoot.getElementById('message');
    const magicLinkDisplay = this.shadowRoot.getElementById('magicLinkDisplay');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = this.shadowRoot.getElementById('email').value;
      
      // Disable button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      
      try {
        const result = await authService.requestMagicLink(email);
        
        // Show success message
        messageEl.className = 'message message-success';
        messageEl.textContent = result.message;
        messageEl.classList.remove('hidden');
        
        // If dev mode, show the magic link
        if (result.devMode) {
          magicLinkDisplay.innerHTML = `
            <strong>Dev Mode - Magic Link:</strong><br>
            <a href="${result.magicLink}" id="magicLinkAnchor">${result.magicLink}</a><br><br>
            <strong>Token:</strong> ${result.token}<br><br>
            <em>Click the link above or use the token to login</em>
          `;
          magicLinkDisplay.classList.remove('hidden');
          
          // Auto-click for dev convenience
          setTimeout(() => {
            const anchor = this.shadowRoot.getElementById('magicLinkAnchor');
            if (anchor) {
              anchor.click();
            }
          }, 1000);
        }
      } catch (error) {
        messageEl.className = 'message message-error';
        messageEl.textContent = error.message;
        messageEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Magic Link';
      }
    });

    githubBtn.addEventListener('click', async () => {
      try {
        await authService.loginWithGitHub();
      } catch (error) {
        messageEl.className = 'message message-error';
        messageEl.textContent = 'GitHub login not yet configured';
        messageEl.classList.remove('hidden');
      }
    });
  }
}

customElements.define('pewpi-login', LoginComponent);

export default LoginComponent;
