/**
 * TokenService Unit Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock Dexie for Node.js environment
global.Dexie = class MockDexie {
  constructor(name) {
    this.name = name;
    this.stores = {};
  }
  
  version(v) {
    return {
      stores: (schema) => {
        this.stores = schema;
      }
    };
  }
  
  async open() {
    // Mock open
  }
  
  get tokens() {
    return {
      data: [],
      async add(item) {
        item.id = Date.now();
        this.data.push(item);
        return item.id;
      },
      async toArray() {
        return [...this.data];
      },
      where(field) {
        return {
          equals: (value) => ({
            async first() {
              return this.data.find(item => item[field] === value);
            },
            async delete() {
              this.data = this.data.filter(item => item[field] !== value);
            },
            async modify(updates) {
              const item = this.data.find(item => item[field] === value);
              if (item) {
                Object.assign(item, updates);
              }
            }
          })
        };
      },
      async clear() {
        this.data = [];
      }
    };
  }
};

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Note: Node.js 20+ has crypto available globally, no need to mock

// Import TokenService after setting up mocks
const { default: TokenService } = await import('../lib/token-service.js');

describe('TokenService', () => {
  let tokenService;

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create new instance
    tokenService = new TokenService();
    await tokenService.initDatabase();
  });

  it('should create a new token', async () => {
    const tokenData = {
      value: 'test token',
      balance: 100
    };

    const token = await tokenService.createToken(tokenData);

    assert.ok(token);
    assert.ok(token.token_hash);
    assert.strictEqual(token.value, 'test token');
    assert.strictEqual(token.balance, 100);
  });

  it('should get all tokens', async () => {
    await tokenService.createToken({ value: 'token1', balance: 50 });
    await tokenService.createToken({ value: 'token2', balance: 75 });

    const tokens = await tokenService.getAll();

    assert.strictEqual(tokens.length, 2);
  });

  it('should get token by hash', async () => {
    const created = await tokenService.createToken({ value: 'test', balance: 100 });
    const found = await tokenService.getByHash(created.token_hash);

    assert.ok(found);
    assert.strictEqual(found.token_hash, created.token_hash);
  });

  it('should update token', async () => {
    const created = await tokenService.createToken({ value: 'test', balance: 100 });
    const updated = await tokenService.updateToken(created.token_hash, { balance: 200 });

    assert.strictEqual(updated.balance, 200);
  });

  it('should delete token', async () => {
    const created = await tokenService.createToken({ value: 'test', balance: 100 });
    await tokenService.deleteToken(created.token_hash);

    const found = await tokenService.getByHash(created.token_hash);
    assert.strictEqual(found, undefined);
  });

  it('should clear all tokens', async () => {
    await tokenService.createToken({ value: 'token1', balance: 50 });
    await tokenService.createToken({ value: 'token2', balance: 75 });

    await tokenService.clearAll();

    const tokens = await tokenService.getAll();
    assert.strictEqual(tokens.length, 0);
  });

  it('should calculate total balance', async () => {
    await tokenService.createToken({ value: 'token1', balance: 50 });
    await tokenService.createToken({ value: 'token2', balance: 75 });

    const totalBalance = await tokenService.getTotalBalance();
    assert.strictEqual(totalBalance, 125);
  });

  it('should support event subscription', (t, done) => {
    const unsubscribe = tokenService.subscribe('pewpi.token.created', (token) => {
      assert.ok(token);
      assert.strictEqual(token.value, 'test event');
      unsubscribe();
      done();
    });

    tokenService.createToken({ value: 'test event', balance: 10 });
  });
});
