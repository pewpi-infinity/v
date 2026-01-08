# Pewpi-Shared Integration Guide

Complete guide for integrating pewpi-shared auth, wallet, and token services into your repository.

## Table of Contents

1. [Overview](#overview)
2. [Integration Methods](#integration-methods)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Cross-Repository Sync](#cross-repository-sync)
5. [API Reference](#api-reference)
6. [Testing](#testing)
7. [Rollback Instructions](#rollback-instructions)
8. [Troubleshooting](#troubleshooting)

## Overview

Pewpi-shared provides a unified authentication and wallet management system that can be integrated across multiple repositories in the pewpi ecosystem. It uses:

- **IndexedDB (via Dexie)** for persistent storage
- **localStorage** as fallback
- **BroadcastChannel API** for cross-tab communication
- **Custom events** for reactive state updates

### Key Benefits

- 🔐 Passwordless authentication
- 💾 Persistent token storage
- 🔄 Real-time cross-tab sync
- 📡 Cross-repository events
- 🎯 Zero backend required (for dev/testing)
- 🚀 Production-ready architecture

## Integration Methods

### Method 1: Direct Copy (Recommended)

Copy the pewpi-shared directory to your repository:

```bash
# From pewpi-infinity/v
cd /path/to/your/repo
cp -r /path/to/v/src/pewpi-shared ./src/
```

### Method 2: Git Submodule

Add as a git submodule for easier updates:

```bash
cd /path/to/your/repo
git submodule add https://github.com/pewpi-infinity/v.git vendor/v
ln -s vendor/v/src/pewpi-shared src/pewpi-shared
```

### Method 3: NPM Package (Future)

```bash
npm install @pewpi-infinity/shared
```

## Step-by-Step Setup

### 1. Install Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "dexie": "^3.2.4"
  }
}
```

Then install:

```bash
npm install
```

### 2. Create Loader Script

Create `pewpi-shared-loader.js` in your repository root:

```javascript
/**
 * Pewpi-Shared Loader
 * Dynamically imports and initializes pewpi-shared services
 */

(async function() {
  try {
    console.log('[Pewpi-Shared] Loading...');
    
    // Import services
    const { tokenService } = await import('./src/pewpi-shared/token-service.js');
    const { authService } = await import('./src/pewpi-shared/auth-service.js');
    const { integrationListener } = await import('./src/pewpi-shared/integration-listener.js');
    
    // Initialize token tracking
    await tokenService.initAutoTracking();
    console.log('[Pewpi-Shared] Token service initialized');
    
    // Restore authentication session
    await authService.restoreSession();
    console.log('[Pewpi-Shared] Auth service initialized');
    
    // Initialize cross-repo sync
    integrationListener.init();
    console.log('[Pewpi-Shared] Integration listener initialized');
    
    // Make services globally available
    window.pewpiShared = {
      tokenService,
      authService,
      integrationListener
    };
    
    console.log('[Pewpi-Shared] Ready!');
    
  } catch (error) {
    console.error('[Pewpi-Shared] Initialization failed:', error);
  }
})();
```

### 3. Include in HTML

Add to your `index.html` or main HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your App</title>
  <!-- Load Dexie from CDN -->
  <script src="https://unpkg.com/dexie@3.2.4/dist/dexie.js"></script>
</head>
<body>
  <!-- Your content -->
  
  <!-- Load pewpi-shared -->
  <script type="module" src="/pewpi-shared-loader.js"></script>
</body>
</html>
```

### 4. Use in Your Application

```javascript
// Access globally
const { tokenService, authService } = window.pewpiShared;

// Or import directly
import { tokenService } from './src/pewpi-shared/token-service.js';
import { authService } from './src/pewpi-shared/auth-service.js';

// Use the services
if (authService.isAuthenticated()) {
  const tokens = await tokenService.getAll();
  console.log('Tokens:', tokens);
}
```

## Cross-Repository Sync

### Publishing Events

Events are automatically published when you use the services:

```javascript
import { tokenService } from './pewpi-shared/token-service.js';

// This automatically emits pewpi.token.created event
const token = await tokenService.createToken({ value: 100 });

// Event is broadcast to:
// 1. Current page (via CustomEvent)
// 2. Other tabs (via BroadcastChannel)
// 3. Other repos listening on 'pewpi-sync' channel
```

### Subscribing to Events

```javascript
import { subscribeToWalletUpdates } from './pewpi-shared/integration-listener.js';

subscribeToWalletUpdates((event) => {
  console.log('Received:', event);
  
  switch(event.type) {
    case 'token.created':
      // Update your UI
      refreshTokenList(event.data);
      break;
      
    case 'token.updated':
      // Update specific token
      updateToken(event.data);
      break;
      
    case 'token.deleted':
      // Remove from UI
      removeToken(event.data.token_hash);
      break;
      
    case 'login.changed':
      // Handle login/logout
      if (event.data.action === 'login') {
        showWallet();
      } else {
        showLogin();
      }
      break;
  }
});
```

### Manual Event Broadcasting

```javascript
import { integrationListener } from './pewpi-shared/integration-listener.js';

// Broadcast custom event
integrationListener.broadcastToOtherContexts('custom.event', {
  message: 'Hello from repo A'
});

// Listen for events from other contexts
integrationListener.listenToOtherContexts((event) => {
  if (event.type === 'custom.event') {
    console.log('Received:', event.data);
  }
});
```

## API Reference

### TokenService

```javascript
import { tokenService } from './pewpi-shared/token-service.js';

// Initialize
await tokenService.initAutoTracking();

// Create token
const token = await tokenService.createToken({
  value: 100,
  balance: 100,
  metadata: { source: 'app' }
});

// Read tokens
const allTokens = await tokenService.getAll();
const token = await tokenService.getByHash(hash);
const balance = await tokenService.getTotalBalance();

// Update token
await tokenService.updateToken(hash, { balance: 150 });

// Delete token
await tokenService.deleteToken(hash);

// Clear all (testing)
await tokenService.clearAll();

// Subscribe to events
tokenService.on('created', (token) => console.log(token));
tokenService.on('updated', (token) => console.log(token));
tokenService.on('deleted', (data) => console.log(data));
```

### AuthService

```javascript
import { authService } from './pewpi-shared/auth-service.js';

// Restore session
await authService.restoreSession();

// Request magic link
const result = await authService.requestMagicLink('user@example.com');
// Dev mode: result.magicLink contains the URL

// Verify magic link (automatic with URL param)
const user = await authService.verifyMagicLink(token);

// Check status
const isAuth = authService.isAuthenticated();
const user = authService.getCurrentUser();

// Logout
await authService.logout();

// Subscribe to events
authService.on('changed', (event) => console.log(event));
```

### WalletUnified

```javascript
import { walletUnified } from './pewpi-shared/wallet-unified.js';

// Initialize (requires auth)
await walletUnified.init();

// Get summary
const summary = await walletUnified.getSummary();
// Returns: { user, tokenCount, totalBalance, tokens }

// Token operations (same as tokenService but with auth check)
await walletUnified.createToken({ value: 50 });
await walletUnified.updateToken(hash, updates);
await walletUnified.deleteToken(hash);

// Subscribe to events
walletUnified.onTokenCreated((token) => {});
walletUnified.onTokenUpdated((token) => {});
walletUnified.onTokenDeleted((data) => {});
walletUnified.onLoginChanged((event) => {});
```

### UI Components

```javascript
// Login Modal
import { unifiedLoginModal } from './pewpi-shared/UnifiedLoginModal.js';
unifiedLoginModal.show();
unifiedLoginModal.hide();

// Wallet Display
import { walletDisplay } from './pewpi-shared/WalletDisplay.js';
await walletDisplay.render('#wallet-container');
walletDisplay.destroy();
```

## Testing

### Manual Testing

1. Open your application in the browser
2. Open DevTools Console
3. Test services:

```javascript
// Test token service
const { tokenService } = window.pewpiShared;
await tokenService.createToken({ value: 100 });
console.log(await tokenService.getAll());

// Test auth service
const { authService } = window.pewpiShared;
await authService.requestMagicLink('test@example.com');
// Click the magic link displayed in the console
```

### Cross-Tab Testing

1. Open your app in multiple tabs
2. Create a token in one tab
3. See it appear in other tabs instantly
4. Check console for sync events

### Cross-Repo Testing

1. Integrate pewpi-shared in two different repos
2. Open both in different tabs
3. Create tokens in one repo
4. Monitor events in the other repo

## Rollback Instructions

If you need to remove pewpi-shared integration:

### Step 1: Remove Loader Script

Remove from your HTML:

```html
<!-- Remove this line -->
<script type="module" src="/pewpi-shared-loader.js"></script>
```

### Step 2: Remove Files

```bash
# Remove pewpi-shared directory
rm -rf src/pewpi-shared

# Remove loader script
rm pewpi-shared-loader.js
```

### Step 3: Remove Dependencies

From `package.json`, remove:

```json
{
  "dependencies": {
    "dexie": "^3.2.4"  // Remove this if not used elsewhere
  }
}
```

Then:

```bash
npm uninstall dexie
```

### Step 4: Clear Browser Storage

In DevTools Console:

```javascript
// Clear IndexedDB
indexedDB.deleteDatabase('PewpiTokenDB');

// Clear localStorage
localStorage.removeItem('pewpi_tokens');
localStorage.removeItem('pewpi_current_user');
localStorage.removeItem('pewpi_magic_links');
localStorage.removeItem('pewpi_sync_log');
localStorage.removeItem('pewpi_sync_event');
```

### Step 5: Verify Removal

1. Refresh the page
2. Check console for errors
3. Verify no pewpi-shared references remain

## Troubleshooting

### Issue: IndexedDB Not Working

**Symptoms**: Tokens not persisting, console warnings about Dexie

**Solutions**:
1. Check if Dexie is loaded: `console.log(window.Dexie)`
2. Verify browser supports IndexedDB: `console.log('indexedDB' in window)`
3. Check browser privacy settings (IndexedDB disabled in private mode)
4. Service will automatically fall back to localStorage

### Issue: Events Not Firing

**Symptoms**: Token created but no events received

**Solutions**:
1. Verify integration listener is initialized: `integrationListener.init()`
2. Check event listeners are set up before creating tokens
3. Verify event names match (e.g., 'pewpi.token.created')

### Issue: Cross-Tab Sync Not Working

**Symptoms**: Changes in one tab don't appear in others

**Solutions**:
1. Check BroadcastChannel support: `console.log('BroadcastChannel' in window)`
2. Verify both tabs are on same origin (protocol + domain + port)
3. Check localStorage fallback is working
4. Look for 'pewpi_sync_event' in localStorage

### Issue: Authentication Not Persisting

**Symptoms**: User logged out after page refresh

**Solutions**:
1. Verify `restoreSession()` is called on page load
2. Check localStorage for 'pewpi_current_user'
3. Ensure loader script runs before app code
4. Check browser privacy settings (localStorage disabled)

### Issue: Magic Link Not Working

**Symptoms**: Can't login with magic link

**Solutions**:
1. Verify dev mode is enabled: `authService.devMode = true`
2. Check URL has `?magic_token=...` parameter
3. Look for token in localStorage: `pewpi_magic_links`
4. Token expires after 15 minutes
5. Token can only be used once

### Getting Help

1. Check browser console for error messages
2. Verify all files are copied correctly
3. Check network tab for failed module imports
4. Review sync log: `integrationListener.getSyncLog()`
5. Test in different browser to rule out extensions

## Best Practices

1. **Always wrap in try/catch**: Services may throw errors
2. **Initialize on page load**: Call `restoreSession()` and `initAutoTracking()` early
3. **Check authentication**: Use `isAuthenticated()` before wallet operations
4. **Handle events**: Subscribe to events for reactive UI updates
5. **Clean URLs**: Remove magic token from URL after verification
6. **Test cross-tab**: Ensure sync works across browser contexts
7. **Production mode**: Set `devMode = false` for production
8. **Error handling**: Implement fallbacks for storage failures

## Examples

See [README.md](./README.md) for code examples and quick start guide.

## Support

For issues specific to pewpi-infinity/v repository, open an issue on GitHub.
