# Integration Guide

This guide explains how to integrate the pewpi production login, wallet, and token sync system with other repositories in the ecosystem.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Cross-Repo Integration](#cross-repo-integration)
5. [API Reference](#api-reference)
6. [Migration Guide](#migration-guide)
7. [P2P Sync Configuration](#p2p-sync-configuration)
8. [Troubleshooting](#troubleshooting)

## Overview

The pewpi system provides:

- **Production Authentication**: Passwordless magic-link login with optional GitHub OAuth
- **Wallet Management**: Token storage, balance tracking, and live feed updates
- **Cross-Repo Sync**: Real-time synchronization across multiple repositories and browser tabs
- **P2P Capabilities**: WebRTC DataChannel with optional encryption

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser Tab 1                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TokenService │  │ AuthService  │  │ PeerSync     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                    ┌──────▼──────┐                           │
│                    │  IndexedDB  │                           │
│                    │ (via Dexie) │                           │
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  BroadcastChannel │
                    │   or localStorage │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                      Other Repos/Tabs                      │
│    (banksy, infinity-brain-search, repo-dashboard-hub)    │
│                                                            │
│  Listen for: pewpi.token.created, pewpi.login.changed     │
└────────────────────────────────────────────────────────────┘
```

## Installation

### For the Main Repository (pewpi-infinity/v)

No installation needed - the system is already integrated.

### For Other Repositories

#### Option 1: Copy Shared Libraries (Recommended)

Copy the following files to your repository:

```bash
# From pewpi-infinity/v repository
cp -r src/lib/token-service.js your-repo/src/lib/
cp -r src/lib/client-model.js your-repo/src/lib/
cp -r src/lib/integration-listener.js your-repo/src/lib/
cp -r src/lib/theme.css your-repo/src/lib/
```

#### Option 2: NPM Package (Future)

```bash
npm install @pewpi-infinity/shared-token
```

## Quick Start

### Basic Integration Example

```javascript
// 1. Import the integration listener
import { subscribeToWalletUpdates } from './lib/integration-listener.js';

// 2. Subscribe to wallet/login updates
subscribeToWalletUpdates((event) => {
  console.log('Received update:', event);
  
  switch(event.type) {
    case 'token.created':
      console.log('New token created:', event.data);
      // Update your local state
      updateLocalTokenList(event.data);
      break;
      
    case 'token.updated':
      console.log('Token updated:', event.data);
      // Sync the update
      syncTokenUpdate(event.data);
      break;
      
    case 'login.changed':
      console.log('Login state changed:', event.data);
      // Update authentication state
      updateAuthState(event.data.user, event.data.action);
      break;
  }
});

// 3. Trigger token creation from your app
function createToken(data) {
  window.dispatchEvent(new CustomEvent('pewpi.token.create.request', {
    detail: data
  }));
}
```

## Cross-Repo Integration

### For banksy Repository

```javascript
// banksy/src/wallet-sync.js
import { subscribeToWalletUpdates } from '@pewpi-infinity/v/src/lib/integration-listener.js';

class BanksyWalletSync {
  constructor() {
    this.init();
  }
  
  init() {
    subscribeToWalletUpdates((event) => {
      if (event.type === 'token.created') {
        this.onTokenCreated(event.data);
      }
    });
  }
  
  onTokenCreated(token) {
    // Add token to banksy's local database
    this.banksyDB.tokens.add(token);
    
    // Update UI
    this.updateTokenDisplay(token);
    
    // Trigger any banksy-specific logic
    this.processNewToken(token);
  }
  
  async processNewToken(token) {
    // Example: Generate artwork for the token
    const artwork = await this.generateArtwork(token.token_hash);
    
    // Associate with token
    await this.banksyDB.artwork.add({
      tokenHash: token.token_hash,
      imageData: artwork,
      createdAt: new Date()
    });
  }
}

export default new BanksyWalletSync();
```

### For infinity-brain-search Repository

```javascript
// infinity-brain-search/src/token-indexer.js
import { subscribeToWalletUpdates } from '@pewpi-infinity/v/src/lib/integration-listener.js';

class TokenIndexer {
  constructor() {
    this.searchIndex = [];
    this.init();
  }
  
  init() {
    subscribeToWalletUpdates((event) => {
      if (event.type === 'token.created') {
        this.indexToken(event.data);
      }
    });
  }
  
  indexToken(token) {
    // Add token to search index
    this.searchIndex.push({
      id: token.token_hash,
      value: token.value,
      created: token.created_at,
      searchableText: `${token.value} ${token.token_hash}`.toLowerCase()
    });
    
    console.log(`[TokenIndexer] Indexed token ${token.token_hash}`);
  }
  
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.searchIndex.filter(item => 
      item.searchableText.includes(lowerQuery)
    );
  }
}

export default new TokenIndexer();
```

### For repo-dashboard-hub Repository

```javascript
// repo-dashboard-hub/src/dashboard-sync.js
import { subscribeToWalletUpdates } from '@pewpi-infinity/v/src/lib/integration-listener.js';

class DashboardSync {
  constructor() {
    this.stats = {
      totalTokens: 0,
      totalBalance: 0,
      lastActivity: null
    };
    this.init();
  }
  
  init() {
    subscribeToWalletUpdates((event) => {
      this.updateStats(event);
      this.refreshDashboard();
    });
  }
  
  updateStats(event) {
    switch(event.type) {
      case 'token.created':
        this.stats.totalTokens++;
        this.stats.totalBalance += event.data.balance || 0;
        this.stats.lastActivity = new Date();
        break;
        
      case 'login.changed':
        if (event.data.action === 'login') {
          this.stats.currentUser = event.data.user;
        } else {
          this.stats.currentUser = null;
        }
        break;
    }
  }
  
  refreshDashboard() {
    // Update dashboard UI with new stats
    document.getElementById('totalTokens').textContent = this.stats.totalTokens;
    document.getElementById('totalBalance').textContent = this.stats.totalBalance.toFixed(2);
    
    if (this.stats.lastActivity) {
      document.getElementById('lastActivity').textContent = 
        this.stats.lastActivity.toLocaleString();
    }
  }
}

export default new DashboardSync();
```

## API Reference

### TokenService

```javascript
import { tokenService } from './lib/token-service.js';

// Create token
const token = await tokenService.createToken({
  value: 'my token data',
  balance: 100,
  metadata: { custom: 'data' }
});

// Get all tokens
const tokens = await tokenService.getAll();

// Get by hash
const token = await tokenService.getByHash('abc123...');

// Update token
await tokenService.updateToken('abc123...', { balance: 200 });

// Delete token
await tokenService.deleteToken('abc123...');

// Clear all
await tokenService.clearAll();

// Get total balance
const balance = await tokenService.getTotalBalance();

// Subscribe to events
const unsubscribe = tokenService.subscribe('pewpi.token.created', (token) => {
  console.log('New token:', token);
});
```

### AuthService

```javascript
import { authService } from './lib/auth-service.js';

// Request magic link
const result = await authService.requestMagicLink('user@example.com');

// Verify magic link
const user = await authService.verifyMagicLink(token);

// Get current user
const user = authService.getCurrentUser();

// Check authentication
const isAuth = authService.isAuthenticated();

// Logout
await authService.logout();

// Subscribe to auth events
authService.subscribe('pewpi.login.changed', ({ user, action }) => {
  console.log(`User ${action}:`, user);
});
```

### PeerSync

```javascript
import PeerSync from './lib/peer-sync.js';

// Initialize P2P sync
const peerSync = new PeerSync({
  signalingUrl: 'ws://localhost:8080',
  encryptionEnabled: true,
  autoConnect: true
});

await peerSync.init();

// Send to peer
await peerSync.sendToPeer('peer-id', { type: 'hello', data: 'world' });

// Broadcast to all peers
await peerSync.broadcast({ type: 'update', token: tokenData });

// Subscribe to events
peerSync.subscribe('peer.message', ({ peerId, data }) => {
  console.log('Message from', peerId, ':', data);
});
```

## Migration Guide

### Migrating from Legacy Token System

If you have existing tokens stored in a different format:

```javascript
// migration-script.js
import { tokenService } from './lib/token-service.js';

async function migrateTokens() {
  // Load legacy tokens
  const legacyTokens = JSON.parse(localStorage.getItem('old_tokens') || '[]');
  
  console.log(`Migrating ${legacyTokens.length} tokens...`);
  
  for (const oldToken of legacyTokens) {
    // Convert to new format
    const newToken = {
      token_hash: oldToken.hash || oldToken.id,
      value: oldToken.data || oldToken.value,
      balance: oldToken.balance || 0,
      created_at: oldToken.timestamp || new Date().toISOString(),
      // Map other fields as needed
    };
    
    await tokenService.createToken(newToken);
  }
  
  console.log('Migration complete!');
  
  // Optionally backup old tokens
  localStorage.setItem('old_tokens_backup', JSON.stringify(legacyTokens));
  
  // Remove old tokens
  localStorage.removeItem('old_tokens');
}

// Run migration
migrateTokens();
```

### Rollback Instructions

If you need to rollback:

1. **Stop using the new system**:
   ```javascript
   // Disable auto-tracking
   tokenService.autoTrackingEnabled = false;
   integrationListener.destroy();
   ```

2. **Export current data**:
   ```javascript
   const tokens = await tokenService.getAll();
   const backup = JSON.stringify(tokens);
   localStorage.setItem('pewpi_backup', backup);
   ```

3. **Clear new system data**:
   ```javascript
   await tokenService.clearAll();
   localStorage.removeItem('pewpi_current_user');
   ```

4. **Restore legacy system**:
   ```javascript
   const backup = JSON.parse(localStorage.getItem('old_tokens_backup'));
   localStorage.setItem('old_tokens', JSON.stringify(backup));
   ```

## P2P Sync Configuration

### Basic P2P Setup

```javascript
import PeerSync from './lib/peer-sync.js';

const peerSync = new PeerSync({
  signalingUrl: 'wss://your-signaling-server.com',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ],
  encryptionEnabled: true
});

await peerSync.init();
```

### Setting Up Signaling Server

Example using Node.js + WebSocket:

```javascript
// signaling-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.to) {
      // Forward to specific peer
      const targetWs = clients.get(data.to);
      if (targetWs) {
        targetWs.send(JSON.stringify(data));
      }
    } else {
      // Broadcast to all
      clients.forEach((client, id) => {
        if (id !== clientId) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
  });
});
```

### TURN Server Configuration

For production P2P, use a TURN server:

```javascript
const peerSync = new PeerSync({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turnserver.example.com:3478',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    }
  ]
});
```

## Troubleshooting

### Common Issues

#### 1. "IndexedDB not available"

**Solution**: The system automatically falls back to localStorage. Ensure localStorage is not disabled:

```javascript
// Check localStorage availability
if (typeof localStorage === 'undefined') {
  console.error('localStorage not available');
}
```

#### 2. "Magic link not working"

**Solution**: Ensure dev mode is enabled for local testing:

```javascript
// In auth-service.js
authService.devMode = true; // For local development
```

#### 3. "Cross-repo events not firing"

**Solution**: Verify BroadcastChannel or localStorage events:

```javascript
// Test BroadcastChannel
const channel = new BroadcastChannel('pewpi-sync');
channel.postMessage({ test: true });
channel.onmessage = (e) => console.log('Received:', e.data);
```

#### 4. "P2P connection fails"

**Solution**: Check signaling server and TURN configuration:

```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('Signaling connected');
ws.onerror = (err) => console.error('Signaling error:', err);
```

### Debug Mode

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('pewpi_debug', 'true');

// Or in code
window.PEWPI_DEBUG = true;
```

### Getting Help

- Check logs in browser console
- Review sync log: `localStorage.getItem('pewpi_sync_log')`
- Open an issue on GitHub: https://github.com/pewpi-infinity/v/issues

## Security Considerations

1. **Never commit secrets**: Use environment variables for TURN credentials
2. **Validate all inputs**: Always validate token data before storage
3. **Enable encryption**: Use P2P encryption for sensitive data
4. **HTTPS only**: Always use HTTPS in production
5. **Rate limiting**: Implement rate limiting for magic link requests

## Best Practices

1. **Initialize early**: Initialize services at app startup
2. **Handle errors**: Always wrap service calls in try-catch
3. **Clean up**: Unsubscribe from events when components unmount
4. **Test cross-repo**: Test integration with actual repos, not just mocks
5. **Monitor sync**: Log sync events for debugging

## Examples

See the `/examples` directory for complete integration examples:

- `banksy-integration.js` - Full banksy integration
- `brain-search-integration.js` - Search indexing integration
- `dashboard-integration.js` - Dashboard statistics integration

## Support

For questions or issues:

- GitHub Issues: https://github.com/pewpi-infinity/v/issues
- Documentation: https://github.com/pewpi-infinity/v/docs
- Email: support@pewpi-infinity.com
