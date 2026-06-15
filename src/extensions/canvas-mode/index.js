/**
 * CanvasMode Extension
 * Manages editor modes: 'edit', 'readonly', 'preview', 'locked'.
 * Maps modes to DrawFlow's editor_mode and emits change events.
 *
 * Mode capabilities:
 *   edit     - full editing (default)
 *   readonly - pan + zoom only, no mutations
 *   preview  - pan only, no zoom or mutations
 *   locked   - completely frozen
 */

const VALID_MODES = ['edit', 'readonly', 'preview', 'locked'];

const MODE_MAP = {
  edit: 'edit',
  readonly: 'view',
  preview: 'view',
  locked: 'fixed',
};

const DEFAULTS = {
  initialMode: 'edit',
  onModeChange: null,
};

class CanvasMode {
  constructor(options = {}) {
    this._mode = 'edit';
    this._listeners = new Set();
    this.options = { ...DEFAULTS, ...options };
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.setMode = (mode) => this.setMode(mode);
    drawflowPlus.getMode = () => this.getMode();
    drawflowPlus.isEditable = () => this.isEditable();
    drawflowPlus.isPanEnabled = () => this.isPanEnabled();
    drawflowPlus.isZoomEnabled = () => this.isZoomEnabled();
    drawflowPlus.isMode = (mode) => this.is(mode);
    drawflowPlus.onModeChange = (cb) => this.onModeChange(cb);
    drawflowPlus.guardMode = (mode, fn) => this.guard(mode, fn);
    drawflowPlus.withMode = (mode, fn) => this.withMode(mode, fn);

    // Apply initial mode
    this.setMode(this.options.initialMode || 'edit');
  }

  setMode(mode) {
    if (!VALID_MODES.includes(mode)) return false;
    if (mode === this._mode) return true;

    const previous = this._mode;
    this._mode = mode;

    // Sync to DrawFlow's native editor_mode
    const df = this.dfp.drawflow;
    if (df) {
      df.editor_mode = MODE_MAP[mode] || 'edit';
    }

    // Add CSS class to wrapper
    this._updateContainerClass(mode);

    // Notify AutoSave if present
    this._notifyAutoSave(mode, previous);

    // Fire listeners
    const payload = { mode, previous };
    this._listeners.forEach(cb => cb(mode, previous));
    if (typeof this.options.onModeChange === 'function') {
      this.options.onModeChange(mode, previous);
    }

    return true;
  }

  getMode() {
    return this._mode;
  }

  is(mode) {
    return this._mode === mode;
  }

  isEditable() {
    return this._mode === 'edit';
  }

  isPanEnabled() {
    return this._mode !== 'locked';
  }

  isZoomEnabled() {
    return this._mode === 'edit' || this._mode === 'readonly';
  }

  guard(mode, fn) {
    if (this._mode === mode) return fn();
  }

  withMode(mode, fn) {
    const previous = this._mode;
    this.setMode(mode);
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.finally(() => this.setMode(previous));
      }
      this.setMode(previous);
      return result;
    } catch (e) {
      this.setMode(previous);
      throw e;
    }
  }

  onModeChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // --- private ---

  _updateContainerClass(mode) {
    const df = this.dfp.drawflow;
    const wrapper = df && df.precanvas ? df.precanvas.parentElement : null;
    if (!wrapper) return;

    VALID_MODES.forEach(m => wrapper.classList.remove(`dfp-mode-${m}`));
    wrapper.classList.add(`dfp-mode-${mode}`);
  }

  _notifyAutoSave(newMode, prevMode) {
    const autoSave = this.dfp.getExtension('autoSave');
    if (!autoSave) return;

    if (newMode === 'locked') {
      if (typeof autoSave.hold === 'function') autoSave.hold();
    } else if (prevMode === 'locked' && newMode !== 'locked') {
      if (typeof autoSave.release === 'function') autoSave.release();
    }
  }
}

export default CanvasMode;
