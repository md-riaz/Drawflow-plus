/**
 * Minimap Extension
 * Renders a scaled overview of the canvas in a corner overlay.
 * Supports click-to-navigate and viewport tracker rectangle.
 * Requires ViewportManager for panTo integration.
 */

const DEFAULTS = {
  width: 180,
  height: 120,
  position: 'bottom-right',  // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  margin: 12,
  nodeColor: '#3498db',
  viewportColor: 'rgba(52, 152, 219, 0.2)',
  viewportBorderColor: '#3498db',
  collapsible: true,
};

const MINIMAP_STYLES = `
.dfp-minimap {
  position: absolute;
  background: rgba(255,255,255,0.92);
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  z-index: 1000;
}
.dfp-minimap canvas {
  display: block;
}
.dfp-minimap-toggle {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0,0,0,0.2);
  border: none;
  border-radius: 3px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  font-size: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 1001;
}
.dfp-minimap.collapsed {
  height: 24px !important;
  overflow: hidden;
}
`;

class Minimap {
  constructor(options = {}) {
    this._containerEl = null;
    this._canvasEl = null;
    this._styleEl = null;
    this._visible = true;
    this._renderScheduled = false;
    this._navigateListeners = new Set();
    this.options = { ...DEFAULTS, ...options };

    this._onClick = this._onClick.bind(this);
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.renderMinimap = () => this.render();
    drawflowPlus.toggleMinimap = (visible) => this.toggle(visible);
    drawflowPlus.isMinimapVisible = () => this._visible;
    drawflowPlus.onMinimapNavigate = (cb) => this.onNavigate(cb);

    this._injectStyles();
    this._createContainer();
    this._hookDrawflow();
    this._scheduleRender();
  }

  render() {
    if (!this._canvasEl || !this._visible) return;
    const ctx = this._canvasEl.getContext('2d');
    if (!ctx) return;

    const { width, height } = this.options;
    ctx.clearRect(0, 0, width, height);

    const bounds = this._computeBounds();
    if (!bounds) return;

    const { minX, minY, maxX, maxY } = bounds;
    const flowW = maxX - minX || 1;
    const flowH = maxY - minY || 1;

    const scaleX = (width - 16) / flowW;
    const scaleY = (height - 16) / flowH;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = 8 + (width - 16 - flowW * scale) / 2;
    const offsetY = 8 + (height - 16 - flowH * scale) / 2;

    // Draw nodes
    const nodes = this._getNodes();
    ctx.fillStyle = this.options.nodeColor;
    for (const [id, node] of Object.entries(nodes)) {
      const nx = offsetX + (node.pos_x - minX) * scale;
      const ny = offsetY + (node.pos_y - minY) * scale;
      const nw = Math.max(4, 240 * scale);
      const nh = Math.max(3, 80 * scale);
      ctx.fillRect(nx, ny, nw, nh);
    }

    // Draw viewport rectangle
    const df = this.dfp.drawflow;
    if (df) {
      const wrapper = df.precanvas ? df.precanvas.parentElement : null;
      if (wrapper) {
        const viewW = wrapper.offsetWidth || 800;
        const viewH = wrapper.offsetHeight || 600;
        const zoom = df.zoom || 1;
        const cx = df.canvas_x || 0;
        const cy = df.canvas_y || 0;

        // Viewport in world coords
        const vpX = (-cx / zoom);
        const vpY = (-cy / zoom);
        const vpW = viewW / zoom;
        const vpH = viewH / zoom;

        const rx = offsetX + (vpX - minX) * scale;
        const ry = offsetY + (vpY - minY) * scale;
        const rw = vpW * scale;
        const rh = vpH * scale;

        ctx.strokeStyle = this.options.viewportBorderColor;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = this.options.viewportColor;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    this._renderBounds = { minX, minY, scale, offsetX, offsetY };
  }

  toggle(visible) {
    this._visible = visible !== false;
    if (this._containerEl) {
      this._containerEl.style.display = this._visible ? '' : 'none';
    }
    if (this._visible) this._scheduleRender();
  }

  isVisible() {
    return this._visible;
  }

  onNavigate(callback) {
    this._navigateListeners.add(callback);
    return () => this._navigateListeners.delete(callback);
  }

  // --- private ---

  _createContainer() {
    if (typeof document === 'undefined') return;
    const wrapper = this._getWrapper();
    if (!wrapper) return;

    // Ensure wrapper has position
    const pos = window.getComputedStyle(wrapper).position;
    if (pos === 'static') wrapper.style.position = 'relative';

    this._containerEl = document.createElement('div');
    this._containerEl.className = 'dfp-minimap';
    this._containerEl.style.width = `${this.options.width}px`;
    this._containerEl.style.height = `${this.options.height}px`;
    this._positionContainer();

    this._canvasEl = document.createElement('canvas');
    this._canvasEl.width = this.options.width;
    this._canvasEl.height = this.options.height;
    this._containerEl.appendChild(this._canvasEl);

    if (this.options.collapsible) {
      const btn = document.createElement('button');
      btn.className = 'dfp-minimap-toggle';
      btn.textContent = '−';
      btn.title = 'Toggle minimap';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._containerEl.classList.toggle('collapsed');
        btn.textContent = this._containerEl.classList.contains('collapsed') ? '+' : '−';
      });
      this._containerEl.appendChild(btn);
    }

    this._containerEl.addEventListener('click', this._onClick);
    wrapper.appendChild(this._containerEl);
  }

