# v

---
## 🧱 Sweep Note (safe mode)
Timestamp: 2025-12-26T02:57:50Z
This repo was updated by c13b0 safe sweeper.

---

## ∞ Production Login, Wallet & Token Sync System

**Production-grade authentication, wallet management, and cross-repository token synchronization system for the pewpi ecosystem.**

### 🚀 New Features

- **Passwordless Authentication**: Magic-link login (dev-mode) without requiring GitHub or SMTP
- **Optional GitHub OAuth**: Opt-in social login for users who prefer it
- **Production Wallet UI**: Token balance, list view, detail view, and live activity feed
- **Cross-Repo Sync**: Real-time synchronization across multiple repositories and browser tabs
- **IndexedDB Storage**: Dexie-backed token storage with localStorage fallback
- **P2P Capabilities**: WebRTC DataChannel with optional AES-GCM encryption
- **Integration-Ready**: Designed for seamless integration with banksy, infinity-brain-search, repo-dashboard-hub

---

## ∞ One-Button Infinity Index

This repository also includes a frontend-only "infinity" search interface that demonstrates a six-step deployment pipeline using browser-based SHA-256 tokenization.

### Features

- **Minimalist Search Interface**: Clean, centered design with the infinity symbol (∞)
- **Browser-based SHA-256 Tokenization**: Uses the Web Crypto API to generate secure hashes from user input
- **Six-Step Pipeline Visualization**:
  1. Token Generation (🔐)
  2. Research Phase (🔍)
  3. Webpage Assembly (🌐)
  4. Advertising Layer (📢)
  5. Value Computation (💎)
  6. Asset Packaging (📦)
- **Simulated Mongoose.OS Integration**: Shows firmware status panel with OS version and cart statuses (Memory Bismuth, Hydrogen Exchange)
- **Quantum Electron Cloud Synopsis**: Generates a structured deployment report after pipeline completion
- **Zero Dependencies**: Self-contained HTML file with inline CSS and JavaScript

### Usage

#### Production Wallet & Login

Access the production wallet system:

```bash
# Clone the repository
git clone https://github.com/pewpi-infinity/v.git
cd v

# Open the wallet interface
open pewpi-wallet.html
# Or serve locally (recommended):
python3 -m http.server 8000
# Then visit http://localhost:8000/pewpi-wallet.html
```

**Features:**
- **Login Flow**: Enter email → Receive magic link (dev-mode shows link immediately) → Auto-authenticate
- **Wallet Dashboard**: View total balance, token count, token list with details
- **Live Feed**: Real-time updates when tokens are created or modified
- **Create Tokens**: Click "Create Token" button to generate sample tokens
- **Token Details**: Click "View Details" on any token for full information

**Dev Mode**: Magic links are displayed directly in the UI (no email required) for local testing.

#### Integration with Other Repos

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for detailed integration guide.

Quick example:

```javascript
import { subscribeToWalletUpdates } from './lib/integration-listener.js';

subscribeToWalletUpdates((event) => {
  console.log('Wallet update:', event);
  // Sync with your application
});
```

#### Original One-Button Interface

For the original infinity search interface:

Simply open the file in any modern web browser:

```bash
# Clone the repository
git clone https://github.com/pewpi-infinity/v.git
cd v

# Open in your default browser
open one-button-index.html
# Or on Linux:
xdg-open one-button-index.html
# Or on Windows:
start one-button-index.html
```

Alternatively, drag and drop `one-button-index.html` into your browser window.

#### GitHub Pages Deployment

**Option 1: Keep as separate file** (non-destructive)

1. Go to your repository Settings → Pages
2. Select the source branch (e.g., `main` or `copilot/add-one-button-deploy-page`)
3. Save and wait for deployment
4. Access the page at: `https://pewpi-infinity.github.io/v/one-button-index.html`

**Option 2: Replace main index.html** (if you want this as the landing page)

```bash
# Backup the current index.html
cp index.html index-old.html

# Replace with the one-button version
cp one-button-index.html index.html

# Commit and push
git add index.html index-old.html
git commit -m "Set one-button-index as main landing page"
git push
```

Then access at: `https://pewpi-infinity.github.io/v/`

### How It Works

1. **Enter a Query**: Type any text into the search bar and press Enter
2. **SHA-256 Tokenization**: The browser computes a SHA-256 hash of your input using the Web Crypto API
3. **Token Display**: Shows the first 8 characters as a token ID and the full hash
4. **Pipeline Execution**: Visualizes the six-step deployment process with animated transitions
5. **Synopsis Generation**: Creates a "Quantum Electron Cloud Synopsis" with:
   - Full token root hash
   - ISO timestamp
   - Structured import schedule
   - Asset attachment plan
   - Deployment status

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    pewpi-wallet.html                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Login Component  │  Wallet Component                 │   │
│  └─────────┬─────────┴──────────┬────────────────────────┘   │
│            │                    │                            │
│  ┌─────────▼────────────────────▼────────────────────────┐   │
│  │  AuthService  │  TokenService  │  IntegrationListener │   │
│  └─────────┬──────────────┬──────────────────┬───────────┘   │
│            │              │                  │               │
│            └──────────────┴──────────────────┘               │
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
│              Other Repos & Browser Tabs                    │
│    (banksy, infinity-brain-search, repo-dashboard-hub)    │
└────────────────────────────────────────────────────────────┘
```

### Core Components

1. **TokenService** (`src/lib/token-service.js`)
   - IndexedDB storage via Dexie
   - localStorage fallback
   - Event emission for cross-component sync
   - Methods: createToken, getAll, getByHash, updateToken, deleteToken, clearAll

2. **AuthService** (`src/lib/auth-service.js`)
   - Magic-link passwordless authentication
   - Dev-mode (no SMTP required)
   - Optional GitHub OAuth support
   - Session persistence

3. **ClientModel** (`src/lib/client-model.js`)
   - Mongoose-like API for frontend
   - Schema validation
   - localStorage persistence
   - No backend required

4. **Wallet Component** (`src/components/Wallet.js`)
   - Balance display
   - Token list with pagination
   - Live activity feed
   - Token detail modal

5. **Login Component** (`src/components/Login.js`)
   - Email input for magic-link
   - Optional GitHub OAuth button
   - Dev-mode link display

6. **IntegrationListener** (`src/lib/integration-listener.js`)
   - Cross-repo event broadcasting
   - BroadcastChannel API support
   - Sync logging for debugging

7. **PeerSync** (`src/lib/peer-sync.js`)
   - WebRTC DataChannel support
   - Optional AES-GCM encryption
   - Configurable signaling & TURN

### Testing

Run unit tests:

```bash
npm test
```

Tests cover:
- TokenService: create, read, update, delete, events
- ClientModel: CRUD operations, validation, persistence

### Documentation

- **[INTEGRATION.md](docs/INTEGRATION.md)**: Complete integration guide for cross-repo sync
- Includes examples for banksy, infinity-brain-search, repo-dashboard-hub
- Migration guide from legacy systems
- P2P sync configuration
- Troubleshooting

### Security Features

- **AES-GCM encryption** for sensitive data
- **ECDH key exchange** for P2P
- **Magic-link tokens** with expiration
- **Dev-mode safety** (tokens stored in-memory)
- **No secrets in repo** (all configuration via environment)

---


- **Frontend-Only**: No backend server or API calls required
- **Security**: Uses browser's native `crypto.subtle.digest()` for SHA-256 hashing
- **Mongoose.OS Status**: The firmware panel is a UI simulation for demonstration purposes - no actual firmware hooks or modifications are included
- **No External Dependencies**: All CSS and JavaScript are inline for maximum portability
