/**
 * @fileoverview Reef Adapter - Reef.js reactive integration
 * @version 1.0.0
 *
 * Provides integration with Reef.js for reactive state management.
 * Reef is a lightweight reactive library with DOM binding capabilities.
 */

import AdapterInterface from './adapter-interface.js';

/**
 * ReefAdapter - Reef.js reactive state adapter
 * @class
 * @extends {AdapterInterface}
 * @description Integrates Reef.js reactive signals with state management
 */
class ReefAdapter extends AdapterInterface {
  /**
   * Create a ReefAdapter instance
   * @param {Object} options - Configuration options
   * @param {Object} [options.reef] - Reef library reference
   */
  constructor(options = {}) {
    super('reef', options);
    this.reef = options.reef || (typeof window !== 'undefined' ? window.Reef : null);
    this.state = {};
    this.signals = new Map();
    this.pathToSignal = new Map();
  }

  /**
   * Check if Reef is available
   * @private
   * @returns {boolean} - True if Reef is available
   */
  _hasReef() {
    return !!this.reef;
  }

  /**
   * Initialize adapter with state
   * @param {Object} state - Initial state
   * @returns {void}
   */
  initialize(state) {
    if (!this._hasReef()) {
      throw new Error('Reef library not available');
    }

    this.state = structuredClone(state || {});
    this._createSignalsForState(this.state, '');
  }

  /**
   * Create Reef signals for all state paths
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
        // Create a Reef signal
        const signal = this.reef(value);
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

    // Try to get from signal first
    const signal = this.signals.get(path);
    if (signal) {
      return signal.value;
    }

    // Fall back to state access
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
    if (!this._hasReef()) {
      throw new Error('Reef library not available');
    }

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

    if (Object.is(oldValue, value)) {
      return;
    }

    target[lastKey] = value;

    // Update or create Reef signal
    let signal = this.signals.get(path);
    if (!signal) {
      signal = this.reef(value);
      this.signals.set(path, signal);
      this.pathToSignal.set(path, signal);
    } else {
      // Update signal value
      signal.value = value;
    }
  }

  /**
   * Subscribe to changes at path
   * @param {string} path - Path to watch
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this._hasReef()) {
      throw new Error('Reef library not available');
    }

    let signal = this.signals.get(path);

    if (!signal) {
      signal = this.reef(this.get(path));
      this.signals.set(path, signal);
      this.pathToSignal.set(path, signal);
    }

    // Reef signals use a watcher pattern
    // We need to create a wrapper that tracks changes
    let previousValue = signal.value;

    const unsubscribe = signal.watch(() => {
      const newValue = signal.value;
      if (!Object.is(previousValue, newValue)) {
        try {
          callback(newValue, previousValue);
        } catch (error) {
          console.error('Signal subscriber error:', error);
        }
        previousValue = newValue;
      }
    });

    // Return unsubscribe function compatible with our interface
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }

  /**
   * Create immutable snapshot
   * @returns {Object} - Snapshot containing state copy
   */
  snapshot() {
    return {
      state: structuredClone(this.state),
      signals: new Map(),
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
   * @param {Object} [reef] - Optional Reef library reference
   * @returns {boolean} - True if Reef is available
   */
  static isAvailable(reef) {
    if (reef) return !!reef;
    return typeof window !== 'undefined' && !!window.Reef;
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

export default ReefAdapter;
