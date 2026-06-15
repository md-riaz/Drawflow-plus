/**
 * ViewportManager Extension
 * Provides fit-to-screen, zoom-to-cursor, pan mode, and viewport save/restore.
 * Works with any DrawFlow instance by directly managing the CSS transform on precanvas.
 */

import { deepClone } from '@utils/index.js';

const DEFAULTS = {
  zoomMin: 0.1,
  zoomMax: 2.5,
  zoomStep: 0.1,
  fitPadding: 80,
  enableGrid: true,
  gridSize: 16,
};

const GRID_STYLES = `
.dfp-canvas-grid {
  background-image: radial-gradient(circle, #c8c8c8 1px, transparent 1px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}
`;

class ViewportManager {
  constructor(options = {}) {
    this._subscribers = new Set();
    this._styleEl = null;
    this.options = { ...DEFAULTS, ...options };
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    const df = drawflowPlus.drawflow;
    if (df) {
      df.zoom_min = this.options.zoomMin;
      df.zoom_max = this.options.zoomMax;
    }

    if (this.options.enableGrid) {
      this._injectGridStyles();
      const wrapper = this._getWrapper();
      if (wrapper) wrapper.classList.add('dfp-canvas-grid');
    }

    drawflowPlus.fitToScreen = () => this.fitToScreen();
    drawflowPlus.fitToNodes = (nodeIds) => this.fitToNodes(nodeIds);
    drawflowPlus.zoomIn = () => this.zoomIn();
    drawflowPlus.zoomOut = () => this.zoomOut();
    drawflowPlus.zoomTo = (level) => this.zoomTo(level);
    drawflowPlus.zoomAtPoint = (level, screenX, screenY) => this.zoomAtPoint(level, screenX, screenY);
    drawflowPlus.panTo = (x, y) => this.panTo(x, y);
    drawflowPlus.centerCanvas = () => this.centerCanvas();
    drawflowPlus.getViewport = () => this.getViewport();
    drawflowPlus.setViewport = (v) => this.setViewport(v);
    drawflowPlus.onViewportChange = (cb) => this.onViewportChange(cb);
  }

  fitToScreen() {
    const bounds = this._computeNodeBounds(null);
    const df = this.dfp.drawflow;
    if (!df) return;

    if (!bounds) {
      df.zoom = 1;
      df.canvas_x = 0;
      df.canvas_y = 0;
      this._applyTransform('fit');
      return;
    }

    const { width: viewW, height: viewH } = this._getViewportSize();
    const pad = this.options.fitPadding;
    const nodesW = bounds.maxX - bounds.minX || 1;
    const nodesH = bounds.maxY - bounds.minY || 1;

    const scaleX = (viewW - pad * 2) / nodesW;
    const scaleY = (viewH - pad * 2) / nodesH;
    const zoom = Math.min(scaleX, scaleY, this.options.zoomMax);
    const clampedZoom = Math.max(zoom, this.options.zoomMin);

    df.zoom = clampedZoom;
    df.canvas_x = viewW / 2 - (bounds.minX + nodesW / 2) * clampedZoom;
    df.canvas_y = viewH / 2 - (bounds.minY + nodesH / 2) * clampedZoom;
    this._applyTransform('fit');
  }

  fitToNodes(nodeIds) {
    const bounds = this._computeNodeBounds(nodeIds);
    const df = this.dfp.drawflow;
    if (!df || !bounds) return;

    const { width: viewW, height: viewH } = this._getViewportSize();
    const pad = this.options.fitPadding;
    const nodesW = bounds.maxX - bounds.minX || 1;
    const nodesH = bounds.maxY - bounds.minY || 1;

    const scaleX = (viewW - pad * 2) / nodesW;
    const scaleY = (viewH - pad * 2) / nodesH;
    const zoom = Math.min(scaleX, scaleY, this.options.zoomMax);

    df.zoom = Math.max(zoom, this.options.zoomMin);
    df.canvas_x = viewW / 2 - (bounds.minX + nodesW / 2) * df.zoom;
    df.canvas_y = viewH / 2 - (bounds.minY + nodesH / 2) * df.zoom;
    this._applyTransform('fitNodes');
  }

  zoomIn() {
    const df = this.dfp.drawflow;
    if (!df) return;
    this.zoomTo(df.zoom + this.options.zoomStep);
  }

  zoomOut() {
    const df = this.dfp.drawflow;
    if (!df) return;
    this.zoomTo(df.zoom - this.options.zoomStep);
  }

