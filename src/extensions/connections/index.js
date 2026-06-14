/**
 * Connection Manager Extension
 * Manages connection styling, metadata, status, and bulk operations
 * Provides comprehensive API for visual flow design with semantic status indicators
 */

class ConnectionManager {
  constructor(options = {}) {
    this.connections = new Map();
    this.styles = new Map();
    this.metadata = new Map();
    this.connectionStatus = new Map();
    this.validators = new Map();
    this.options = options;
    this.domElements = new Map();
    this._initializeDefaultStyles();
  }

  /**
   * Initialize default status-based styles
   * @private
   */
  _initializeDefaultStyles() {
    // Status-based color definitions
    const statusColors = {
      primary: '#3498db',
      success: '#2ecc71',
      danger: '#e74c3c',
      warning: '#f39c12'
    };

    this.defineStyle('primary', {
      stroke: statusColors.primary,
      strokeWidth: 2,
      strokeDasharray: 'none',
      color: statusColors.primary,
      label: null
    });

    this.defineStyle('success', {
      stroke: statusColors.success,
      strokeWidth: 2,
      strokeDasharray: 'none',
      color: statusColors.success,
      label: null
    });

    this.defineStyle('danger', {
      stroke: statusColors.danger,
      strokeWidth: 2,
      strokeDasharray: 'none',
      color: statusColors.danger,
      label: null
    });

    this.defineStyle('warning', {
      stroke: statusColors.warning,
      strokeWidth: 2,
      strokeDasharray: '5,5',
      color: statusColors.warning,
      label: null
    });

    this.defineStyle('dashed', {
      stroke: '#95a5a6',
      strokeWidth: 2,
      strokeDasharray: '5,5',
      color: '#95a5a6',
      label: null
    });

    this.defineStyle('dotted', {
      stroke: '#95a5a6',
      strokeWidth: 2,
      strokeDasharray: '2,2',
      color: '#95a5a6',
      label: null
    });
  }

