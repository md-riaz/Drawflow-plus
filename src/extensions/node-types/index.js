/**
 * Node Type System Extension
 * Manages custom node types, templates, validation, and dynamic outputs
 *
 * Provides a comprehensive system for:
 * - Registering and managing custom node types
 * - Validating node configurations
 * - Creating nodes with full validation
 * - Supporting dynamic outputs and conditional fields
 * - Tracking node metadata and lifecycle
 */

/**
 * NodeTypeSystem class
 * Manages node type registration, validation, and creation
 */
class NodeTypeSystem {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   * @param {boolean} options.strict - Enable strict mode (default: true)
   * @param {boolean} options.autoNormalize - Auto-normalize node schemas (default: true)
   * @param {Function} options.onTypeRegistered - Callback when type is registered
   * @param {Function} options.onNodeCreated - Callback when node is created
   */
  constructor(options = {}) {
    this.nodeTypes = new Map();
    this.templates = new Map();
    this.validators = new Map();
    this.nodeInstances = new Map();
    this.changeListeners = new Map();
    this.options = {
      strict: true,
      autoNormalize: true,
      onTypeRegistered: null,
      onNodeCreated: null,
      ...options
    };
  }

  /**
   * Install extension into DrawflowPlus instance
   * Adds methods to the DrawflowPlus instance
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Additional options
   */
  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };

    // Add methods to DrawflowPlus instance
    drawflowPlus.registerNodeType = this.register.bind(this);
    drawflowPlus.getNodeType = this.get.bind(this);
    drawflowPlus.getAllNodeTypes = this.getAll.bind(this);
    drawflowPlus.unregisterNodeType = this.unregister.bind(this);
    drawflowPlus.validateNodeConfig = this.validate.bind(this);
    drawflowPlus.createNode = this.createNode.bind(this);
    drawflowPlus.updateNodeConfig = this.updateNodeConfig.bind(this);
    drawflowPlus.getNodeInstance = this.getNodeInstance.bind(this);
  }

  /**
   * Register a new node type with optional normalization
   * @param {string} id - Unique node type identifier
   * @param {Object} definition - Node type definition
   * @param {string} definition.label - Human-readable label
   * @param {string} definition.description - Node type description
   * @param {Object} definition.inputs - Input configuration
   * @param {Object} definition.outputs - Output configuration (static or dynamic)
   * @param {Object} definition.fields - Configuration fields
   * @param {Function} definition.validator - Custom validation function
   * @param {Function} definition.computeOutputs - Function to dynamically compute outputs
   * @param {Function} definition.renderOutput - Custom output renderer
   * @returns {NodeTypeSystem} - Returns this for chaining
   * @throws {Error} - If id is invalid or definition is incomplete
   */
  register(id, definition) {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new Error('Node type id must be a non-empty string');
    }

    if (typeof definition !== 'object' || definition === null) {
      throw new Error('Node type definition must be an object');
    }

    // Check required fields
    if (!definition.label) {
      throw new Error(`Node type "${id}" must have a label`);
    }

    // Normalize and extend definition
    const normalizedDef = this._normalizeDefinition(id, definition);

    // Store the registered type
    this.nodeTypes.set(id, normalizedDef);

    // Register validator if provided
    if (definition.validator) {
      this.validators.set(id, definition.validator);
    }

    // Call registration callback
    if (this.options.onTypeRegistered) {
      this.options.onTypeRegistered(id, normalizedDef);
    }

    return this;
  }

  /**
   * Get a registered node type definition
   * @param {string} id - Node type identifier
   * @returns {Object|null} - Node type definition or null if not found
   */
  get(id) {
    return this.nodeTypes.get(id) || null;
  }

  /**
   * Get all registered node types
   * @returns {Array<{id: string, definition: Object}>} - Array of all registered types
   */
  getAll() {
    const result = [];
    for (const [id, definition] of this.nodeTypes.entries()) {
      result.push({ id, definition });
    }
    return result;
  }

  /**
   * Unregister a node type
   * @param {string} id - Node type identifier
   * @returns {boolean} - True if deleted
   */
  unregister(id) {
    const deleted = this.nodeTypes.delete(id);
    if (deleted) {
      this.validators.delete(id);
    }
    return deleted;
  }

  /**
   * Validate a node configuration against its type definition
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Node configuration to validate
   * @returns {Object} - Validation result {valid: boolean, errors: Array}
   */
  validate(typeId, config) {
    const safeConfig = config || {};
    const errors = [];

    // Check if type exists
    const definition = this.get(typeId);
    if (!definition) {
      return {
        valid: false,
        errors: [`Node type "${typeId}" not found`]
      };
    }

    // Validate required fields
    if (definition.fields) {
      for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
        if (fieldDef.required && !safeConfig[fieldName]) {
          errors.push(`Field "${fieldName}" is required`);
        }

        // Validate field type
        if (safeConfig[fieldName] !== undefined && fieldDef.type) {
          const fieldValue = safeConfig[fieldName];
          let typeError = false;
          if (fieldDef.type === 'array') {
            if (!Array.isArray(fieldValue)) {
              typeError = true;
            }
          } else if (typeof fieldValue !== fieldDef.type) {
            typeError = true;
          }
          if (typeError) {
            errors.push(
              `Field "${fieldName}" must be of type ${fieldDef.type}, got ${Array.isArray(fieldValue) ? 'array' : typeof fieldValue}`
            );
          }
        }

        // Apply field-level validation rules
        if (safeConfig[fieldName] !== undefined && fieldDef.validate) {
          const fieldError = fieldDef.validate(safeConfig[fieldName]);
          if (fieldError) {
            errors.push(`Field "${fieldName}": ${fieldError}`);
          }
        }

        // Check conditional visibility (dependsOn)
        if (fieldDef.dependsOn) {
          const dependency = fieldDef.dependsOn;
          if (dependency.field) {
            const depValue = safeConfig[dependency.field];
            const expectedValues = Array.isArray(dependency.value)
              ? dependency.value
              : [dependency.value];
            if (!expectedValues.includes(depValue)) {
              // Field should not be present if dependency not met
              if (safeConfig[fieldName] !== undefined && fieldDef.required) {
                errors.push(
                  `Field "${fieldName}" requires "${dependency.field}" to be ${expectedValues.join(' or ')}`
                );
              }
            }
          }
        }
      }
    }

    // Run custom validator if registered
    const customValidator = this.validators.get(typeId);
    if (customValidator) {
      const customResult = customValidator(safeConfig, definition);
      if (!customResult.valid) {
        errors.push(...(customResult.errors || []));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new node with full validation
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Node configuration
   * @param {Object} position - Node position {x: number, y: number}
   * @returns {Object} - Created node instance {id, typeId, config, outputs, position}
   * @throws {Error} - If validation fails and strict mode is enabled
   */
  createNode(typeId, config = {}, position = { x: 0, y: 0 }) {
    const definition = this.get(typeId);

    if (!definition) {
      const error = `Cannot create node: type "${typeId}" not found`;
      if (this.options.strict) {
        throw new Error(error);
      }
      console.warn(error);
      return null;
    }

    // Validate config
    const validation = this.validate(typeId, config);
    if (!validation.valid) {
      const error = `Node validation failed: ${validation.errors.join('; ')}`;
      if (this.options.strict) {
        throw new Error(error);
      }
      console.warn(error);
    }

    // Generate unique node ID
    const nodeId = this._generateNodeId(typeId);

    // Compute outputs (dynamic or static)
    let outputs = { ...definition.outputs };
    if (definition.computeOutputs && typeof definition.computeOutputs === 'function') {
      outputs = definition.computeOutputs(config, definition.outputs);
    }

    // Create node instance
    const nodeInstance = {
      id: nodeId,
      typeId,
      config,
      outputs,
      position,
      metadata: {
        createdAt: Date.now(),
        version: definition.version || '1.0.0'
      }
    };

    // Store instance
    this.nodeInstances.set(nodeId, nodeInstance);

    // Initialize change listeners map for this node
    if (!this.changeListeners.has(nodeId)) {
      this.changeListeners.set(nodeId, new Set());
    }

    // Call creation callback
    if (this.options.onNodeCreated) {
      this.options.onNodeCreated(nodeInstance);
    }

    return nodeInstance;
  }

  /**
   * Update node configuration with validation and change tracking
   * @param {string} nodeId - Node instance ID
   * @param {Object} newConfig - New configuration values
   * @param {Object} options - Update options
   * @param {boolean} options.validate - Whether to validate before updating (default: true)
   * @param {boolean} options.merge - Whether to merge with existing config (default: true)
   * @param {Function} options.onChange - Callback for config changes
   * @returns {Object} - Updated node instance or null if failed
   */
  updateNodeConfig(nodeId, newConfig, options = {}) {
    const {
      validate: shouldValidate = true,
      merge = true,
      onChange = null
    } = options;

    const nodeInstance = this.nodeInstances.get(nodeId);
    if (!nodeInstance) {
      throw new Error(`Node instance "${nodeId}" not found`);
    }

    // Prepare updated config
    const updatedConfig = merge
      ? { ...nodeInstance.config, ...newConfig }
      : newConfig;

    // Validate if needed
    if (shouldValidate) {
      const validation = this.validate(nodeInstance.typeId, updatedConfig);
      if (!validation.valid && this.options.strict) {
        throw new Error(`Config update validation failed: ${validation.errors.join('; ')}`);
      }
    }

    // Store old config for change tracking
    const oldConfig = { ...nodeInstance.config };

    // Update config
    nodeInstance.config = updatedConfig;

    // Recompute outputs if definition has computeOutputs
    const definition = this.get(nodeInstance.typeId);
    if (definition && definition.computeOutputs) {
      nodeInstance.outputs = definition.computeOutputs(updatedConfig, definition.outputs);
    }

    // Track changes
    const changes = this._getConfigChanges(oldConfig, updatedConfig);

    // Call onChange callback
    if (onChange && typeof onChange === 'function') {
      onChange({
        nodeId,
        oldConfig,
        newConfig: updatedConfig,
        changes
      });
    }

    // Notify registered listeners
    const listeners = this.changeListeners.get(nodeId);
    if (listeners && listeners.size > 0) {
      listeners.forEach(listener => {
        listener({
          nodeId,
          oldConfig,
          newConfig: updatedConfig,
          changes
        });
      });
    }

    return nodeInstance;
  }

  /**
   * Get a node instance by ID
   * @param {string} nodeId - Node instance ID
   * @returns {Object|null} - Node instance or null
   */
  getNodeInstance(nodeId) {
    return this.nodeInstances.get(nodeId) || null;
  }

  /**
   * Register a change listener for a node
   * @param {string} nodeId - Node instance ID
   * @param {Function} callback - Callback function (receives change object)
   * @returns {Function} - Unsubscribe function
   */
  onNodeChange(nodeId, callback) {
    if (!this.changeListeners.has(nodeId)) {
      this.changeListeners.set(nodeId, new Set());
    }

    const listeners = this.changeListeners.get(nodeId);
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Get field visibility state (considers conditional fields)
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Current node configuration
   * @param {string} fieldName - Field name to check
   * @returns {Object} - Field state {visible: boolean, disabled: boolean}
   */
  getFieldState(typeId, config, fieldName) {
    const definition = this.get(typeId);
    if (!definition || !definition.fields || !definition.fields[fieldName]) {
      return { visible: true, disabled: false };
    }

    const fieldDef = definition.fields[fieldName];
    let visible = true;
    let disabled = fieldDef.disabled || false;

    // Check hidden flag
    if (fieldDef.hidden) {
      visible = false;
    }

    // Check dependsOn condition
    if (fieldDef.dependsOn && fieldDef.dependsOn.field) {
      const dependency = fieldDef.dependsOn;
      const depValue = config[dependency.field];
      const expectedValues = Array.isArray(dependency.value)
        ? dependency.value
        : [dependency.value];

      if (!expectedValues.includes(depValue)) {
        visible = false;
      }
    }

    return { visible, disabled };
  }

  /**
   * Normalize node type definition (add defaults, etc.)
   * @private
   * @param {string} id - Node type ID
   * @param {Object} definition - Raw definition
   * @returns {Object} - Normalized definition
   */
  _normalizeDefinition(id, definition) {
    return {
      id,
      label: definition.label,
      description: definition.description || '',
      inputs: definition.inputs || {},
      outputs: definition.outputs || {},
      fields: definition.fields || {},
      version: definition.version || '1.0.0',
      icon: definition.icon || null,
      category: definition.category || 'general',
      computeOutputs: definition.computeOutputs || null,
      renderOutput: definition.renderOutput || null,
      validator: definition.validator || null,
      color: definition.color || '#3498db',
      ...definition
    };
  }

  /**
   * Generate unique node ID
   * @private
   * @param {string} typeId - Node type ID
   * @returns {string} - Generated node ID
   */
  _generateNodeId(typeId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${typeId}_${timestamp}_${random}`;
  }

  /**
   * Get differences between old and new config
   * @private
   * @param {Object} oldConfig - Old configuration
   * @param {Object} newConfig - New configuration
   * @returns {Object} - Changes object {added, removed, modified}
   */
  _getConfigChanges(oldConfig, newConfig) {
    const added = {};
    const removed = {};
    const modified = {};

    // Find added and modified
    for (const key in newConfig) {
      if (!(key in oldConfig)) {
        added[key] = newConfig[key];
      } else if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        modified[key] = {
          old: oldConfig[key],
          new: newConfig[key]
        };
      }
    }

    // Find removed
    for (const key in oldConfig) {
      if (!(key in newConfig)) {
        removed[key] = oldConfig[key];
      }
    }

    return { added, removed, modified };
  }
}

export default NodeTypeSystem;
