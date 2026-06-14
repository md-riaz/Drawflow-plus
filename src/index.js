/**
 * Drawflow-plus - Enhanced Drawflow library with extensions
 * @version 0.1.0
 * @author md-riaz
 */

// Export all extensions
export { default as NodeTypeSystem } from './extensions/node-types/index.js';
export { default as UIBuilder } from './extensions/ui/index.js';
export { default as ValidationFramework } from './extensions/validation/index.js';
export { default as StateManager } from './extensions/state/index.js';
export { default as ConnectionManager } from './extensions/connections/index.js';

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
    return this.extensions.hasOwnProperty(name);
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
    return '0.1.0';
  }
}

export default DrawflowPlus;
