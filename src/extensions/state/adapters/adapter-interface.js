/**
 * @fileoverview Adapter Interface - Base class for state adapters
 * @version 1.0.0
 *
 * Defines the contract that all state adapters must implement.
 * Adapters enable integration with different reactive frameworks.
 */

/**
 * AdapterInterface - Abstract base class for state adapters
 * @abstract
 * @class
 * @description Defines the interface all state adapters must implement
 */
class AdapterInterface {
  /**
   * Create an adapter instance
   * @param {string} name - Adapter name
   * @param {Object} options - Configuration options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  /**
   * Initialize adapter
   * @abstract
   * @param {Object} state - Initial state
   * @returns {void}
   */
  initialize(state) {
    throw new Error('initialize() must be implemented by adapter');
  }

  /**
   * Get value at path
   * @abstract
   * @param {string} path - Path to retrieve
   * @returns {*} - Value at path
   */
  get(path) {
    throw new Error('get() must be implemented by adapter');
  }

  /**
   * Set value at path
   * @abstract
   * @param {string} path - Path to set
   * @param {*} value - New value
   * @returns {void}
   */
  set(path, value) {
    throw new Error('set() must be implemented by adapter');
  }

  /**
   * Subscribe to changes
   * @abstract
   * @param {string} path - Path to watch
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(path, callback) {
    throw new Error('subscribe() must be implemented by adapter');
  }

  /**
   * Create state snapshot
   * @abstract
   * @returns {Object} - Snapshot object
   */
  snapshot() {
    throw new Error('snapshot() must be implemented by adapter');
  }

  /**
   * Restore from snapshot
   * @abstract
   * @param {Object} snapshot - Snapshot to restore
   * @returns {void}
   */
  restore(snapshot) {
    throw new Error('restore() must be implemented by adapter');
  }

  /**
   * Check if adapter is available in current environment
   * @abstract
   * @static
   * @returns {boolean} - True if adapter can be used
   */
  static isAvailable() {
    throw new Error('isAvailable() must be implemented by adapter');
  }

  /**
   * Get adapter name
   * @returns {string} - Adapter name
   */
  getName() {
    return this.name;
  }

  /**
   * Clone adapter instance
   * @returns {AdapterInterface} - New adapter instance
   */
  clone() {
    return new this.constructor(this.name, { ...this.options });
  }
}

export default AdapterInterface;
