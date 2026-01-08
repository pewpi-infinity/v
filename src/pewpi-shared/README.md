# Pewpi-Shared: Unified Auth + Wallet + Token Library

A unified JavaScript library providing authentication, wallet management, and token services with cross-repository synchronization capabilities.

## Features

- **Passwordless Authentication**: Magic-link login (dev-mode) without requiring email infrastructure
- **Token Management**: Dexie-backed IndexedDB with localStorage fallback
- **Event-Driven Architecture**: Real-time event emission for token and auth state changes
- **Cross-Repo Sync**: BroadcastChannel API for cross-tab and cross-repository synchronization
- **State Machine Support**: Adapter for integrating with state management libraries
- **UI Components**: Ready-to-use login modal and wallet display components
- **Zero Backend**: Fully client-side implementation (production API integration optional)

## Installation

### For This Repository (pewpi-infinity/v)

The library is already integrated. Simply include the loader script:

```html
<script type="module" src="/pewpi-shared-loader.js"></script>
```

### For Other Repositories

Copy the `src/pewpi-shared/` directory to your project:

```bash
# From pewpi-infinity/v repository
cp -r src/pewpi-shared/ your-repo/src/
```

Or install via npm (when available):

```bash
npm install @pewpi-infinity/shared
```

## Quick Start

### 1. Initialize Services

```javascript
import { tokenService } from './pewpi-shared/token-service.js';
import { authService } from './pewpi-shared/auth-service.js';
import { integrationListener } from './pewpi-shared/integration-listener.js';

// Initialize token tracking
await tokenService.initAutoTracking();

// Restore authentication session
await authService.restoreSession();

// Initialize cross-repo sync
integrationListener.init();
```

### 2. Authentication

```javascript
import { authService } from './pewpi-shared/auth-service.js';

// Request magic link
const result = await authService.requestMagicLink('user@example.com');

// In dev-mode, result.magicLink contains the login URL
// In production, an email would be sent

// Verify magic link (automatic on page load with token in URL)
const user = await authService.verifyMagicLink(token);

// Check authentication status
if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
  console.log('Logged in as:', user.email);
}

// Logout
await authService.logout();
```

### 3. Token Management

```javascript
import { tokenService } from './pewpi-shared/token-service.js';

// Create a token
const token = await tokenService.createToken({
  value: 100,
  balance: 100,
  metadata: { source: 'app' }
});

// Get all tokens
const tokens = await tokenService.getAll();

// Get token by hash
const token = await tokenService.getByHash(tokenHash);

// Update token
await tokenService.updateToken(tokenHash, { balance: 150 });

// Delete token
await tokenService.deleteToken(tokenHash);

// Get total balance
const balance = await tokenService.getTotalBalance();
```

### 4. Unified Wallet

```javascript
import { walletUnified } from './pewpi-shared/wallet-unified.js';

// Initialize wallet
await walletUnified.init();

// Get wallet summary
const summary = await walletUnified.getSummary();
// Returns: { user, tokenCount, totalBalance, tokens }

// Create token (requires authentication)
await walletUnified.createToken({ value: 50 });

// Subscribe to events
walletUnified.onTokenCreated((token) => {
  console.log('New token:', token);
});
```

### 5. UI Components

```javascript
import { unifiedLoginModal } from './pewpi-shared/UnifiedLoginModal.js';
import { walletDisplay } from './pewpi-shared/WalletDisplay.js';

// Show login modal
unifiedLoginModal.show();

// Render wallet in a container
await walletDisplay.render('#wallet-container');
```

### 6. Cross-Repo Integration

```javascript
import { subscribeToWalletUpdates } from './pewpi-shared/integration-listener.js';

subscribeToWalletUpdates((event) => {
  console.log('Event type:', event.type);
  console.log('Event data:', event.data);
  
  switch(event.type) {
    case 'token.created':
      // Handle new token
      break;
    case 'token.updated':
      // Handle token update
      break;
    case 'token.deleted':
      // Handle token deletion
      break;
    case 'login.changed':
      // Handle login/logout
      break;
  }
});
```

## Events

The library emits the following custom events:

### Token Events
- `pewpi.token.created` - When a new token is created
- `pewpi.token.updated` - When a token is updated
- `pewpi.token.deleted` - When a token is deleted

### Auth Events
- `pewpi.login.changed` - When login state changes (login/logout/restore)

### Event Structure

```javascript
{
  type: 'token.created',
  data: { /* token data */ },
  timestamp: '2024-01-01T00:00:00.000Z',
  source: 'pewpi-shared'
}
```

## State Machine Integration

```javascript
import { machineAdapter } from './pewpi-shared/machines/adapter.js';

// Create a simple state machine
const machine = machineAdapter.createSimpleMachine('wallet', {
  initial: 'idle',
  states: {
    idle: {
      on: {
        'TOKEN_CREATED': 'updating'
      }
    },
    updating: {
      on: {
        'DONE': 'idle'
      },
      entry: (data) => {
        console.log('Token created:', data);
      }
    }
  }
});

// Subscribe to pewpi events
machineAdapter.subscribe('wallet', 'token.created', (machine, data) => {
  machine.transition('TOKEN_CREATED', data);
});
```

## Dependencies

- **dexie** (^3.2.4): IndexedDB wrapper for token storage
- **crypto-js** (optional): Additional encryption utilities

## Browser Compatibility

- Modern browsers with ES6 module support
- IndexedDB support (with localStorage fallback)
- Web Crypto API for token generation
- BroadcastChannel API (with localStorage fallback)

## Development Mode

Dev-mode is enabled by default for local testing:

- Magic links are displayed directly (no email required)
- Tokens stored in localStorage
- Enhanced logging for debugging

Set `authService.devMode = false` for production.

## Architecture

```
pewpi-shared/
├── token-service.js         # Token CRUD with IndexedDB/localStorage
├── auth-service.js          # Magic-link authentication
├── wallet-unified.js        # Unified wallet management
├── integration-listener.js  # Cross-repo event sync
├── UnifiedLoginModal.js     # Login UI component
├── WalletDisplay.js         # Wallet UI component
├── machines/
│   └── adapter.js          # State machine adapter
├── README.md               # This file
└── INTEGRATION.md          # Integration guide
```

## License

MIT

## Support

For issues and questions, see [INTEGRATION.md](./INTEGRATION.md) for detailed integration examples and troubleshooting.
