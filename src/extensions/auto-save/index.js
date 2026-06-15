/**
 * AutoSave Extension
 * Debounced auto-persistence with two-level blocking:
 *   - hold()/release() for time-based suppression
 *   - openGate(label)/closeGate() for reference-counted resource locks
 *
 * Integrates with StateManager (dirty-flag check) and CanvasMode (blocks
 * saves when not in 'edit' mode if checkMode is true).
 */

const DEFAULTS = {
  delay: 800,
  positionDelay: 1200,
  saveFn: null,
  buildPayload: null,
  maxRetries: 3,
  retryBaseDelay: 1000,
  checkMode: true,
  onSaveStart: null,
  onSaveEnd: null,
};

class AutoSave {
  constructor(options = {}) {
    this._fullTimer = null;
    this._positionTimer = null;
    this._pendingFull = false;
    this._pendingPosition = false;
    this._holdUntil = 0;
    this._holdIndefinite = false;
    this._gates = new Map();
    this._status = 'idle';
    this._listeners = new Set();
    this.options = { ...DEFAULTS, ...options };
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    if (!this.options.saveFn) {
      throw new Error('AutoSave requires a saveFn option');
    }

    drawflowPlus.scheduleSave = (type) => this.schedule(type);
    drawflowPlus.flushSave = () => this.flush();
    drawflowPlus.holdSave = (durationMs) => this.hold(durationMs);
    drawflowPlus.releaseSave = () => this.release();
    drawflowPlus.cancelSave = () => this.cancel();
    drawflowPlus.openSaveGate = (label) => this.openGate(label);
    drawflowPlus.isSaveHeld = () => this.isHeld();
    drawflowPlus.isSavePending = () => this.isPending();
    drawflowPlus.getSaveStatus = () => this.getStatus();
    drawflowPlus.onSave = (cb) => this.onSave(cb);

    this._hookDrawflow();
  }

  schedule(type = 'full') {
    if (this._isBlocked()) {
      if (type === 'position') this._pendingPosition = true;
      else this._pendingFull = true;
      return;
    }

    if (type === 'position') {
      clearTimeout(this._positionTimer);
      this._positionTimer = setTimeout(() => {
        this._positionTimer = null;
        this._runSave('position');
      }, this.options.positionDelay);
    } else {
      clearTimeout(this._fullTimer);
      clearTimeout(this._positionTimer);
      this._positionTimer = null;
      this._pendingPosition = false; // full supersedes position
      this._fullTimer = setTimeout(() => {
        this._fullTimer = null;
        this._runSave('full');
      }, this.options.delay);
    }
  }

  flush() {
    clearTimeout(this._fullTimer);
    clearTimeout(this._positionTimer);
    this._fullTimer = null;
    this._positionTimer = null;

    if (this._pendingFull || this._pendingPosition) {
      const type = this._pendingFull ? 'full' : 'position';
      this._pendingFull = false;
      this._pendingPosition = false;
      this._runSave(type);
    }
  }

  hold(durationMs) {
    if (durationMs === undefined || durationMs === 0) {
      this._holdIndefinite = true;
    } else {
      this._holdUntil = Math.max(this._holdUntil, Date.now() + durationMs);
    }
  }

  release() {
    this._holdIndefinite = false;
    this._holdUntil = 0;
    if (this._pendingFull || this._pendingPosition) {
      const type = this._pendingFull ? 'full' : 'position';
      this._pendingFull = false;
      this._pendingPosition = false;
      this._runSave(type);
    }
  }

  cancel() {
    clearTimeout(this._fullTimer);
    clearTimeout(this._positionTimer);
    this._fullTimer = null;
    this._positionTimer = null;
    this._pendingFull = false;
    this._pendingPosition = false;
  }

  openGate(label) {
    const key = label || Symbol('gate');
    this._gates.set(key, true);
    return () => {
      this._gates.delete(key);
      if (this._gates.size === 0 && (this._pendingFull || this._pendingPosition)) {
        const type = this._pendingFull ? 'full' : 'position';
        this._pendingFull = false;
        this._pendingPosition = false;
        this._runSave(type);
      }
    };
  }

  isHeld() {
    return this._holdIndefinite || Date.now() < this._holdUntil;
  }

  isPending() {
    return !!(this._fullTimer || this._positionTimer || this._pendingFull || this._pendingPosition);
  }

  getStatus() {
    return this._status;
  }

  onSave(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // --- private ---

  _isBlocked() {
    if (this._gates.size > 0) return true;
    if (this.isHeld()) return true;
    if (this.options.checkMode) {
      const mode = this.dfp.getExtension('canvasMode');
      if (mode && !mode.isEditable()) return true;
    }
    return false;
  }

  _shouldSave() {
    const sm = this.dfp.getExtension('state');
    if (!sm) return true;
    const store = sm.getStore ? sm.getStore('flow') : null;
    if (!store) return true;
    return typeof store.isDirty === 'function' ? store.isDirty() : true;
  }

  _buildPayload() {
    if (typeof this.options.buildPayload === 'function') {
      return this.options.buildPayload();
    }
    const df = this.dfp.drawflow;
    return df && typeof df.export === 'function' ? df.export() : {};
  }

  async _runSave(type) {
    if (this._isBlocked()) {
      if (type === 'full') this._pendingFull = true;
      else this._pendingPosition = true;
      return;
    }

    if (!this._shouldSave()) return;

    // Guard against concurrent saves — queue and run after current save completes
    if (this._status === 'saving') {
      if (type === 'full') this._pendingFull = true;
      else this._pendingPosition = true;
      return;
    }

    this._status = 'saving';
    if (typeof this.options.onSaveStart === 'function') this.options.onSaveStart(type);

    let attempt = 0;
    let success = false;
    let lastErr = null;

    while (attempt <= this.options.maxRetries) {
      try {
        const payload = this._buildPayload();
        await this.options.saveFn(payload);
        success = true;
        break;
      } catch (err) {
        attempt++;
        lastErr = err;
        if (attempt <= this.options.maxRetries) {
          await this._sleep(this.options.retryBaseDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    this._status = success ? 'idle' : 'error';
    if (success) this._onSaveSuccess();
    this._notifyListeners(type, success, success ? null : lastErr);
    if (typeof this.options.onSaveEnd === 'function') this.options.onSaveEnd(type, success, success ? null : lastErr);

    // Flush any save that was queued while we were in progress
    if (this._pendingFull || this._pendingPosition) {
      const nextType = this._pendingFull ? 'full' : 'position';
      this._pendingFull = false;
      this._pendingPosition = false;
      this._runSave(nextType);
    }
  }

  _onSaveSuccess() {
    const sm = this.dfp.getExtension('state');
    if (!sm) return;
    const store = sm.getStore ? sm.getStore('flow') : null;
    if (store && typeof store.resetDirty === 'function') store.resetDirty();
  }

  _notifyListeners(type, success, error) {
    this._listeners.forEach(cb => cb(type, success, error));
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _hookDrawflow() {
    const df = this.dfp.drawflow;
    if (!df || typeof df.on !== 'function') return;

    const scheduleFullSave = () => this.schedule('full');
    const schedulePositionSave = () => this.schedule('position');

    df.on('nodeCreated', scheduleFullSave);
    df.on('nodeRemoved', scheduleFullSave);
    df.on('connectionCreated', scheduleFullSave);
    df.on('connectionRemoved', scheduleFullSave);
    df.on('nodeMoved', schedulePositionSave);
  }
}

export default AutoSave;