  _positionContainer() {
    if (!this._containerEl) return;
    const { position, margin, width, height } = this.options;
    const style = this._containerEl.style;

    style.top = style.bottom = style.left = style.right = '';

    if (position === 'top-left') { style.top = `${margin}px`; style.left = `${margin}px`; }
    else if (position === 'top-right') { style.top = `${margin}px`; style.right = `${margin}px`; }
    else if (position === 'bottom-left') { style.bottom = `${margin}px`; style.left = `${margin}px`; }
    else { style.bottom = `${margin}px`; style.right = `${margin}px`; } // bottom-right default
  }

  _onClick(e) {
    if (this._containerEl && this._containerEl.classList.contains('collapsed')) return;
    if (!this._renderBounds) return;
    const rect = this._containerEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, scale, offsetX, offsetY } = this._renderBounds;
    const worldX = (clickX - offsetX) / scale + minX;
    const worldY = (clickY - offsetY) / scale + minY;

    this._navigateListeners.forEach(cb => cb({ worldX, worldY }));

    // Use ViewportManager panTo if available
    if (typeof this.dfp.panTo === 'function') {
      this.dfp.panTo(worldX, worldY);
    }
  }

  _hookDrawflow() {
    const df = this.dfp.drawflow;
    if (!df || typeof df.on !== 'function') return;

    const scheduleRender = () => this._scheduleRender();
    df.on('nodeCreated', scheduleRender);
    df.on('nodeRemoved', scheduleRender);
    df.on('nodeMoved', scheduleRender);
    df.on('connectionCreated', scheduleRender);
    df.on('connectionRemoved', scheduleRender);

    // Also subscribe to viewport changes
    if (typeof this.dfp.onViewportChange === 'function') {
      this.dfp.onViewportChange(() => this._scheduleRender());
    }
  }

  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => { this._renderScheduled = false; this.render(); });
    } else {
      setTimeout(() => { this._renderScheduled = false; this.render(); }, 16);
    }
  }

  _computeBounds() {
    const nodes = this._getNodes();
    const entries = Object.entries(nodes);
    if (!entries.length) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, node] of entries) {
      const x = node.pos_x || 0;
      const y = node.pos_y || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 240);
      maxY = Math.max(maxY, y + 80);
    }
    return isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }

  _getNodes() {
    try {
      const df = this.dfp.drawflow;
      const moduleName = df.module || 'Home';
      return df.drawflow.drawflow[moduleName].data || {};
    } catch (e) {
      return {};
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
    this._styleEl.textContent = MINIMAP_STYLES;
    document.head.appendChild(this._styleEl);
  }
}

export default Minimap;
