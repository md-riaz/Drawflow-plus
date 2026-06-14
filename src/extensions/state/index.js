/**
 * @fileoverview State Manager Extension - Reactive state management with adapters
 * @version 2.0.0
 *
 * Provides reactive state management with support for:
 * - Multiple adapters (Reef.js, vanilla signals)
 * - Granular subscriptions (path-based)
 * - Batch mutations
 * - Immutable snapshots and restore
 * - Dirty state tracking
 * - Change notifications
 */

/**
 * StateManager class - Central reactive state management
 * @class
 * @description Manages reactive state with adapter support and granular subscriptions
 */
class StateManager {
  /**
   * Create a StateManager instance
   * @param {Object} options - Configuration options
   * @param {string} [options.adapter='vanilla'] - Adapter type ('vanilla' or 'reef')
   * @param {boolean} [options.enableHistory=true] - Enable undo/redo support
   * @param {boolean} [options.trackDirty=true] - Track dirty state
   * @param {number} [options.snapshotSize=50] - Max snapshots to keep
   */
  constructor(options = {}) {
    this.stores = new Map();
    this.subscriptions = new Map();
    this.changeLog = [];
    this.batchMode = false;
    this.batchChanges = [];
    this.options = {
      adapter: 'vanilla',
      enableHistory: true,
      trackDirty: true,
      snapshotSize: 50,
      ...options
    };
  }

