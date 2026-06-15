/**
 * KeyboardShortcuts Extension
 * Configurable keyboard bindings for common editor actions.
 * Guards edit-only actions via CanvasMode if installed.
 * Only fires when no text input has focus.
 */

const DEFAULT_BINDINGS = {
  'ctrl+z': 'undo',
  'ctrl+y': 'redo',
  'ctrl+shift+z': 'redo',
  'delete': 'delete',
  'backspace': 'delete',
  'ctrl+a': 'selectAll',
  'ctrl+d': 'duplicate',
  'escape': 'deselect',
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  '0': 'fitToScreen',
};

const EDIT_ONLY_ACTIONS = new Set(['delete', 'duplicate', 'undo', 'redo']);

class KeyboardShortcuts {
  constructor(options = {}) {
    this._bindings = new Map();
    this._customActions = new Map();
    this._styleEl = null;
    this.options = options;

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    // Load default bindings
    const bindings = this.options.bindings || DEFAULT_BINDINGS;
    for (const [key, action] of Object.entries(bindings)) {
      this._bindings.set(key.toLowerCase(), action);
    }

    drawflowPlus.bindKey = (key, action) => this.bind(key, action);
    drawflowPlus.unbindKey = (key) => this.unbind(key);
    drawflowPlus.registerKeyAction = (name, fn) => this.registerAction(name, fn);

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._onKeyDown);
    }
  }

  bind(key, action) {
    this._bindings.set(key.toLowerCase(), action);
    return this;
  }

  unbind(key) {
    this._bindings.delete(key.toLowerCase());
    return this;
  }

  registerAction(name, fn) {
    this._customActions.set(name, fn);
    return this;
  }

  // --- private ---

  _onKeyDown(e) {
    // Don't fire when typing in inputs
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        document.activeElement.isContentEditable) {
      return;
    }

    const key = this._normalizeKey(e);
    const action = this._bindings.get(key);
    if (!action) return;

    // Guard edit-only actions
    if (EDIT_ONLY_ACTIONS.has(action)) {
      const mode = this.dfp.getExtension('canvasMode');
      if (mode && !mode.isEditable()) return;
    }

    const handled = this._executeAction(action, e);
    if (handled) e.preventDefault();
  }

  _executeAction(action, e) {
    // Custom action override
    if (this._customActions.has(action)) {
      this._customActions.get(action)(this.dfp, e);
      return true;
    }

    const dfp = this.dfp;

    switch (action) {
      case 'undo': {
        const sm = dfp.getExtension('state');
        if (sm) {
          const store = sm.getStore ? sm.getStore('flow') : null;
          if (store && typeof store.undo === 'function') { store.undo(); return true; }
        }
        return false;
      }
      case 'redo': {
        const sm = dfp.getExtension('state');
        if (sm) {
          const store = sm.getStore ? sm.getStore('flow') : null;
          if (store && typeof store.redo === 'function') { store.redo(); return true; }
        }
        return false;
      }
      case 'delete': {
        const ms = dfp.getExtension('multiSelect');
        if (ms && typeof dfp.deleteSelectedNodes === 'function') {
          dfp.deleteSelectedNodes();
          return true;
        }
        // Fallback: delete DrawFlow selected node
        const df = dfp.drawflow;
        if (df && df.node_selected) {
          try { df.removeNodeId(df.node_selected.id); } catch (err) { /* ignore */ }
          return true;
        }
        return false;
      }
      case 'selectAll': {
        if (typeof dfp.selectAllNodes === 'function') {
          dfp.selectAllNodes();
          return true;
        }
        return false;
      }
      case 'duplicate': {
        if (typeof dfp.duplicateSelectedNodes === 'function') {
          dfp.duplicateSelectedNodes();
          return true;
        }
        return false;
      }
      case 'deselect': {
        if (typeof dfp.deselectAllNodes === 'function') {
          dfp.deselectAllNodes();
          return true;
        }
        return false;
      }
      case 'zoomIn': {
        if (typeof dfp.zoomIn === 'function') { dfp.zoomIn(); return true; }
        return false;
      }
      case 'zoomOut': {
        if (typeof dfp.zoomOut === 'function') { dfp.zoomOut(); return true; }
        return false;
      }
      case 'fitToScreen': {
        if (typeof dfp.fitToScreen === 'function') { dfp.fitToScreen(); return true; }
        return false;
      }
      default:
        return false;
    }
  }

  _normalizeKey(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    const key = e.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
      parts.push(key);
    }

    return parts.join('+');
  }
}

export default KeyboardShortcuts;
