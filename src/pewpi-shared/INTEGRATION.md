# Integration Guide

This guide explains how to integrate the pewpi token/wallet system into other repositories (banksy, v, infinity-brain-searc, repo-dashboard-hub, etc.).

## Overview

The pewpi shared token/wallet system provides:
- **TokenService**: Token management with IndexedDB (Dexie) + localStorage fallback
- **LoginComponent**: Passwordless login (magic-link) + optional GitHub OAuth
- **WalletComponent**: Wallet UI with balance, token list, and live feed
- **P2PSyncManager**: Optional WebRTC-based peer-to-peer synchronization
- **IntegrationListener**: Event-based integration for cross-repo state sync

## Quick Start

### 1. Copy Shared Library

Copy the `src/shared` directory to your repository:

```bash
# From your repository root
cp -r /path/to/GPT-Vector-Design/src/shared ./src/pewpi-shared
```

Or install as a git submodule:

```bash
git submodule add https://github.com/pewpi-infinity/GPT-Vector-Design.git pewpi-shared
cd pewpi-shared
git sparse-checkout init --cone
git sparse-checkout set src/shared
```

### 2. Install Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "dexie": "^3.2.4",
    "crypto-js": "^4.2.0"
  }
}
```

Then run:

```bash
npm install
```

### 3. Import Components

In your HTML:

```html
<!-- Theme CSS -->
<link rel="stylesheet" href="./src/pewpi-shared/theme.css">

<!-- Your app -->
<div id="login-container"></div>
<div id="wallet-container"></div>
```

In your JavaScript:

```javascript
import { LoginComponent } from './src/pewpi-shared/auth/login-component.js';
import { WalletComponent } from './src/pewpi-shared/wallet/wallet-component.js';
import { tokenService } from './src/pewpi-shared/token-service.js';
import { setupIntegration } from './src/pewpi-shared/integration-listener.js';

// Initialize login
const login = new LoginComponent({
  devMode: true, // Set to false in production
  onLoginSuccess: (user) => {
    console.log('User logged in:', user);
    initializeWallet(user.userId);
  }
});
login.render('login-container');

// Initialize wallet
function initializeWallet(userId) {
  const wallet = new WalletComponent({ userId });
  wallet.render('wallet-container');
}

// Setup integration listener
const listener = setupIntegration({
  onTokenCreated: (token) => {
    console.log('New token:', token);
    // Update your app state
  },
  onLoginChanged: (data) => {
    console.log('Login changed:', data);
    // Update your app state
  }
});
```

## Integration Examples

### Example 1: banksy Repository

```javascript
// banksy/src/main.js
import { tokenService } from './pewpi-shared/token-service.js';
import { setupIntegration } from './pewpi-shared/integration-listener.js';

// Initialize TokenService auto-tracking
tokenService.initAutoTracking();

// Listen for token events
const listener = setupIntegration({
  onTokenCreated: (token) => {
    // Award tokens for art creation
    updateArtistBalance(token.userId);
    showNotification(`You earned a ${token.type} token!`);
  },
  onLoginChanged: (data) => {
    if (data.loggedIn) {
      loadArtistPortfolio(data.user.userId);
    } else {
      clearArtistData();
    }
  }
});

// Award token when user creates art
async function onArtCreated(artData) {
  const token = await tokenService.createToken({
    type: 'bronze',
    value: 1,
    userId: getCurrentUserId(),
    metadata: { artId: artData.id, artTitle: artData.title }
  });
  console.log('Token awarded for art:', token);
}
```

### Example 2: v Repository (Version Control)

```javascript
// v/src/main.js
import { tokenService } from './pewpi-shared/token-service.js';
import { IntegrationListener } from './pewpi-shared/integration-listener.js';

const listener = new IntegrationListener({
  onTokenCreated: (token) => {
    // Track tokens in version history
    addToVersionHistory({
      type: 'token-created',
      token,
      timestamp: new Date().toISOString()
    });
  },
  onLoginChanged: (data) => {
    if (data.loggedIn) {
      syncUserVersions(data.user.userId);
    }
  }
});
listener.start();

// Award token for commits
async function onCommit(commitData) {
  await tokenService.createToken({
    type: 'silver',
    value: 5,
    userId: commitData.author,
    metadata: { commit: commitData.sha, message: commitData.message }
  });
}
```

### Example 3: infinity-brain-searc Repository

```javascript
// infinity-brain-searc/src/main.js
import { tokenService } from './pewpi-shared/token-service.js';
import { setupIntegration } from './pewpi-shared/integration-listener.js';

setupIntegration({
  onTokenCreated: (token) => {
    // Index token in search
    indexToken(token);
    updateSearchResults();
  },
  onLoginChanged: (data) => {
    if (data.loggedIn) {
      personalizeSearchForUser(data.user.userId);
    } else {
      clearPersonalization();
    }
  }
});

// Award token for valuable searches
async function onSearchCompleted(query, quality) {
  if (quality > 0.8) {
    await tokenService.createToken({
      type: 'bronze',
      value: 1,
      userId: getCurrentUserId(),
      metadata: { query, quality }
    });
  }
}
```

### Example 4: repo-dashboard-hub Repository

```javascript
// repo-dashboard-hub/src/main.js
import { tokenService } from './pewpi-shared/token-service.js';
import { WalletComponent } from './pewpi-shared/wallet/wallet-component.js';
import { setupIntegration } from './pewpi-shared/integration-listener.js';

// Add wallet to dashboard
const wallet = new WalletComponent({ userId: getCurrentUserId() });
wallet.render('dashboard-wallet');