  zoomTo(level) {
    const df = this.dfp.drawflow;
    if (!df) return;
    df.zoom = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, level));
    this._applyTransform('zoom');
  }

  zoomAtPoint(level, screenX, screenY) {
    const df = this.dfp.drawflow;
    if (!df) return;

    const prevZoom = df.zoom;
    const newZoom = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, level));

    // World point under cursor before zoom
    const worldX = (screenX - df.canvas_x) / prevZoom;
    const worldY = (screenY - df.canvas_y) / prevZoom;

    df.zoom = newZoom;
    df.canvas_x = screenX - worldX * newZoom;
    df.canvas_y = screenY - worldY * newZoom;
    this._applyTransform('zoomAtPoint');
  }

  panTo(worldX, worldY) {
    const df = this.dfp.drawflow;
    if (!df) return;
    const { width: viewW, height: viewH } = this._getViewportSize();
    df.canvas_x = viewW / 2 - worldX * df.zoom;
    df.canvas_y = viewH / 2 - worldY * df.zoom;
    this._applyTransform('pan');
  }

  centerCanvas() {
    const df = this.dfp.drawflow;
    if (!df) return;
    df.canvas_x = 0;
    df.canvas_y = 0;
    this._applyTransform('center');
  }

  getViewport() {
    const df = this.dfp.drawflow;
    if (!df) return { zoom: 1, x: 0, y: 0 };
    return { zoom: df.zoom || 1, x: df.canvas_x || 0, y: df.canvas_y || 0 };
  }

  setViewport({ zoom, x, y }) {
    const df = this.dfp.drawflow;
    if (!df) return;
    if (zoom !== undefined) df.zoom = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, zoom));
    if (x !== undefined) df.canvas_x = x;
    if (y !== undefined) df.canvas_y = y;
    this._applyTransform('restore');
  }

  onViewportChange(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  // --- private ---

  _applyTransform(reason) {
    const df = this.dfp.drawflow;
    if (!df || !df.precanvas) return;

    const zoom = df.zoom || 1;
    const x = df.canvas_x || 0;
    const y = df.canvas_y || 0;

    df.precanvas.style.transformOrigin = '0 0';
    df.precanvas.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

    if (this.options.enableGrid) this._updateGridCSS(x, y, zoom);

    const payload = { reason, zoom, x, y };
    this._subscribers.forEach(cb => cb(payload));
  }

  _updateGridCSS(x, y, zoom) {
    const wrapper = this._getWrapper();
    if (!wrapper) return;
    const step = this.options.gridSize * Math.max(0.45, Math.min(zoom, 2.4));
    const offsetX = ((x % step) + step) % step;
    const offsetY = ((y % step) + step) % step;
    wrapper.style.setProperty('--dfp-grid-step', `${step.toFixed(2)}px`);
    wrapper.style.setProperty('--dfp-grid-offset-x', `${offsetX.toFixed(2)}px`);
    wrapper.style.setProperty('--dfp-grid-offset-y', `${offsetY.toFixed(2)}px`);
  }

  _getWrapper() {
    const df = this.dfp.drawflow;
    return df && df.precanvas ? df.precanvas.parentElement : null;
  }

  _getViewportSize() {
    const wrapper = this._getWrapper();
    if (wrapper) {
      const r = wrapper.getBoundingClientRect();
      return {
        width: r.width || wrapper.offsetWidth || 800,
        height: r.height || wrapper.offsetHeight || 600,
      };
    }
    return { width: 800, height: 600 };
  }

  _computeNodeBounds(filterIds) {
    const df = this.dfp.drawflow;
    if (!df) return null;
    const data = this._getNodes();
    const entries = Object.entries(data);
    if (!entries.length) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const [id, node] of entries) {
      if (filterIds && !filterIds.includes(id) && !filterIds.includes(Number(id))) continue;

      const x = node.pos_x || 0;
      const y = node.pos_y || 0;

      // Try to get actual DOM size; fall back to defaults
      let w = 240, h = 140;
      if (typeof document !== 'undefined') {
        const el = document.getElementById(`node-${id}`);
        if (el) {
          w = el.offsetWidth || w;
          h = el.offsetHeight || h;
        }
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }

  _getNodes() {
    try {
      const df = this.dfp.drawflow;
      return df.drawflow.drawflow.Home.data || {};
    } catch (e) {
      return {};
    }
  }

  _injectGridStyles() {
    if (typeof document === 'undefined') return;
    if (this._styleEl) return;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = GRID_STYLES;
    document.head.appendChild(this._styleEl);
  }
}

export default ViewportManager;