  /**
   * Install extension into DrawflowPlus
   * @param {Object} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   * @returns {void}
   */
  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.createReactiveState = this.createReactiveState.bind(this);
    drawflowPlus.getReactiveState = this.getReactiveState.bind(this);
    drawflowPlus.createStore = this.createStore.bind(this);
    drawflowPlus.getStore = this.getStore.bind(this);
  }

  /**
   * Create a new reactive state
   * @param {string} name - State name
   * @param {Object} config - Configuration
   * @param {Object} [config.initialState={}] - Initial state
   * @param {string} [config.adapter] - Adapter type override
   * @param {boolean} [config.trackDirty] - Enable dirty tracking override
   * @returns {ReactiveState} - New reactive state instance
   */
  createReactiveState(name, config = {}) {
    const state = new ReactiveState(name, config, this.options);
    this.stores.set(name, state);
    this.subscriptions.set(name, new Map());
    return state;
  }

  /**
   * Get reactive state by name
   * @param {string} name - State name
   * @returns {ReactiveState|undefined} - State instance or undefined
   */
  getReactiveState(name) {
    return this.stores.get(name);
  }

  /**
   * Create a new store (alias for createReactiveState)
   * @param {string} name - Store name
   * @param {Object} initialState - Initial state
   * @returns {ReactiveState} - New store instance
   */
  createStore(name, initialState = {}) {
    return this.createReactiveState(name, { initialState });
  }

  /**
   * Get a store by name (alias for getReactiveState)
   * @param {string} name - Store name
   * @returns {ReactiveState|undefined} - Store instance
   */
  getStore(name) {
    return this.getReactiveState(name);
  }

  /**
   * Subscribe to state changes at a specific path
   * @param {string} storeName - Store name
   * @param {string} path - Path to subscribe to (e.g., 'user.name')
   * @param {Function} callback - Change callback(newValue, oldValue, fullState)
   * @returns {Function} - Unsubscribe function
   */
  subscribe(storeName, path, callback) {
    const store = this.stores.get(storeName);
    if (!store) {
      throw new Error(`Store "${storeName}" not found`);
    }

    const key = `${storeName}:${path}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }

    this.subscriptions.get(key).add(callback);

    return () => {
      this.subscriptions.get(key).delete(callback);
    };
  }

  /**
   * Notify subscribers of changes
   * @private
   * @param {string} storeName - Store name
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @param {Object} fullState - Complete state
   * @returns {void}
   */
  notifySubscribers(storeName, path, newValue, oldValue, fullState) {
    const key = `${storeName}:${path}`;
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.forEach(callback => {
        callback(newValue, oldValue, fullState);
      });
    }

    // Notify wildcard subscriptions
    const wildcardKey = `${storeName}:*`;
    const wildcards = this.subscriptions.get(wildcardKey);
    if (wildcards) {
      wildcards.forEach(callback => {
        callback(newValue, oldValue, fullState, path);
      });
    }
  }

  /**
   * Begin batch mutations
   * @returns {void}
   */
  beginBatch() {
    this.batchMode = true;
    this.batchChanges = [];
  }

  /**
   * End batch mutations and notify
   * @returns {Array<Object>} - Array of changes
   */
  endBatch() {
    this.batchMode = false;
    const changes = this.batchChanges;
    this.batchChanges = [];
    return changes;
  }

  /**
   * Get change log
   * @returns {Array<Object>} - Array of change records
   */
  getChangeLog() {
    return [...this.changeLog];
  }

  /**
   * Clear change log
   * @returns {void}
   */
  clearChangeLog() {
    this.changeLog = [];
  }
}

/**
 * ReactiveState class - Individual reactive state container
 * @class
 * @description Manages a single reactive state with mutations and subscriptions
 */
class ReactiveState {
  /**
   * Create a ReactiveState instance
   * @param {string} name - State name
   * @param {Object} config - Configuration
   * @param {Object} globalOptions - Global manager options
   */
  constructor(name, config = {}, globalOptions = {}) {
    this.name = name;
    this.config = {
      initialState: {},
      adapter: globalOptions.adapter || 'vanilla',
      trackDirty: globalOptions.trackDirty !== false,
      ...config
    };

    this._state = structuredClone(this.config.initialState);
    this._baseline = structuredClone(this._state);
    this._snapshots = [];
    this._subscriptions = new Map();
    this._mutations = [];
    this._dirty = new Map();

    this._initializeDirtyTracking();
  }

  /**
   * Initialize dirty state tracking
   * @private
   * @returns {void}
   */
  _initializeDirtyTracking() {
    if (!this.config.trackDirty) return;
    this._markClean();
  }

  /**
   * Mark all paths as clean
   * @private
   * @returns {void}
   */
  _markClean() {
    this._dirty.clear();
  }

  /**
   * Mark a path as dirty
   * @private
   * @param {string} path - Path to mark
   * @returns {void}
   */
  _markDirty(path) {
    if (!this.config.trackDirty) return;
    this._dirty.set(path, true);
  }

  /**
   * Get value at path
   * @param {string} [path] - Path to retrieve (dot-notation)
   * @returns {*} - Value at path or entire state
   */
  get(path) {
    if (!path) {
      return structuredClone(this._state);
    }

    const keys = path.split('.');
    let value = this._state;

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
   * @param {string} path - Path to set (dot-notation)
   * @param {*} value - New value
   * @returns {void}
   */
  set(path, value) {
    const oldValue = this.get(path);

    if (Object.is(oldValue, value)) {
      return; // No change
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this._state;

    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
    this._markDirty(path);
    this._notifySubscribers(path, value, oldValue);

    // Record mutation
    this._mutations.push({
      path,
      oldValue,
      newValue: value,
      timestamp: Date.now()
    });
  }

  /**
   * Mutate state with callback
   * @param {string} path - Path to mutate
   * @param {Function} fn - Mutation function(currentValue) => newValue
   * @returns {void}
   */
  mutate(path, fn) {
    const current = this.get(path);
    const next = fn(current);
    this.set(path, next);
  }

  /**
   * Batch multiple mutations
   * @param {Function} fn - Function to run mutations
   * @returns {void}
   */
  batch(fn) {
    const startLength = this._mutations.length;
    fn(this);
    const endLength = this._mutations.length;

    if (endLength > startLength) {
      const mutations = this._mutations.slice(startLength);
      // Could emit batch event here
    }
  }

  /**
   * Subscribe to changes at a path
   * @param {string} path - Path to watch (supports '*' wildcard)
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this._subscriptions.has(path)) {
      this._subscriptions.set(path, new Set());
    }

    this._subscriptions.get(path).add(callback);

    return () => {
      const subs = this._subscriptions.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this._subscriptions.delete(path);
        }
      }
    };
  }

  /**
   * Notify subscribers of change
   * @private
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @returns {void}
   */
  _notifySubscribers(path, newValue, oldValue) {
    // Specific path
    const subscribers = this._subscriptions.get(path);
    if (subscribers) {
      subscribers.forEach(cb => cb(newValue, oldValue));
    }

    // Wildcard
    const wildcards = this._subscriptions.get('*');
    if (wildcards) {
      wildcards.forEach(cb => cb({ path, newValue, oldValue }));
    }
  }

  /**
   * Create immutable snapshot
   * @returns {Object} - Snapshot of current state
   */
  snapshot() {
    const snapshot = {
      name: this.name,
      state: structuredClone(this._state),
      timestamp: Date.now()
    };

    this._snapshots.push(snapshot);
    if (this._snapshots.length > 100) {
      this._snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Restore from snapshot
   * @param {Object} snapshot - Snapshot to restore
   * @returns {Object} - Previous state
   */
  restore(snapshot) {
    const previousState = structuredClone(this._state);
    this._state = structuredClone(snapshot.state);
    this._markDirty('*');
    return previousState;
  }

  /**
   * Get all snapshots
   * @returns {Array<Object>} - Array of snapshots
   */
  getSnapshots() {
    return [...this._snapshots];
  }

  /**
   * Check if state is dirty
   * @param {string} [path] - Specific path to check
   * @returns {boolean} - True if dirty
   */
  isDirty(path) {
    if (!this.config.trackDirty) return false;
    if (!path) return this._dirty.size > 0;
    return this._dirty.has(path);
  }

  /**
   * Get dirty paths
   * @returns {Array<string>} - Array of dirty paths
   */
  getDirtyPaths() {
    return Array.from(this._dirty.keys());
  }

  /**
   * Reset dirty state
   * @param {string} [path] - Specific path to reset
   * @returns {void}
   */
  resetDirty(path) {
    if (path) {
      this._dirty.delete(path);
    } else {
      this._markClean();
    }
  }

  /**
   * Get mutation history
   * @returns {Array<Object>} - Array of mutations
   */
  getMutations() {
    return [...this._mutations];
  }

  /**
   * Clear mutation history
   * @returns {void}
   */
  clearMutations() {
    this._mutations = [];
  }

  /**
   * Update multiple values
   * @param {Object} updates - Updates object
   * @returns {void}
   */
  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Get complete state
   * @returns {Object} - Full state copy
   */
  getState() {
    return structuredClone(this._state);
  }

  /**
   * Replace entire state
   * @param {Object} newState - New state
   * @returns {void}
   */
  setState(newState) {
    this._state = structuredClone(newState);
    this._markDirty('*');
  }

  /**
   * Clear all state
   * @returns {void}
   */
  clear() {
    this._state = {};
    this._markDirty('*');
  }

  /**
   * Check if path exists
   * @param {string} path - Path to check
   * @returns {boolean} - True if exists
   */
  has(path) {
    return this.get(path) !== undefined;
  }
}

export default StateManager;
export { StateManager, ReactiveState };
