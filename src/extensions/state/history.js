/**
 * @fileoverview History Manager - Undo/redo support for state
 * @version 1.0.0
 *
 * Provides undo/redo functionality for reactive state using snapshots.
 * Supports batching, labels, and size limits.
 */

/**
 * HistoryManager class - Undo/redo for state
 * @class
 * @description Manages state history for undo/redo operations
 */
class HistoryManager {
  /**
   * Create a HistoryManager instance
   * @param {Object} state - ReactiveState instance to manage
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSize=100] - Maximum history entries
   * @param {number} [options.debounceMs=300] - Debounce time for recording
   */
  constructor(state, options = {}) {
    this.state = state;
    this.options = {
      maxSize: 100,
      debounceMs: 300,
      ...options
    };

    this.past = [];
    this.future = [];
    this.debounceTimer = null;
    this.isRecording = false;
  }

  /**
   * Record current state to history
   * @param {string} [label] - Optional label for this history entry
   * @returns {Object} - History entry created
   */
  record(label) {
    if (this.isRecording) {
      return null;
    }

    const snapshot = this.state.snapshot();
    const entry = {
      snapshot,
      label: label || `Change at ${new Date().toISOString()}`,
      timestamp: Date.now()
    };

    this.past.push(entry);

    // Limit history size
    if (this.past.length > this.options.maxSize) {
      this.past.shift();
    }

    // Clear future when new change is recorded
    this.future = [];

    return entry;
  }

  /**
   * Record with debouncing
   * @param {string} [label] - Optional label
   * @returns {void}
   */
  recordDebounced(label) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.record(label);
      this.debounceTimer = null;
    }, this.options.debounceMs);
  }

  /**
   * Undo last change
   * @returns {boolean} - True if undo was successful
   */
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    // Record current state to future
    const current = this.state.snapshot();
    this.future.push({
      snapshot: current,
      label: 'Redo',
      timestamp: Date.now()
    });

    // Restore previous state
    const entry = this.past.pop();
    this.isRecording = true;
    try {
      this.state.restore(entry.snapshot);
    } finally {
      this.isRecording = false;
    }

    return true;
  }

  /**
   * Redo last undone change
   * @returns {boolean} - True if redo was successful
   */
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    // Record current state to past
    const current = this.state.snapshot();
    this.past.push({
      snapshot: current,
      label: 'Undo',
      timestamp: Date.now()
    });

    // Restore future state
    const entry = this.future.pop();
    this.isRecording = true;
    try {
      this.state.restore(entry.snapshot);
    } finally {
      this.isRecording = false;
    }

    return true;
  }

  /**
   * Check if undo is available
   * @returns {boolean} - True if can undo
   */
  canUndo() {
    return this.past.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean} - True if can redo
   */
  canRedo() {
    return this.future.length > 0;
  }

  /**
   * Get entire history
   * @returns {Object} - History object with past and future
   */
  getHistory() {
    return {
      past: [...this.past],
      future: [...this.future],
      current: this.state.snapshot()
    };
  }

  /**
   * Get past entries
   * @param {number} [limit] - Maximum entries to return
   * @returns {Array<Object>} - Array of past entries
   */
  getPast(limit) {
    if (limit) {
      return this.past.slice(-limit);
    }
    return [...this.past];
  }

  /**
   * Get future entries
   * @param {number} [limit] - Maximum entries to return
   * @returns {Array<Object>} - Array of future entries
   */
  getFuture(limit) {
    if (limit) {
      return this.future.slice(0, limit);
    }
    return [...this.future];
  }

  /**
   * Clear all history
   * @returns {void}
   */
  clear() {
    this.past = [];
    this.future = [];
  }

  /**
   * Clear future (redo stack)
   * @returns {void}
   */
  clearFuture() {
    this.future = [];
  }

  /**
   * Get history size
   * @returns {Object} - Size information
   */
  getSize() {
    return {
      past: this.past.length,
      future: this.future.length,
      total: this.past.length + this.future.length,
      maxSize: this.options.maxSize
    };
  }

  /**
   * Jump to specific history entry
   * @param {number} index - Index in past array (0 = oldest)
   * @returns {boolean} - True if jump was successful
   */
  jumpToPast(index) {
    if (index < 0 || index >= this.past.length) {
      return false;
    }

    const target = this.past[index];
    const removed = this.past.splice(index + 1);

    // Move current and removed entries to future
    const current = this.state.snapshot();
    removed.unshift({ snapshot: current, label: 'Redo', timestamp: Date.now() });
    this.future = [...removed, ...this.future];

    this.isRecording = true;
    try {
      this.state.restore(target.snapshot);
    } finally {
      this.isRecording = false;
    }

    return true;
  }

  /**
   * Get history size in bytes (approximate)
   * @returns {number} - Approximate byte size
   */
  getMemoryUsage() {
    const entry = (item) => {
      if (!item || typeof item !== 'object') return 0;
      return JSON.stringify(item).length;
    };

    const past = this.past.reduce((sum, item) => sum + entry(item), 0);
    const future = this.future.reduce((sum, item) => sum + entry(item), 0);
    return past + future;
  }

  /**
   * Cleanup and destroy
   * @returns {void}
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.clear();
    this.state = null;
  }
}

export default HistoryManager;
