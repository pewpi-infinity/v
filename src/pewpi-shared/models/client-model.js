/**
 * ClientModel - Mongoose-like model emulator for front-end
 * Allows front-end code to operate without a backend
 */

class ClientModel {
  constructor(schema, collectionName) {
    this.schema = schema;
    this.collectionName = collectionName;
    this.storageKey = `pewpi_model_${collectionName}`;
    this.data = this.loadFromStorage();
  }

  /**
   * Load data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Failed to load ${this.collectionName}:`, error);
      return [];
    }
  }

  /**
   * Save data to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error(`Failed to save ${this.collectionName}:`, error);
    }
  }

  /**
   * Validate document against schema
   * @param {Object} doc 
   * @returns {Object} Validation result
   */
  validate(doc) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(this.schema)) {
      const value = doc[field];
      
      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field "${field}" is required`);
      }
      
      // Type check
      if (value !== undefined && rules.type) {
        const expectedType = rules.type.name.toLowerCase();
        const actualType = typeof value;
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Field "${field}" must be an array`);
        } else if (expectedType !== 'array' && actualType !== expectedType) {
          errors.push(`Field "${field}" must be of type ${expectedType}`);
        }
      }
      
      // Min/Max for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field "${field}" must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field "${field}" must be <= ${rules.max}`);
        }
      }
      
      // MinLength/MaxLength for strings
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`Field "${field}" must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`Field "${field}" must be at most ${rules.maxLength} characters`);
        }
      }
      
      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field "${field}" must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Custom validator
      if (rules.validate && typeof rules.validate === 'function') {
        const result = rules.validate(value);
        if (result !== true) {
          errors.push(result || `Field "${field}" failed validation`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new document
   * @param {Object} docData 
   * @returns {Object} Created document
   */
  create(docData) {
    // Add _id and timestamps
    const doc = {
      _id: this.generateId(),
      ...docData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Apply defaults from schema
    for (const [field, rules] of Object.entries(this.schema)) {
      if (doc[field] === undefined && rules.default !== undefined) {
        doc[field] = typeof rules.default === 'function' ? rules.default() : rules.default;
      }
    }
    
    // Validate
    const validation = this.validate(doc);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.data.push(doc);
    this.saveToStorage();
    
    return doc;
  }

  /**
   * Find all documents matching query
   * @param {Object} query 
   * @returns {Array} Matching documents
   */
  find(query = {}) {
    return this.data.filter(doc => this.matchesQuery(doc, query));
  }

  /**
   * Find one document matching query
   * @param {Object} query 
   * @returns {Object|null} Found document
   */
  findOne(query = {}) {
    return this.data.find(doc => this.matchesQuery(doc, query)) || null;
  }

  /**
   * Find document by ID
   * @param {string} id 
   * @returns {Object|null}
   */
  findById(id) {
    return this.findOne({ _id: id });
  }

  /**
   * Update documents matching query
   * @param {Object} query 
   * @param {Object} update 
   * @returns {number} Number of updated documents
   */
  updateMany(query, update) {
    let count = 0;
    this.data = this.data.map(doc => {
      if (this.matchesQuery(doc, query)) {
        count++;
        return {
          ...doc,
          ...update,
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    });
    
    if (count > 0) {
      this.saveToStorage();
    }
    
    return count;
  }

  /**
   * Update one document matching query
   * @param {Object} query 
   * @param {Object} update 
   * @returns {Object|null} Updated document
   */
  updateOne(query, update) {
    const index = this.data.findIndex(doc => this.matchesQuery(doc, query));
    if (index === -1) return null;
    
    this.data[index] = {
      ...this.data[index],
      ...update,
      updatedAt: new Date().toISOString()
    };
    
    this.saveToStorage();
    return this.data[index];
  }

  /**
   * Delete documents matching query
   * @param {Object} query 
   * @returns {number} Number of deleted documents
   */
  deleteMany(query) {
    const initialLength = this.data.length;
    this.data = this.data.filter(doc => !this.matchesQuery(doc, query));
    const deletedCount = initialLength - this.data.length;
    
    if (deletedCount > 0) {
      this.saveToStorage();
    }
    
    return deletedCount;
  }

  /**
   * Delete one document matching query
   * @param {Object} query 
   * @returns {Object|null} Deleted document
   */
  deleteOne(query) {
    const index = this.data.findIndex(doc => this.matchesQuery(doc, query));
    if (index === -1) return null;
    
    const deleted = this.data.splice(index, 1)[0];
    this.saveToStorage();
    return deleted;
  }

  /**
   * Count documents matching query
   * @param {Object} query 
   * @returns {number}
   */
  countDocuments(query = {}) {
    return this.find(query).length;
  }

  /**
   * Check if document matches query
   * @param {Object} doc 
   * @param {Object} query 
   * @returns {boolean}
   */
  matchesQuery(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Clear all documents (for testing)
   */
  clearAll() {
    this.data = [];
    this.saveToStorage();
  }
}

/**
 * Schema helper for defining model schemas
 */
export class Schema {
  constructor(definition) {
    this.definition = definition;
  }
  
  static Types = {
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    Array: Array,
    Object: Object
  };
}

/**
 * Create a new model
 * @param {string} name 
 * @param {Schema} schema 
 * @returns {ClientModel}
 */
export function createModel(name, schema) {
  return new ClientModel(schema.definition || schema, name);
}

export default ClientModel;
