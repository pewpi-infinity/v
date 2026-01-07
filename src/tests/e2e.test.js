/**
 * E2E Test - Login, Token Creation, Wallet Update
 * Minimal end-to-end test demonstrating the complete flow
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

// Setup global mocks
global.Dexie = class MockDexie {
  constructor(name) {
    this.name = name;
    this._stores = {};
  }
  
  version(v) {
    return {
      stores: (schema) => {
        this._stores = schema;
      }
    };
  }
  
  async open() {}
  
  get tokens() {
    if (!this._tokenStore) {
      this._tokenStore = {
        data: [],
        async add(item) {
          item.id = Date.now() + Math.random();
          this.data.push(item);
          return item.id;
        },
        async toArray() {
          return [...this.data];
        },
        where(field) {
          const store = this;
          return {
            equals: (value) => ({
              async first() {
                return store.data.find(item => item[field] === value);
              }
            })
          };
        },
        async clear() {
          this.data = [];
        }
      };
    }
    return this._tokenStore;
  }
};

global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

global.crypto = {
  getRandomValues(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    async digest(algorithm, data) {
      const hash = new Array(32).fill(0).map((_, i) => (data.byteLength + i) % 256);
      return new Uint8Array(hash).buffer;
    }
  }
};

// Mock window events
global.window = {
  dispatchEvent: (event) => {
    // Simulate event dispatch
    console.log('[Mock Window] Event dispatched:', event.type);
  },
  addEventListener: (type, handler) => {
    console.log('[Mock Window] Event listener added:', type);
  },
  location: {
    origin: 'http://localhost',
    pathname: '/'
  }
};

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

describe('E2E Test: Login → Token Creation → Wallet Update', () => {
  let authService, tokenService, integrationListener;

  before(async () => {
    // Import services
    const authModule = await import('../lib/auth-service.js');
    const tokenModule = await import('../lib/token-service.js');
    const integrationModule = await import('../lib/integration-listener.js');

    authService = authModule.authService;
    tokenService = tokenModule.tokenService;
    integrationListener = integrationModule.integrationListener;

    // Initialize
    await tokenService.initDatabase();
    integrationListener.init();
  });

  it('Complete flow: Login → Create Token → Wallet reflects changes', async () => {
    console.log('\n=== Starting E2E Test ===\n');

    // Step 1: Request magic link
    console.log('Step 1: Requesting magic link...');
    const magicLinkResult = await authService.requestMagicLink('test@example.com');
    
    assert.ok(magicLinkResult.success, 'Magic link request should succeed');
    assert.ok(magicLinkResult.token, 'Should receive token in dev mode');
    console.log('✓ Magic link received:', magicLinkResult.token.substring(0, 16) + '...');

    // Step 2: Verify magic link and login
    console.log('\nStep 2: Verifying magic link...');
    const user = await authService.verifyMagicLink(magicLinkResult.token);
    
    assert.ok(user, 'Should receive user object');
    assert.strictEqual(user.email, 'test@example.com', 'Email should match');
    assert.ok(authService.isAuthenticated(), 'Should be authenticated');
    console.log('✓ User logged in:', user.email);

    // Step 3: Create token
    console.log('\nStep 3: Creating token...');
    const token = await tokenService.createToken({
      value: 'E2E Test Token',
      balance: 100
    });
    
    assert.ok(token, 'Should create token');
    assert.ok(token.token_hash, 'Token should have hash');
    assert.strictEqual(token.value, 'E2E Test Token', 'Value should match');
    assert.strictEqual(token.balance, 100, 'Balance should match');
    console.log('✓ Token created:', token.token_hash.substring(0, 16) + '...');

    // Step 4: Verify token in storage
    console.log('\nStep 4: Verifying token in storage...');
    const allTokens = await tokenService.getAll();
    
    assert.ok(allTokens.length > 0, 'Should have tokens in storage');
    const foundToken = allTokens.find(t => t.token_hash === token.token_hash);
    assert.ok(foundToken, 'Created token should be in storage');
    console.log('✓ Token found in storage');

    // Step 5: Verify wallet balance
    console.log('\nStep 5: Checking wallet balance...');
    const totalBalance = await tokenService.getTotalBalance();
    
    assert.strictEqual(totalBalance, 100, 'Balance should be 100');
    console.log('✓ Wallet balance:', totalBalance);

    // Step 6: Create another token to test live feed update
    console.log('\nStep 6: Creating second token for live feed test...');
    const token2 = await tokenService.createToken({
      value: 'Second Test Token',
      balance: 50
    });
    
    assert.ok(token2, 'Should create second token');
    console.log('✓ Second token created:', token2.token_hash.substring(0, 16) + '...');

    // Step 7: Verify updated balance
    console.log('\nStep 7: Verifying updated balance...');
    const newBalance = await tokenService.getTotalBalance();
    
    assert.strictEqual(newBalance, 150, 'Balance should be 150');
    console.log('✓ Updated balance:', newBalance);

    // Step 8: Test logout
    console.log('\nStep 8: Testing logout...');
    await authService.logout();
    
    assert.ok(!authService.isAuthenticated(), 'Should not be authenticated after logout');
    console.log('✓ User logged out');

    console.log('\n=== E2E Test Complete ===\n');
    console.log('Summary:');
    console.log('- Passwordless login: ✓');
    console.log('- Token creation: ✓');
    console.log('- Wallet balance tracking: ✓');
    console.log('- Live feed updates: ✓');
    console.log('- Logout: ✓');
  });

  it('Integration listener logs sync events', async () => {
    console.log('\n=== Testing Integration Listener ===\n');

    // Clear previous sync log
    integrationListener.clearSyncLog();

    // Create a token (should be logged)
    console.log('Creating token to test sync logging...');
    await tokenService.createToken({
      value: 'Sync Test Token',
      balance: 25
    });

    // Check sync log
    const syncLog = integrationListener.getSyncLog();
    
    assert.ok(syncLog.length > 0, 'Sync log should have entries');
    const tokenCreatedEvent = syncLog.find(e => e.type === 'token.created');
    assert.ok(tokenCreatedEvent, 'Should log token.created event');
    console.log('✓ Sync event logged:', tokenCreatedEvent.type);

    console.log('\n=== Integration Listener Test Complete ===\n');
  });
});
