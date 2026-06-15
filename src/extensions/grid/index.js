/**
 * GridBackground Extension
 * Injects a CSS dot-grid background synchronized to canvas pan and zoom.
 * Uses CSS custom properties updated on ViewportManager's viewport:change event,
 * or falls back to a MutationObserver on precanvas.style.transform if
 * ViewportManager is not installed.
 */

const DEFAULTS = {
  gridSize: 16,
  dotColor: '#c8c8c8',
  dotRadius: 1,
  style: 'dots',  // 'dots' | 'lines'
};

class GridBackground {
  constructor(options = {}) {
    this._styleEl = null;
    this._observer = null;
    this.options = { ...DEFAULTS, ...options };
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    this._injectStyles();
    this._attachToWrapper();

    // Use ViewportManager if available; otherwise observe transform changes
    const viewport = drawflowPlus.getExtension('viewport');
    if (viewport && typeof drawflowPlus.onViewportChange === 'function') {
      drawflowPlus.onViewportChange(({ x, y, zoom }) => this._update(x, y, zoom));
    } else {
      this._observeTransform();
    }

    drawflowPlus.setGridStyle = (style) => this.setStyle(style);
    drawflowPlus.setGridSize = (size) => this.setSize(size);
    drawflowPlus.toggleGrid = (visible) => this.toggle(visible);
  }

  setStyle(style) {
    this.options.style = style;
    this._rebuildStyles();
  }

  setSize(size) {
    this.options.gridSize = size;
    this._rebuildStyles();
    const df = this.dfp.drawflow;
    if (df) this._update(df.canvas_x || 0, df.canvas_y || 0, df.zoom || 1);
  }

  toggle(visible) {
    const wrapper = this._getWrapper();
    if (!wrapper) return;
    wrapper.classList.toggle('dfp-canvas-grid', visible !== false);
  }

  // --- private ---

  _update(x, y, zoom) {
    const wrapper = this._getWrapper();
    if (!wrapper) return;
    const step = this.options.gridSize * Math.max(0.45, Math.min(zoom, 2.4));
    const offsetX = ((x % step) + step) % step;
    const offsetY = ((y % step) + step) % step;
    wrapper.style.setProperty('--dfp-grid-step', `${step.toFixed(2)}px`);
    wrapper.style.setProperty('--dfp-grid-offset-x', `${offsetX.toFixed(2)}px`);
    wrapper.style.setProperty('--dfp-grid-offset-y', `${offsetY.toFixed(2)}px`);
  }

  _attachToWrapper() {
    const wrapper = this._getWrapper();
    if (wrapper) wrapper.classList.add('dfp-canvas-grid');
  }

  _observeTransform() {
    if (typeof MutationObserver === 'undefined') return;
    const df = this.dfp.drawflow;
    if (!df || !df.precanvas) return;

    this._observer = new MutationObserver(() => {
      const transform = df.precanvas.style.transform || '';
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);
      if (match) {
        this._update(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
      }
    });

    this._observer.observe(df.precanvas, { attributes: true, attributeFilter: ['style'] });
  }

  _injectStyles() {
    if (typeof document === 'undefined') return;
    if (this._styleEl) {
      this._styleEl.textContent = this._buildCSS();
      return;
    }
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = this._buildCSS();
    document.head.appendChild(this._styleEl);
  }

  _rebuildStyles() {
    if (this._styleEl) {
      this._styleEl.textContent = this._buildCSS();
    }
  }

  _buildCSS() {
    const { dotColor, dotRadius, style } = this.options;

    if (style === 'lines') {
      return `
.dfp-canvas-grid {
  background-image:
    linear-gradient(to right, ${dotColor} 1px, transparent 1px),
    linear-gradient(to bottom, ${dotColor} 1px, transparent 1px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}`;
    }

    // dots (default)
    return `
.dfp-canvas-grid {
  background-image: radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}`;
  }

  _getWrapper() {
    const df = this.dfp.drawflow;
    return df && df.precanvas ? df.precanvas.parentElement : null;
  }
}

export default GridBackground;
