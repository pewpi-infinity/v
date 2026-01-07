/**
 * ClientModel Unit Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

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

const { createModel } = await import('../lib/client-model.js');

describe('ClientModel', () => {
  let UserModel;

  beforeEach(() => {
    localStorage.clear();
    
    UserModel = createModel('User', {
      name: { type: String, required: true },
      email: { type: String, required: true },
      age: { type: Number, default: 0 },
      active: { type: Boolean, default: true }
    });
  });

  it('should create a new document', async () => {
    const user = await UserModel.create({
      name: 'John Doe',
      email: 'john@example.com'
    });

    assert.ok(user);
    assert.ok(user._id);
    assert.strictEqual(user.name, 'John Doe');
    assert.strictEqual(user.email, 'john@example.com');
    assert.strictEqual(user.age, 0); // default value
    assert.strictEqual(user.active, true); // default value
  });

  it('should throw error for missing required fields', async () => {
    await assert.rejects(
      async () => {
        await UserModel.create({ name: 'John Doe' }); // missing email
      },
      {
        message: "Field 'email' is required"
      }
    );
  });

  it('should find documents', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });
    await UserModel.create({ name: 'Jane', email: 'jane@example.com' });

    const users = await UserModel.find();
    assert.strictEqual(users.length, 2);
  });

  it('should find documents by query', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });
    await UserModel.create({ name: 'Jane', email: 'jane@example.com' });

    const users = await UserModel.find({ name: 'John' });
    assert.strictEqual(users.length, 1);
    assert.strictEqual(users[0].name, 'John');
  });

  it('should find one document', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });

    const user = await UserModel.findOne({ name: 'John' });
    assert.ok(user);
    assert.strictEqual(user.name, 'John');
  });

  it('should find by ID', async () => {
    const created = await UserModel.create({ name: 'John', email: 'john@example.com' });
    const found = await UserModel.findById(created._id);

    assert.ok(found);
    assert.strictEqual(found._id, created._id);
    assert.strictEqual(found.name, 'John');
  });

  it('should update one document', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });

    const result = await UserModel.updateOne(
      { name: 'John' },
      { age: 30 }
    );

    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.modifiedCount, 1);

    const user = await UserModel.findOne({ name: 'John' });
    assert.strictEqual(user.age, 30);
  });

  it('should update many documents', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com', active: true });
    await UserModel.create({ name: 'Jane', email: 'jane@example.com', active: true });

    const result = await UserModel.updateMany(
      { active: true },
      { active: false }
    );

    assert.strictEqual(result.matchedCount, 2);
    assert.strictEqual(result.modifiedCount, 2);

    const users = await UserModel.find({ active: false });
    assert.strictEqual(users.length, 2);
  });

  it('should delete one document', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });

    const result = await UserModel.deleteOne({ name: 'John' });
    assert.strictEqual(result.deletedCount, 1);

    const user = await UserModel.findOne({ name: 'John' });
    assert.strictEqual(user, null);
  });

  it('should delete many documents', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com', active: true });
    await UserModel.create({ name: 'Jane', email: 'jane@example.com', active: true });
    await UserModel.create({ name: 'Bob', email: 'bob@example.com', active: false });

    const result = await UserModel.deleteMany({ active: true });
    assert.strictEqual(result.deletedCount, 2);

    const users = await UserModel.find();
    assert.strictEqual(users.length, 1);
    assert.strictEqual(users[0].name, 'Bob');
  });

  it('should count documents', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });
    await UserModel.create({ name: 'Jane', email: 'jane@example.com' });

    const count = await UserModel.count();
    assert.strictEqual(count, 2);

    const activeCount = await UserModel.count({ active: true });
    assert.strictEqual(activeCount, 2);
  });

  it('should persist data to localStorage', async () => {
    await UserModel.create({ name: 'John', email: 'john@example.com' });

    const stored = localStorage.getItem('pewpi_model_User');
    assert.ok(stored);

    const parsed = JSON.parse(stored);
    assert.strictEqual(parsed.data.length, 1);
    assert.strictEqual(parsed.data[0].name, 'John');
  });

  it('should load data from localStorage', async () => {
    // Create and save data
    await UserModel.create({ name: 'John', email: 'john@example.com' });

    // Create new model instance (simulating page reload)
    const NewUserModel = createModel('User', {
      name: { type: String, required: true },
      email: { type: String, required: true },
      age: { type: Number, default: 0 },
      active: { type: Boolean, default: true }
    });

    const users = await NewUserModel.find();
    assert.strictEqual(users.length, 1);
    assert.strictEqual(users[0].name, 'John');
  });
});