  /**
   * Install extension into DrawflowPlus
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   */
  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };

    // Add methods to DrawflowPlus instance
    drawflowPlus.addConnection = this.addConnection.bind(this);
    drawflowPlus.removeConnection = this.removeConnection.bind(this);
    drawflowPlus.getConnection = this.getConnection.bind(this);
    drawflowPlus.getConnectionsMeta = this.getConnectionsMeta.bind(this);
    drawflowPlus.styleConnection = this.styleConnection.bind(this);
    drawflowPlus.refreshConnectionStyles = this.refreshConnectionStyles.bind(this);
    drawflowPlus.paintConnections = this.paintConnections.bind(this);
    drawflowPlus.setConnectionStatus = this.setConnectionStatus.bind(this);
    drawflowPlus.defineConnectionStyle = this.defineStyle.bind(this);
    drawflowPlus.getConnectionStyle = this.getStyle.bind(this);
    drawflowPlus.setConnectionMetadata = this.setMetadata.bind(this);
    drawflowPlus.getConnectionMetadata = this.getMetadata.bind(this);
  }

  /**
   * Add a new connection with metadata
   * @param {string|number} fromId - Source node ID
   * @param {string} fromOut - Output socket name
   * @param {string|number} toId - Target node ID
   * @param {string} toIn - Input socket name
   * @param {Object} metadata - Connection metadata
   * @returns {Object} - Connection object with ID
   * @throws {Error} If parameters are invalid
   */
  addConnection(fromId, fromOut, toId, toIn, metadata = {}) {
    if (!fromId || !fromOut || !toId || !toIn) {
      throw new Error('Connection requires fromId, fromOut, toId, and toIn');
    }

    const connectionId = `${fromId}_${fromOut}_${toId}_${toIn}`;
    const connection = {
      id: connectionId,
      fromId,
      fromOut,
      toId,
      toIn,
      metadata: this._validateMetadata(metadata),
      status: 'primary',
      style: 'primary',
      createdAt: new Date().toISOString()
    };

    this.connections.set(connectionId, connection);
    this.metadata.set(connectionId, connection.metadata);
    this.connectionStatus.set(connectionId, 'primary');

    return connection;
  }

  /**
   * Remove a connection by ID
   * @param {string} connectionId - Connection ID to remove
   * @returns {boolean} - True if connection was removed
   */
  removeConnection(connectionId) {
    if (!this.connections.has(connectionId)) {
      return false;
    }

    this.connections.delete(connectionId);
    this.metadata.delete(connectionId);
    this.connectionStatus.delete(connectionId);
    this.domElements.delete(connectionId);

    return true;
  }

  /**
   * Retrieve a connection by ID
   * @param {string} connectionId - Connection ID
   * @returns {Object|null} - Connection object or null if not found
   */
  getConnection(connectionId) {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all connections matching a predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} - Array of matching connections
   */
  getConnectionsMeta(predicate = () => true) {
    const result = [];
    for (const connection of this.connections.values()) {
      if (predicate(connection)) {
        result.push({
          ...connection,
          metadata: this.metadata.get(connection.id)
        });
      }
    }
    return result;
  }

  /**
   * Apply style to a connection
   * @param {string} connectionId - Connection ID
   * @param {string|Object} style - Style name or custom style object
   * @returns {boolean} - True if successful
   */
  styleConnection(connectionId, style) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    if (typeof style === 'string') {
      const predefinedStyle = this.styles.get(style);
      if (!predefinedStyle) {
        throw new Error(`Style "${style}" not found`);
      }
      connection.style = style;
      connection.styleConfig = predefinedStyle;
    } else if (typeof style === 'object') {
      connection.styleConfig = style;
    }

    this._applyDOMStyle(connectionId, connection.styleConfig);
    return true;
  }

  /**
   * Set connection status with corresponding styling
   * @param {string} connectionId - Connection ID
   * @param {string} status - Status: 'primary', 'success', 'danger', 'warning'
   * @returns {boolean} - True if successful
   * @throws {Error} If status is invalid
   */
  setConnectionStatus(connectionId, status) {
    const validStatuses = ['primary', 'success', 'danger', 'warning'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.status = status;
    this.connectionStatus.set(connectionId, status);
    this.styleConnection(connectionId, status);

    return true;
  }

  /**
   * Refresh all connection styles from current configuration
   * @returns {number} - Number of connections refreshed
   */
  refreshConnectionStyles() {
    let count = 0;
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.style) {
        this.styleConnection(connectionId, connection.style);
        count++;
      }
    }
    return count;
  }

  /**
   * Paint multiple connections with style based on predicate
   * @param {Function} predicate - Filter function to select connections
   * @param {string|Object} style - Style to apply
   * @returns {number} - Number of connections painted
   */
  paintConnections(predicate, style) {
    let count = 0;
    for (const [connectionId, connection] of this.connections.entries()) {
      if (predicate(connection)) {
        if (this.styleConnection(connectionId, style)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Define a reusable connection style
   * @param {string} name - Style name
   * @param {Object} styleConfig - Style configuration with stroke, strokeWidth, strokeDasharray, color, label
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If config is invalid
   */
  defineStyle(name, styleConfig) {
    if (typeof styleConfig !== 'object') {
      throw new Error('Style config must be an object');
    }

    this.styles.set(name, {
      stroke: styleConfig.stroke || styleConfig.strokeColor || '#000',
      strokeWidth: styleConfig.strokeWidth || 2,
      strokeDasharray: styleConfig.strokeDasharray || 'none',
      color: styleConfig.color || styleConfig.strokeColor || '#000',
      label: styleConfig.label || null
    });

    return this;
  }

  /**
   * Get a defined style by name
   * @param {string} name - Style name
   * @returns {Object|null} - Style configuration or null if not found
   */
  getStyle(name) {
    return this.styles.get(name) || null;
  }

  /**
   * Get all defined style names
   * @returns {Array} - Array of style names
   */
  getStyleNames() {
    return Array.from(this.styles.keys());
  }

  /**
   * Set metadata for a connection
   * @param {string|number} connectionId - Connection ID
   * @param {Object} meta - Metadata object
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If metadata is invalid
   */
  setMetadata(connectionId, meta) {
    if (!this.connections.has(connectionId)) {
      throw new Error(`Connection "${connectionId}" not found`);
    }

    const validated = this._validateMetadata(meta);
    this.metadata.set(connectionId, validated);
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.metadata = validated;
    }

    return this;
  }

  /**
   * Get metadata for a connection
   * @param {string|number} connectionId - Connection ID
   * @returns {Object|null} - Metadata object or null if not found
   */
  getMetadata(connectionId) {
    return this.metadata.get(connectionId) || null;
  }

  /**
   * Get all metadata with optional filter
   * @param {Function} filter - Optional filter function
   * @returns {Array} - Array of metadata objects
   */
  getAllMetadata(filter = null) {
    const result = Array.from(this.metadata.values());
    return filter ? result.filter(filter) : result;
  }

  /**
   * Register a connection validator
   * @param {string} type - Connection type
   * @param {Function} validator - Validator function
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If validator is not a function
   */
  registerValidator(type, validator) {
    if (typeof validator !== 'function') {
      throw new Error('Validator must be a function');
    }
    this.validators.set(type, validator);
    return this;
  }

  /**
   * Validate a connection
   * @param {string} type - Connection type
   * @param {Object} connection - Connection object
   * @returns {Object} - Validation result with valid flag and errors array
   */
  validateConnection(type, connection) {
    const validator = this.validators.get(type);
    if (!validator) {
      return { valid: true, errors: [] };
    }

    try {
      return validator(connection);
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Create a connection builder for fluent API
   * @param {string|number} fromNodeId - Source node ID
   * @param {string} fromOutput - Output key
   * @returns {ConnectionBuilder} - Connection builder instance
   */
  createBuilder(fromNodeId, fromOutput) {
    return new ConnectionBuilder(fromNodeId, fromOutput, this);
  }

  /**
   * Validate connection metadata against schema
   * @private
   * @param {Object} meta - Metadata to validate
   * @returns {Object} - Validated metadata
   */
  _validateMetadata(meta) {
    return {
      type: meta.type || 'default',
      label: meta.label || '',
      description: meta.description || '',
      dataType: meta.dataType || 'any',
      required: meta.required || false,
      custom: meta.custom || {},
      tags: meta.tags || []
    };
  }

  /**
   * Apply DOM styles to a connection element
   * @private
   * @param {string} connectionId - Connection ID
   * @param {Object} styleConfig - Style configuration
   */
  _applyDOMStyle(connectionId, styleConfig) {
    if (!styleConfig) return;

    const element = this.domElements.get(connectionId);
    if (!element && typeof document !== 'undefined') {
      // Try to find element by connection ID
      const found = document.querySelector(`[data-connection-id="${connectionId}"]`);
      if (found) {
        this.domElements.set(connectionId, found);
      }
    }

    const el = this.domElements.get(connectionId);
    if (el) {
      if (styleConfig.stroke) {
        el.style.stroke = styleConfig.stroke;
      }
      if (styleConfig.strokeWidth) {
        el.style.strokeWidth = styleConfig.strokeWidth;
      }
      if (styleConfig.strokeDasharray && styleConfig.strokeDasharray !== 'none') {
        el.style.strokeDasharray = styleConfig.strokeDasharray;
      }
      if (styleConfig.label) {
        el.setAttribute('data-label', styleConfig.label);
      }
    }
  }
}

/**
 * Connection Builder class for fluent API
 * Provides chainable methods for building connections with metadata and styling
 */
class ConnectionBuilder {
  /**
   * Create a new connection builder
   * @param {string|number} fromNodeId - Source node ID
   * @param {string} fromOutput - Output key
   * @param {ConnectionManager} manager - Parent manager instance
   */
  constructor(fromNodeId, fromOutput, manager = null) {
    this.manager = manager;
    this.connection = {
      fromNodeId,
      fromOutput,
      toNodeId: null,
      toInput: null,
      style: 'primary',
      metadata: {}
    };
  }

  /**
   * Set target node and input
   * @param {string|number} nodeId - Target node ID
   * @param {string} input - Input key
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  to(nodeId, input) {
    this.connection.toNodeId = nodeId;
    this.connection.toInput = input;
    return this;
  }

  /**
   * Set connection style
   * @param {string} styleName - Style name
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withStyle(styleName) {
    this.connection.style = styleName;
    return this;
  }

  /**
   * Set connection type
   * @param {string} type - Connection type
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  ofType(type) {
    this.connection.metadata.type = type;
    return this;
  }

  /**
   * Set connection label
   * @param {string} label - Label text
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withLabel(label) {
    this.connection.metadata.label = label;
    return this;
  }

  /**
   * Set data type for the connection
   * @param {string} dataType - Data type (string, number, boolean, object, etc.)
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withDataType(dataType) {
    this.connection.metadata.dataType = dataType;
    return this;
  }

  /**
   * Mark connection as required
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  required() {
    this.connection.metadata.required = true;
    return this;
  }

  /**
   * Set connection status
   * @param {string} status - Status: 'primary', 'success', 'danger', 'warning'
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withStatus(status) {
    this.connection.status = status;
    return this;
  }

  /**
   * Add custom metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withMetadata(key, value) {
    this.connection.metadata[key] = value;
    return this;
  }

  /**
   * Add tags to the connection
   * @param {...string} tags - Tag values
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withTags(...tags) {
    this.connection.metadata.tags = tags;
    return this;
  }

  /**
   * Build the connection
   * @returns {Object} - Connection object
   * @throws {Error} If target node and input are not set
   */
  build() {
    if (!this.connection.toNodeId || !this.connection.toInput) {
      throw new Error('Target node and input are required. Use .to(nodeId, inputKey)');
    }
    return this.connection;
  }
}

export default ConnectionManager;
