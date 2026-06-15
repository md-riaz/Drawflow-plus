/**
 * Drawflow-plus - Enhanced Drawflow library with extensions
 * @version 0.2.0
 * @author md-riaz
 */

// Phase 1-5 (existing)
export { default as NodeTypeSystem } from './extensions/node-types/index.js';
export { default as UIBuilder } from './extensions/ui/index.js';
export { default as ValidationFramework } from './extensions/validation/index.js';
export { default as StateManager } from './extensions/state/index.js';
export { default as ConnectionManager } from './extensions/connections/index.js';

// Phase 6-9 (v0.2.0 — viewport, connection rules, canvas mode, multi-select)
export { default as ViewportManager } from './extensions/viewport/index.js';
export { default as ConnectionRules } from './extensions/connection-rules/index.js';
export { default as CanvasMode } from './extensions/canvas-mode/index.js';
export { default as MultiSelect } from './extensions/multi-select/index.js';

// Phase 10-14 (v0.3.0 — auto-save, grid, context menu, keyboard, minimap)
export { default as AutoSave } from './extensions/auto-save/index.js';
export { default as GridBackground } from './extensions/grid/index.js';
export { default as NodeContextMenu } from './extensions/context-menu/index.js';
export { default as KeyboardShortcuts } from './extensions/keyboard/index.js';
export { default as Minimap } from './extensions/minimap/index.js';

// Export utilities
export * as Utils from './utils/index.js';

/**
 * Main Drawflow-plus class that integrates all extensions
 */
class DrawflowPlus {
  constructor(options = {}) {
    this.options = options;
    this.extensions = {};
    this.initialized = false;
  }

  /**
   * Initialize the plugin with Drawflow instance
   * @param {Object} drawflowInstance - The Drawflow instance
   * @returns {DrawflowPlus} - Returns this for chaining
   */
  init(drawflowInstance) {
    if (!drawflowInstance) {
      throw new Error('Drawflow instance is required');
    }

    this.drawflow = drawflowInstance;
    this.initialized = true;

    return this;
  }

  /**
   * Register an extension
   * @param {string} name - Extension name
   * @param {Object} extension - Extension module
   * @returns {DrawflowPlus} - Returns this for chaining
   */
  use(name, extension) {
    if (typeof extension !== 'object' || !extension.install) {
      throw new Error(`Extension "${name}" must have an install method`);
    }

    this.extensions[name] = extension;
    extension.install(this, this.options[name] || {});

    return this;
  }

  /**
   * Get an extension by name
   * @param {string} name - Extension name
   * @returns {Object} - The extension module
   */
  getExtension(name) {
    return this.extensions[name];
  }

  /**
   * Check if extension is registered
   * @param {string} name - Extension name
   * @returns {boolean} - True if extension is registered
   */
  hasExtension(name) {
    return Object.prototype.hasOwnProperty.call(this.extensions, name);
  }

  /**
   * Get all registered extensions
   * @returns {Object} - All extensions
   */
  getExtensions() {
    return this.extensions;
  }

  /**
   * Get version
   * @returns {string} - Version number
   */
  getVersion() {
    return '0.2.0';
  }
}

export default DrawflowPlus;