// Listen for events from all integrated repos
setupIntegration({
  onTokenCreated: (token) => {
    // Update dashboard metrics
    updateTokenMetrics();
    updateLeaderboard();
  },
  onLoginChanged: (data) => {
    if (data.loggedIn) {
      loadDashboard(data.user.userId);
    }
  },
  debug: true
});

// Display aggregated token stats
async function updateTokenMetrics() {
  const userId = getCurrentUserId();
  const tokens = await tokenService.getByUserId(userId);
  const balance = await tokenService.getBalance(userId);
  
  updateDashboardUI({
    totalTokens: tokens.length,
    balance,
    tokensByType: groupTokensByType(tokens)
  });
}
```

## Event Reference

### pewpi.token.created

Fired when a new token is created.

```javascript
window.addEventListener('pewpi.token.created', (event) => {
  const token = event.detail;
  console.log('Token created:', token);
  // { tokenId, type, value, userId, createdAt, status, metadata }
});
```

### pewpi.tokens.cleared

Fired when all tokens are cleared.

```javascript
window.addEventListener('pewpi.tokens.cleared', (event) => {
  console.log('All tokens cleared');
});
```

### pewpi.login.changed

Fired when user logs in or out.

```javascript
window.addEventListener('pewpi.login.changed', (event) => {
  const { user, loggedIn } = event.detail;
  console.log('Login changed:', loggedIn ? user : 'logged out');
  // user: { email, userId, method, timestamp }
});
```

### pewpi.p2p.message

Fired when a P2P sync message is received (if P2P is enabled).

```javascript
window.addEventListener('pewpi.p2p.message', (event) => {
  const data = event.detail;
  console.log('P2P message:', data);
  // Handle token-sync, login-sync, etc.
});
```

## TokenService API

### Create Token

```javascript
const token = await tokenService.createToken({
  type: 'bronze', // bronze, silver, gold, platinum
  value: 1,
  userId: 'user_123',
  metadata: { customField: 'value' }
});
```

### Get Tokens

```javascript
// Get all tokens
const allTokens = await tokenService.getAll();

// Get tokens by user
const userTokens = await tokenService.getByUserId('user_123');

// Get balance
const balance = await tokenService.getBalance('user_123');
```

### Subscribe to Events

```javascript
const unsubscribe = tokenService.subscribe('tokenCreated', (token) => {
  console.log('Token created:', token);
});

// Later: unsubscribe()
```

### Enable Auto-Tracking

```javascript
tokenService.initAutoTracking();
```

## Optional: P2P Sync

Enable peer-to-peer synchronization:

```javascript
import { P2PSyncManager } from './pewpi-shared/sync/p2p-sync.js';

const p2p = new P2PSyncManager({
  signalingUrl: 'wss://your-signaling-server.com',
  turnServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
  ],
  enabled: true,
  autoConnect: true
});

// Sync token to peers
p2p.syncToken(token);

// Sync login state to peers
p2p.syncLogin(loginData);
```

## Migration from Existing Systems

### From localStorage-only

If you're using plain localStorage for tokens:

```javascript
// Old code
localStorage.setItem('tokens', JSON.stringify(tokens));

// New code - automatic migration
// TokenService will use localStorage as fallback if IndexedDB unavailable
// Your existing localStorage data remains intact
```

### From Custom Token System

```javascript
// Migrate existing tokens to TokenService
async function migrateTokens() {
  const oldTokens = getOldTokens(); // Your existing function
  
  for (const oldToken of oldTokens) {
    await tokenService.createToken({
      type: oldToken.type || 'bronze',
      value: oldToken.value || 1,
      userId: oldToken.userId,
      metadata: oldToken
    });
  }
  
  console.log('Migration complete');
}
```

## Rollback Instructions

If you need to rollback:

1. **Remove imports**: Delete pewpi-shared imports from your code
2. **Restore backup**: If you backed up localStorage, restore it
3. **Clear IndexedDB**: Open DevTools > Application > IndexedDB > Delete PewpiTokenDB
4. **Remove files**: Delete the `src/pewpi-shared` directory

```javascript
// Clear pewpi data
localStorage.removeItem('pewpi_user');
localStorage.removeItem('pewpi_user_id');
localStorage.removeItem('pewpi_tokens');
indexedDB.deleteDatabase('PewpiTokenDB');
```

## Testing Integration

Test that integration works correctly:

```javascript
// Test token creation
const token = await tokenService.createToken({
  type: 'bronze',
  value: 1,
  userId: 'test-user'
});
console.assert(token.tokenId, 'Token created');

// Test event listening
let eventReceived = false;
window.addEventListener('pewpi.token.created', () => {
  eventReceived = true;
});
await tokenService.createToken({ type: 'bronze', value: 1 });
console.assert(eventReceived, 'Event received');
```

## Security Considerations

- **Never commit secrets**: Don't commit GitHub OAuth client secrets
- **Use HTTPS**: Always use HTTPS in production for magic-link emails
- **Validate tokens**: Validate token data before processing
- **Rate limiting**: Implement rate limiting for token creation
- **Encryption**: Use optional encryption for sensitive token metadata

## Support

For issues or questions:
- Check the main repository: https://github.com/pewpi-infinity/GPT-Vector-Design
- Review test examples in `tests/` directory
- See `docs/` for additional documentation

## Next Steps

1. Integrate login component
2. Add wallet UI
3. Setup event listeners
4. Test token creation flow
5. Enable P2P sync (optional)
6. Deploy to production
