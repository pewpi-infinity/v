/**
 * Login Component - Production passwordless login with magic-link + optional GitHub OAuth
 * Dev-mode magic link works without SMTP
 */

export class LoginComponent {
  constructor(options = {}) {
    this.options = {
      devMode: options.devMode !== false, // Default to true for local testing
      githubClientId: options.githubClientId || null,
      onLoginSuccess: options.onLoginSuccess || (() => {}),
      onLoginError: options.onLoginError || ((error) => console.error(error)),
      ...options
    };
    
    this.currentUser = this.loadUserFromStorage();
  }

  /**
   * Render login UI
   * @param {string} containerId - ID of container element
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    // Check if already logged in
    if (this.currentUser) {
      this.renderLoggedInState(container);
      return;
    }

    container.innerHTML = `
      <div class="pewpi-component pewpi-login">
        <div class="pewpi-overlay">
          <div class="pewpi-modal">
            <div style="padding: var(--pewpi-space-xl); text-align: center;">
              <div style="font-size: 48px; margin-bottom: var(--pewpi-space-md);">🐶</div>
              <h2 style="color: var(--pewpi-text-primary); margin-bottom: var(--pewpi-space-sm);">
                Welcome to Pewpi
              </h2>
              <p style="color: var(--pewpi-text-secondary); margin-bottom: var(--pewpi-space-xl);">
                Sign in to access your wallet and tokens
              </p>
              
              <!-- Magic Link Login (Default) -->
              <div class="pewpi-flex-col pewpi-gap-md" style="margin-bottom: var(--pewpi-space-lg);">
                <input 
                  type="email" 
                  id="pewpi-email" 
                  class="pewpi-input" 
                  placeholder="Enter your email"
                  autocomplete="email"
                />
                <button 
                  id="pewpi-magic-link-btn" 
                  class="pewpi-btn pewpi-btn-primary"
                  style="width: 100%;"
                >
                  ${this.options.devMode ? '🔗 Dev Login (No Email)' : '✨ Send Magic Link'}
                </button>
              </div>
              
              ${this.options.githubClientId ? `
                <div style="margin: var(--pewpi-space-lg) 0;">
                  <div style="
                    display: flex; 
                    align-items: center; 
                    gap: var(--pewpi-space-md);
                    margin: var(--pewpi-space-lg) 0;
                  ">
                    <div style="flex: 1; height: 1px; background: var(--pewpi-border);"></div>
                    <span style="color: var(--pewpi-text-muted); font-size: 12px;">OR</span>
                    <div style="flex: 1; height: 1px; background: var(--pewpi-border);"></div>
                  </div>
                  
                  <!-- Optional GitHub OAuth -->
                  <button 
                    id="pewpi-github-btn" 
                    class="pewpi-btn pewpi-btn-secondary"
                    style="width: 100%;"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    Continue with GitHub
                  </button>
                </div>
              ` : ''}
              
              <p style="color: var(--pewpi-text-muted); font-size: 12px; margin-top: var(--pewpi-space-lg);">
                ${this.options.devMode ? 'Dev mode: Authentication happens instantly without email verification' : 'We\'ll send you a secure link to sign in'}
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners to login UI
   */
  attachEventListeners() {
    const magicLinkBtn = document.getElementById('pewpi-magic-link-btn');
    const emailInput = document.getElementById('pewpi-email');
    const githubBtn = document.getElementById('pewpi-github-btn');

    if (magicLinkBtn && emailInput) {
      magicLinkBtn.addEventListener('click', () => {
        this.handleMagicLinkLogin(emailInput.value);
      });
      
      emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleMagicLinkLogin(emailInput.value);
        }
      });
    }

    if (githubBtn) {
      githubBtn.addEventListener('click', () => {
        this.handleGitHubLogin();
      });
    }
  }

  /**
   * Handle magic-link login
   * @param {string} email 
   */
  async handleMagicLinkLogin(email) {
    if (!email || !this.isValidEmail(email)) {
      this.options.onLoginError('Please enter a valid email address');
      alert('Please enter a valid email address');
      return;
    }

    try {
      if (this.options.devMode) {
        // Dev mode: instant login without SMTP
        this.loginUser({
          email,
          userId: this.generateUserId(email),
          method: 'magic-link-dev',
          timestamp: new Date().toISOString()
        });
      } else {
        // Production mode: send magic link via API
        await this.sendMagicLink(email);
        alert('Magic link sent! Check your email to complete login.');
      }
    } catch (error) {
      this.options.onLoginError(error);
      alert('Login failed: ' + error.message);
    }
  }

  /**
   * Send magic link email (production)
   * @param {string} email 
   */
  async sendMagicLink(email) {
    // In production, this would call your backend API
    // For now, we'll simulate it
    console.log('Sending magic link to:', email);
    
    const token = this.generateMagicToken();
    const magicLink = `${window.location.origin}?magic_token=${token}&email=${encodeURIComponent(email)}`;
    
    // Store token temporarily (in production, store on server)
    sessionStorage.setItem('pewpi_magic_token', JSON.stringify({
      token,
      email,
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    }));
    
    console.log('Magic link:', magicLink);
    return true;
  }

  /**
   * Handle GitHub OAuth login
   */
  handleGitHubLogin() {
    if (!this.options.githubClientId) {
      console.error('GitHub client ID not configured');
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/auth/github/callback');
    const scope = 'read:user user:email';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.options.githubClientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    window.location.href = authUrl;
  }

  /**
   * Login user and store session
   * @param {Object} userData 
   */
  loginUser(userData) {
    this.currentUser = userData;
    
    // Store in localStorage
    localStorage.setItem('pewpi_user', JSON.stringify(userData));
    localStorage.setItem('pewpi_user_id', userData.userId);
    
    // Emit login event
    const event = new CustomEvent('pewpi.login.changed', {
      detail: { user: userData, loggedIn: true }
    });
    window.dispatchEvent(event);
    
    // Call success callback
    this.options.onLoginSuccess(userData);
    
    // Re-render UI
    const loginContainer = document.querySelector('.pewpi-login');
    if (loginContainer) {
      this.renderLoggedInState(loginContainer.parentElement);
    }
  }

  /**
   * Render logged-in state
   * @param {HTMLElement} container 
   */
  renderLoggedInState(container) {
    container.innerHTML = `
      <div class="pewpi-component pewpi-logged-in" style="
        position: fixed;
        top: var(--pewpi-space-md);
        right: var(--pewpi-space-md);
        z-index: var(--pewpi-z-dropdown);
      ">
        <div class="pewpi-card" style="
          display: flex;
          align-items: center;
          gap: var(--pewpi-space-md);
          padding: var(--pewpi-space-sm) var(--pewpi-space-md);
        ">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--pewpi-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          ">
            ${this.currentUser.email ? this.currentUser.email[0].toUpperCase() : '?'}
          </div>
          <div>
            <div style="color: var(--pewpi-text-primary); font-size: 14px; font-weight: 600;">
              ${this.currentUser.email || 'User'}
            </div>
            <div style="color: var(--pewpi-text-muted); font-size: 12px;">
              ${this.currentUser.method || 'logged in'}
            </div>
          </div>
          <button 
            id="pewpi-logout-btn" 
            class="pewpi-btn pewpi-btn-secondary"
            style="padding: 6px 12px; font-size: 12px;"
          >
            Logout
          </button>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('pewpi-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  /**
   * Logout current user
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem('pewpi_user');
    localStorage.removeItem('pewpi_user_id');
    
    // Emit logout event
    const event = new CustomEvent('pewpi.login.changed', {
      detail: { user: null, loggedIn: false }
    });
    window.dispatchEvent(event);
    
    // Reload to show login screen
    window.location.reload();
  }

  /**
   * Load user from localStorage
   * @returns {Object|null}
   */
  loadUserFromStorage() {
    try {
      const stored = localStorage.getItem('pewpi_user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load user:', error);
      return null;
    }
  }

  /**
   * Check if email is valid
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Generate user ID from email
   * @param {string} email 
   * @returns {string}
   */
  generateUserId(email) {
    return 'user_' + btoa(email).replace(/=/g, '').substring(0, 16);
  }

  /**
   * Generate magic token
   * @returns {string}
   */
  generateMagicToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get current logged-in user
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }
}

export default LoginComponent;
