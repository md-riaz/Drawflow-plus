/**
 * NodeContextMenu Extension
 * Shows a floating context menu on right-click of a node.
 * Default items: Settings, Duplicate, Delete.
 * Per-type item overrides supported.
 * Closes on outside click or Escape.
 */

const DEFAULTS = {
  defaultItems: ['settings', 'duplicate', 'delete'],
  onSettings: null,
  onDuplicate: null,
  onDelete: null,
};

const CONTEXT_MENU_STYLES = `
.dfp-context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  padding: 4px 0;
  z-index: 99999;
  min-width: 160px;
  font-size: 13px;
  font-family: inherit;
  user-select: none;
}
.dfp-context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  transition: background 0.1s;
}
.dfp-context-menu-item:hover {
  background: #f5f5f5;
}
.dfp-context-menu-item.danger {
  color: #e74c3c;
}
.dfp-context-menu-separator {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}
`;

class NodeContextMenu {
  constructor(options = {}) {
    this._menuEl = null;
    this._styleEl = null;
    this._currentNodeId = null;
    this._typeOverrides = new Map();
    this._customItems = [];
    this.options = { ...DEFAULTS, ...options };

    this._onContextMenu = this._onContextMenu.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.registerContextMenuItems = (nodeType, items) =>
      this.registerMenuItems(nodeType, items);
    drawflowPlus.addContextMenuItem = (item) => this.addMenuItem(item);
    drawflowPlus.closeContextMenu = () => this._close();

    this._injectStyles();
    this._attachListeners();
  }

  registerMenuItems(nodeType, items) {
    this._typeOverrides.set(nodeType, items);
    return this;
  }

  addMenuItem(item) {
    this._customItems.push(item);
    return this;
  }

  // --- private ---

  _attachListeners() {
    if (typeof document === 'undefined') return;
    const wrapper = this._getWrapper();
    if (wrapper) {
      wrapper.addEventListener('contextmenu', this._onContextMenu);
    }
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onKeyDown);
  }

  _onContextMenu(e) {
    const nodeEl = e.target.closest('[id^="node-"]');
    if (!nodeEl) return;

    e.preventDefault();
    const nodeId = nodeEl.id.replace('node-', '');
    this._currentNodeId = nodeId;
    this._show(e.clientX, e.clientY, nodeId);
  }

  _show(x, y, nodeId) {
    this._close();

    const items = this._buildItems(nodeId);
    if (!items.length) return;

    this._menuEl = document.createElement('div');
    this._menuEl.className = 'dfp-context-menu';

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'dfp-context-menu-separator';
        this._menuEl.appendChild(sep);
        continue;
      }

      const el = document.createElement('div');
      el.className = `dfp-context-menu-item${item.danger ? ' danger' : ''}`;
      if (item.icon) el.innerHTML = `<span>${item.icon}</span>`;
      const label = document.createElement('span');
      label.textContent = item.label;
      el.appendChild(label);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._close();
        item.action(nodeId, this.dfp);
      });
      this._menuEl.appendChild(el);
    }

    document.body.appendChild(this._menuEl);

    // Position: keep within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = this._menuEl.getBoundingClientRect();
    const left = x + rect.width > vw ? x - rect.width : x;
    const top = y + rect.height > vh ? y - rect.height : y;
    this._menuEl.style.left = `${left}px`;
    this._menuEl.style.top = `${top}px`;
  }

  _buildItems(nodeId) {
    const nodeType = this._getNodeType(nodeId);
    const overrides = nodeType ? this._typeOverrides.get(nodeType) : null;
    const defaults = this.options.defaultItems;
    const itemKeys = overrides || defaults;
    const items = [];

    for (const key of itemKeys) {
      if (key === 'settings') {
        items.push({
          label: 'Settings',
          icon: '⚙',
          action: (id, dfp) => {
            if (typeof this.options.onSettings === 'function') this.options.onSettings(id, dfp);
          },
        });
      } else if (key === 'duplicate') {
        items.push({
          label: 'Duplicate',
          icon: '⧉',
          action: (id, dfp) => {
            if (typeof this.options.onDuplicate === 'function') {
              this.options.onDuplicate(id, dfp);
            } else if (typeof dfp.duplicateSelectedNodes === 'function') {
              dfp.selectNode(id);
              dfp.duplicateSelectedNodes();
              dfp.deselectAllNodes();
            }
          },
        });
      } else if (key === 'delete') {
        items.push({
          label: 'Delete',
          icon: '✕',
          danger: true,
          action: (id, dfp) => {
            if (typeof this.options.onDelete === 'function') {
              this.options.onDelete(id, dfp);
            } else {
              const df = dfp.drawflow;
              if (df) try { df.removeNodeId(`node-${id}`); } catch (e) { /* ignore */ }
            }
          },
        });
      } else if (typeof key === 'object') {
        items.push(key);
      }
    }

    // Append custom items
    if (this._customItems.length) {
      if (items.length) items.push({ separator: true });
      items.push(...this._customItems);
    }

    return items;
  }

  _close() {
    if (this._menuEl) {
      this._menuEl.remove();
      this._menuEl = null;
    }
    this._currentNodeId = null;
  }

  _onDocumentClick() {
    this._close();
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') this._close();
  }

  _getNodeType(nodeId) {
    const nts = this.dfp.getExtension('nodeTypes');
    if (nts && typeof nts.getNodeInstance === 'function') {
      const instance = nts.getNodeInstance(nodeId);
      if (instance) return instance.typeId;
    }
    try {
      const df = this.dfp.drawflow;
      const nodes = df.drawflow.drawflow.Home.data || {};
      const node = nodes[nodeId];
      return node ? node.name : null;
    } catch (e) {
      return null;
    }
  }

  _getWrapper() {
    const df = this.dfp.drawflow;
    return df && df.precanvas ? df.precanvas.parentElement : null;
  }

  _injectStyles() {
    if (typeof document === 'undefined') return;
    if (this._styleEl) return;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = CONTEXT_MENU_STYLES;
    document.head.appendChild(this._styleEl);
  }
}

export default NodeContextMenu;
