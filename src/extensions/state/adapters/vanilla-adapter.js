/**
 * @fileoverview Vanilla Adapter - Built-in reactive signal implementation
 * @version 1.0.0
 *
 * Implements reactive state management using plain JavaScript signals.
 * No external framework dependencies required.
 */

import AdapterInterface from './adapter-interface.js';

/**
 * Signal class - Simple reactive container
 * @private
 * @class
 * @description Implements a basic reactive signal
 */
class Signal {
  /**
   * Create a signal
   * @param {*} initialValue - Initial value
   */
  constructor(initialValue) {
    this.value = initialValue;
    this.subscribers = new Set();
  }

  /**
   * Get signal value
   * @returns {*} - Current value
   */
  get() {
    return this.value;
  }

  /**
   * Set signal value and notify subscribers
   * @param {*} newValue - New value
   * @returns {void}
   */
  set(newValue) {
    if (Object.is(this.value, newValue)) {
      return;
    }

    const oldValue = this.value;
    this.value = newValue;

    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error('Signal subscriber error:', error);
      }
    });
  }

  /**
   * Subscribe to signal changes
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Clone signal
   * @returns {Signal} - New signal with same value
   */
  clone() {
    return new Signal(this.value);
  }
}

/**
 * VanillaAdapter - Pure JavaScript reactive state adapter
 * @class
 * @extends {AdapterInterface}
 * @description Implements reactive state using JavaScript signals
 */
class VanillaAdapter extends AdapterInterface {
  /**
   * Create a VanillaAdapter instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super('vanilla', options);
    this.signals = new Map();
    this.pathToSignal = new Map();
    this.state = {};
  }

  /**
   * Initialize adapter with state
   * @param {Object} state - Initial state
   * @returns {void}
   */
  initialize(state) {
    this.state = structuredClone(state || {});
    this._createSignalsForState(this.state, '');
  }

  /**
   * Create signals for all state paths
   * @private
   * @param {Object} obj - Object to process
   * @param {string} prefix - Current path prefix
   * @returns {void}
   */
  _createSignalsForState(obj, prefix) {
    Object.entries(obj).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this._createSignalsForState(value, path);
      } else {
        const signal = new Signal(value);
        this.signals.set(path, signal);
        this.pathToSignal.set(path, signal);
      }
    });
  }

  /**
   * Get value at path
   * @param {string} path - Path to retrieve
   * @returns {*} - Value at path
   */
  get(path) {
    if (!path) {
      return structuredClone(this.state);
    }

    const signal = this.signals.get(path);
    if (signal) {
      return signal.get();
    }

    // Fall back to direct state access
    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set value at path
   * @param {string} path - Path to set
   * @param {*} value - New value
   * @returns {void}
   */
  set(path, value) {
    // Update internal state
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;

    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      target = target[key];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Update or create signal
    let signal = this.signals.get(path);
    if (!signal) {
      signal = new Signal(value);
      this.signals.set(path, signal);
      this.pathToSignal.set(path, signal);
    } else {
      signal.set(value);
    }
  }

  /**
   * Subscribe to changes at path
   * @param {string} path - Path to watch
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(path, callback) {
    let signal = this.signals.get(path);

    if (!signal) {
      signal = new Signal(this.get(path));
      this.signals.set(path, signal);
      this.pathToSignal.set(path, signal);
    }

    return signal.subscribe(callback);
  }

  /**
   * Create immutable snapshot
   * @returns {Object} - Snapshot containing state copy
   */
  snapshot() {
    return {
      state: structuredClone(this.state),
      signals: new Map(this.signals),
      timestamp: Date.now()
    };
  }

  /**
   * Restore from snapshot
   * @param {Object} snapshot - Snapshot to restore
   * @returns {void}
   */
  restore(snapshot) {
    this.state = structuredClone(snapshot.state);
    this.signals.clear();
    this._createSignalsForState(this.state, '');
  }

  /**
   * Get all signal paths
   * @returns {Array<string>} - Array of monitored paths
   */
  getPaths() {
    return Array.from(this.signals.keys());
  }

  /**
   * Check if adapter is available
   * @static
   * @returns {boolean} - Always true (vanilla always available)
   */
  static isAvailable() {
    return true;
  }

  /**
   * Clear all signals and state
   * @returns {void}
   */
  clear() {
    this.signals.clear();
    this.pathToSignal.clear();
    this.state = {};
  }
}

export default VanillaAdapter;
export { Signal };
