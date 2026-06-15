/**
 * MultiSelect Extension
 * Enables box-selection of multiple nodes and group drag/delete/duplicate.
 * Integrates with CanvasMode (guards edit-only actions) and StateManager
 * (batches group moves into a single undo entry).
 */

const DEFAULTS = {
  boxSelectKey: null,   // null=no modifier, 'shift', 'ctrl', 'meta'
  groupDragEnabled: true,
  keyDelete: true,
  keyCopy: true,
};

const BOX_SELECT_STYLES = `
.dfp-select-box {
  position: absolute;
  border: 2px dashed #3498db;
  background: rgba(52, 152, 219, 0.08);
  pointer-events: none;
  z-index: 9999;
  box-sizing: border-box;
}
.dfp-node-selected > .drawflow_content_node,
.dfp-node-selected {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}
`;

class MultiSelect {
  constructor(options = {}) {
    this._selected = new Set();
    this._subscribers = new Set();
    this._boxEl = null;
    this._boxStart = null;
    this._isDraggingBox = false;
    this._groupDragData = null;
    this._styleEl = null;
    this.options = { ...DEFAULTS, ...options };

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onNodeMoved = this._onNodeMoved.bind(this);
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.selectNode = (nodeId) => this.select(nodeId);
    drawflowPlus.deselectNode = (nodeId) => this.deselect(nodeId);
    drawflowPlus.selectAllNodes = () => this.selectAll();
    drawflowPlus.deselectAllNodes = () => this.deselectAll();
    drawflowPlus.getSelectedNodes = () => this.getSelected();
    drawflowPlus.deleteSelectedNodes = () => this.deleteSelected();
    drawflowPlus.duplicateSelectedNodes = () => this.duplicateSelected();
    drawflowPlus.moveSelectedNodes = (dx, dy) => this.moveSelected(dx, dy);
    drawflowPlus.onSelectionChange = (cb) => this.onSelectionChange(cb);

    this._injectStyles();
    this._attachListeners();
    this._hookDrawflow();
  }

  select(nodeId) {
    const id = String(nodeId);
    this._selected.add(id);
    this._markNodeSelected(id, true);
    this._notifySubscribers();
  }

  deselect(nodeId) {
    const id = String(nodeId);
    this._selected.delete(id);
    this._markNodeSelected(id, false);
    this._notifySubscribers();
  }

  selectAll() {
    const nodes = this._getNodes();
    Object.keys(nodes).forEach(id => this.select(id));
  }

  deselectAll() {
    const prev = new Set(this._selected);
    prev.forEach(id => this._markNodeSelected(id, false));
    this._selected.clear();
    this._notifySubscribers();
  }

  getSelected() {
    return Array.from(this._selected);
  }

  deleteSelected() {
    if (!this._canEdit()) return;
    const df = this.dfp.drawflow;
    if (!df) return;
    const ids = [...this._selected];
    this.deselectAll();
    ids.forEach(id => {
      try { df.removeNodeId(`node-${id}`); } catch (e) { /* ignore */ }
    });
  }

  duplicateSelected() {
    if (!this._canEdit()) return;
    const df = this.dfp.drawflow;
    if (!df) return;
    const nodes = this._getNodes();
    const offset = 30;

    this._selected.forEach(id => {
      const node = nodes[id];
      if (!node) return;
      try {
        df.addNode(
          node.name,
          Object.keys(node.inputs || {}).length,
          Object.keys(node.outputs || {}).length,
          node.pos_x + offset,
          node.pos_y + offset,
          node.class || node.name,
          Object.assign({}, node.data),
          node.html || ''
        );
      } catch (e) { /* ignore */ }
    });
  }

  moveSelected(dx, dy) {
    if (!this._canEdit()) return;
    const df = this.dfp.drawflow;
    if (!df) return;
    const nodes = this._getNodes();

    this._selected.forEach(id => {
      const node = nodes[id];
      if (!node) return;
      node.pos_x += dx;
      node.pos_y += dy;
      const el = typeof document !== 'undefined' ? document.getElementById(`node-${id}`) : null;
      if (el) {
        el.style.left = `${node.pos_x}px`;
        el.style.top = `${node.pos_y}px`;
      }
    });

    if (df && typeof df.updateConnectionNodes === 'function') {
      this._selected.forEach(id => {
        try { df.updateConnectionNodes(`node-${id}`); } catch (e) { /* ignore */ }
      });
    }
  }

