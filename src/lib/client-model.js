/**
 * ClientModel - Mongoose-like emulator for frontend-only data operations
 * Provides a familiar API without requiring a backend
 */

class ClientModel {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema;
    this.data = [];
    this.idCounter = 1;
    
    // Load from localStorage if available
    this._loadFromStorage();
  }

  /**
   * Create a new document
   */
  async create(doc) {
    const newDoc = {
      _id: this.idCounter++,
      ...this._applyDefaults(doc),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Validate against schema
    this._validate(newDoc);
    
    this.data.push(newDoc);
    this._saveToStorage();
    
    return newDoc;
  }

  /**
   * Find documents
   */
  async find(query = {}) {
    return this.data.filter(doc => this._matchesQuery(doc, query));
  }

  /**
   * Find one document
   */
  async findOne(query = {}) {
    return this.data.find(doc => this._matchesQuery(doc, query)) || null;
  }

  /**
   * Find by ID
   */
  async findById(id) {
    return this.data.find(doc => doc._id === id) || null;
  }

  /**
   * Update one document
   */
  async updateOne(query, update) {
    const doc = await this.findOne(query);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    
    Object.assign(doc, update);
    doc.updatedAt = new Date().toISOString();
    
    this._saveToStorage();
    
    return { matchedCount: 1, modifiedCount: 1 };
  }

  /**
   * Update many documents
   */
  async updateMany(query, update) {
    const docs = await this.find(query);
    
    docs.forEach(doc => {
      Object.assign(doc, update);
      doc.updatedAt = new Date().toISOString();
    });
    
    this._saveToStorage();
    
    return { matchedCount: docs.length, modifiedCount: docs.length };
  }

  /**
   * Delete one document
   */
  async deleteOne(query) {
    const index = this.data.findIndex(doc => this._matchesQuery(doc, query));
    if (index === -1) return { deletedCount: 0 };
    
    this.data.splice(index, 1);
    this._saveToStorage();
    
    return { deletedCount: 1 };
  }

  /**
   * Delete many documents
   */
  async deleteMany(query) {
    const initialLength = this.data.length;
    this.data = this.data.filter(doc => !this._matchesQuery(doc, query));
    const deletedCount = initialLength - this.data.length;
    
    this._saveToStorage();
    
    return { deletedCount };
  }

  /**
   * Count documents
   */
  async count(query = {}) {
    return this.data.filter(doc => this._matchesQuery(doc, query)).length;
  }

  /**
   * Clear all documents
   */
  async clear() {
    this.data = [];
    this._saveToStorage();
  }

  /**
   * Match document against query
   */
  _matchesQuery(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Apply default values from schema
   */
  _applyDefaults(doc) {
    const result = { ...doc };
    
    for (const [key, definition] of Object.entries(this.schema)) {
      if (result[key] === undefined && definition.default !== undefined) {
        result[key] = typeof definition.default === 'function' 
          ? definition.default() 
          : definition.default;
      }
    }
    
    return result;
  }

  /**
   * Validate document against schema
   */
  _validate(doc) {
    for (const [key, definition] of Object.entries(this.schema)) {
      const value = doc[key];
      
      // Check required fields
      if (definition.required && (value === undefined || value === null)) {
        throw new Error(`Field '${key}' is required`);
      }
      
      // Check type
      if (value !== undefined && definition.type) {
        const expectedType = definition.type.name.toLowerCase();
        const actualType = typeof value;
        
        if (expectedType === 'string' && actualType !== 'string') {
          throw new Error(`Field '${key}' must be a string`);
        } else if (expectedType === 'number' && actualType !== 'number') {
          throw new Error(`Field '${key}' must be a number`);
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new Error(`Field '${key}' must be a boolean`);
        } else if (expectedType === 'date' && !(value instanceof Date) && typeof value !== 'string') {
          throw new Error(`Field '${key}' must be a Date`);
        }
      }
    }
  }

  /**
   * Save to localStorage
   */
  _saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`pewpi_model_${this.name}`, JSON.stringify({
          data: this.data,
          idCounter: this.idCounter
        }));
      } catch (error) {
        console.error(`[ClientModel] Error saving to localStorage: ${error.message}`);
      }
    }
  }

  /**
   * Load from localStorage
   */
  _loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pewpi_model_${this.name}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.data = parsed.data || [];
          this.idCounter = parsed.idCounter || 1;
        }
      } catch (error) {
        console.error(`[ClientModel] Error loading from localStorage: ${error.message}`);
      }
    }
  }
}

/**
 * Create a new model
 */
export function createModel(name, schema) {
  return new ClientModel(name, schema);
}

export default ClientModel;