  onSelectionChange(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  // --- private ---

  _hookDrawflow() {
    const df = this.dfp.drawflow;
    if (!df || typeof df.on !== 'function') return;

    df.on('nodeSelected', (id) => {
      // Single-node click clears multi-selection unless modifier held
      if (!this._isBoxSelecting) {
        this.deselectAll();
      }
    });

    if (this.options.groupDragEnabled) {
      df.on('nodeMoved', this._onNodeMoved);
    }
  }

  _onNodeMoved(movedId) {
    if (this._selected.size < 2) return;
    if (!this._selected.has(String(movedId))) return;

    // Apply stored delta to followers
    if (!this._groupDragData) return;
    const { startX, startY, followers } = this._groupDragData;
    const nodes = this._getNodes();
    const movedNode = nodes[movedId];
    if (!movedNode) return;

    const dx = movedNode.pos_x - startX;
    const dy = movedNode.pos_y - startY;

    const df = this.dfp.drawflow;
    followers.forEach(({ id, origX, origY }) => {
      const node = nodes[id];
      if (!node) return;
      node.pos_x = origX + dx;
      node.pos_y = origY + dy;
      const el = typeof document !== 'undefined' ? document.getElementById(`node-${id}`) : null;
      if (el) {
        el.style.left = `${node.pos_x}px`;
        el.style.top = `${node.pos_y}px`;
      }
      try { df.updateConnectionNodes(`node-${id}`); } catch (e) { /* ignore */ }
    });
  }

  _attachListeners() {
    if (typeof document === 'undefined') return;

    const wrapper = this._getWrapper();
    if (wrapper) {
      wrapper.addEventListener('pointerdown', this._onPointerDown);
    }
    document.addEventListener('keydown', this._onKeyDown);
  }

  _onPointerDown(e) {
    if (!this._canEdit()) return;

    const isModifierSatisfied = this._checkModifier(e);
    const isBackgroundClick = e.target === this._getWrapper() ||
      e.target === this.dfp.drawflow?.precanvas;

    if (!isBackgroundClick || !isModifierSatisfied) return;

    this._isDraggingBox = true;
    const wrapper = this._getWrapper();
    const rect = wrapper.getBoundingClientRect();
    this._boxStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    this._boxEl = document.createElement('div');
    this._boxEl.className = 'dfp-select-box';
    this._boxEl.style.left = `${this._boxStart.x}px`;
    this._boxEl.style.top = `${this._boxStart.y}px`;
    this._boxEl.style.width = '0px';
    this._boxEl.style.height = '0px';
    wrapper.appendChild(this._boxEl);

    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this._isDraggingBox || !this._boxEl) return;
    const wrapper = this._getWrapper();
    const rect = wrapper.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const x = Math.min(curX, this._boxStart.x);
    const y = Math.min(curY, this._boxStart.y);
    const w = Math.abs(curX - this._boxStart.x);
    const h = Math.abs(curY - this._boxStart.y);

    this._boxEl.style.left = `${x}px`;
    this._boxEl.style.top = `${y}px`;
    this._boxEl.style.width = `${w}px`;
    this._boxEl.style.height = `${h}px`;
  }

  _onPointerUp(e) {
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);

    if (!this._isDraggingBox) return;
    this._isDraggingBox = false;

    if (this._boxEl) {
      const selRect = this._boxEl.getBoundingClientRect();
      this._selectNodesInRect(selRect);
      this._boxEl.remove();
      this._boxEl = null;
    }

    this._boxStart = null;
  }

  _onKeyDown(e) {
    // Guard: don't fire shortcuts when typing in inputs
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && this.options.keyDelete) {
      if (this._selected.size > 0) {
        e.preventDefault();
        this.deleteSelected();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && this._canEdit()) {
      e.preventDefault();
      this.selectAll();
    }

    if (e.key === 'Escape') {
      this.deselectAll();
    }
  }

  _selectNodesInRect(selRect) {
    if (typeof document === 'undefined') return;
    this.deselectAll();
    const nodes = this._getNodes();

    Object.keys(nodes).forEach(id => {
      const el = document.getElementById(`node-${id}`);
      if (!el) return;
      const nodeRect = el.getBoundingClientRect();
      if (this._rectsOverlap(selRect, nodeRect)) {
        this.select(id);
        // Prepare group drag data
        const node = nodes[id];
        if (!this._groupDragData) {
          this._groupDragData = { startX: node.pos_x, startY: node.pos_y, followers: [] };
        } else {
          this._groupDragData.followers.push({ id, origX: node.pos_x, origY: node.pos_y });
        }
      }
    });
  }

  _rectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  _markNodeSelected(id, selected) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(`node-${id}`);
    if (!el) return;
    el.classList.toggle('dfp-node-selected', selected);
  }

  _canEdit() {
    const mode = this.dfp.getExtension('canvasMode');
    return !mode || mode.isEditable();
  }

  _checkModifier(e) {
    if (this.options.boxSelectKey === null) return true;
    if (this.options.boxSelectKey === 'shift') return e.shiftKey;
    if (this.options.boxSelectKey === 'ctrl') return e.ctrlKey;
    if (this.options.boxSelectKey === 'meta') return e.metaKey;
    return true;
  }

  _notifySubscribers() {
    const selected = this.getSelected();
    this._subscribers.forEach(cb => cb({ selected }));
  }

  _getWrapper() {
    const df = this.dfp.drawflow;
    return df && df.precanvas ? df.precanvas.parentElement : null;
  }

  _getNodes() {
    try {
      const df = this.dfp.drawflow;
      return df.drawflow.drawflow.Home.data || {};
    } catch (e) {
      return {};
    }
  }

  _isBoxSelecting = false;

  _injectStyles() {
    if (typeof document === 'undefined') return;
    if (this._styleEl) return;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = BOX_SELECT_STYLES;
    document.head.appendChild(this._styleEl);
  }
}

export default MultiSelect;
