/**
 * Connection Parser
 * Handles serialization, deserialization, and DOM parsing of connections
 */

/**
 * Metadata schema definition for validation
 */
const METADATA_SCHEMA = {
  type: { type: 'string', required: false, default: 'default' },
  label: { type: 'string', required: false, default: '' },
  description: { type: 'string', required: false, default: '' },
  dataType: { type: 'string', required: false, default: 'any' },
  required: { type: 'boolean', required: false, default: false },
  custom: { type: 'object', required: false, default: {} },
  tags: { type: 'array', required: false, default: [] }
};

/**
 * Connection Parser class
 * Provides utilities for parsing and validating connection metadata
 */
class ConnectionParser {
  /**
   * Parse metadata from a DOM element
   * @param {HTMLElement} element - DOM element with connection data attributes
   * @returns {Object} - Parsed metadata object
   */
  static parseConnectionMeta(element) {
    if (!element) {
      return null;
    }

    const meta = {
      type: element.getAttribute('data-connection-type') || 'default',
      label: element.getAttribute('data-connection-label') || '',
      description: element.getAttribute('data-connection-description') || '',
      dataType: element.getAttribute('data-connection-datatype') || 'any',
      required: element.getAttribute('data-required') === 'true',
      status: element.getAttribute('data-status') || 'primary',
      style: element.getAttribute('data-style') || 'primary',
      tags: this._parseTags(element.getAttribute('data-tags'))
    };

    // Parse custom data attributes (data-custom-*)
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-custom-')) {
        const key = attr.name.replace('data-custom-', '');
        try {
          meta.custom = meta.custom || {};
          meta.custom[key] = JSON.parse(attr.value);
        } catch {
          meta.custom = meta.custom || {};
          meta.custom[key] = attr.value;
        }
      }
    });

    return meta;
  }

  /**
   * Parse connection data from JSON format
   * @param {Object} json - JSON data from serialized connection
   * @returns {Object} - Parsed connection object
   * @throws {Error} If JSON structure is invalid
   */
  static parseConnectionData(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON: must be an object');
    }

    const required = ['id', 'fromId', 'fromOut', 'toId', 'toIn'];
    for (const field of required) {
      if (!(field in json)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      id: String(json.id),
      fromId: String(json.fromId),
      fromOut: String(json.fromOut),
      toId: String(json.toId),
      toIn: String(json.toIn),
      metadata: this.validateMetadata(json.metadata || {}),
      status: json.status || 'primary',
      style: json.style || 'primary',
      createdAt: json.createdAt || new Date().toISOString(),
      updatedAt: json.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Build a CSS class string for connection styling based on metadata
   * @param {Object} meta - Connection metadata
   * @returns {string} - CSS class string
   */
  static buildConnectionClass(meta) {
    const classes = ['connection'];

    if (meta.type) {
      classes.push(`connection-type-${this._sanitizeClass(meta.type)}`);
    }

    if (meta.status) {
      classes.push(`connection-status-${this._sanitizeClass(meta.status)}`);
    }

    if (meta.dataType && meta.dataType !== 'any') {
      classes.push(`connection-data-${this._sanitizeClass(meta.dataType)}`);
    }

    if (meta.required) {
      classes.push('connection-required');
    }

    if (meta.tags && Array.isArray(meta.tags)) {
      meta.tags.forEach(tag => {
        classes.push(`connection-tag-${this._sanitizeClass(tag)}`);
      });
    }

    return classes.join(' ');
  }

  /**
   * Validate metadata against schema
   * @param {Object} meta - Metadata to validate
   * @returns {Object} - Validated metadata with defaults applied
   */
  static validateMetadata(meta) {
    if (!meta || typeof meta !== 'object') {
      meta = {};
    }

    const validated = {};

    Object.entries(METADATA_SCHEMA).forEach(([key, schema]) => {
      const value = meta[key];

      if (value === undefined || value === null) {
        validated[key] = (typeof schema.default === 'object' && schema.default !== null) ? JSON.parse(JSON.stringify(schema.default)) : schema.default;
        return;
      }

      // Type validation
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      if (valueType !== schema.type) {
        validated[key] = (typeof schema.default === 'object' && schema.default !== null) ? JSON.parse(JSON.stringify(schema.default)) : schema.default;
        return;
      }

      validated[key] = value;
    });

    // Preserve any custom properties not in schema
    Object.entries(meta).forEach(([key, value]) => {
      if (!(key in METADATA_SCHEMA)) {
        if (!validated.custom) {
          validated.custom = {};
        }
        validated.custom[key] = value;
      }
    });

    return validated;
  }

  /**
   * Serialize connection to JSON
   * @param {Object} connection - Connection object
   * @returns {string} - JSON string
   */
  static serialize(connection) {
    return JSON.stringify(connection, null, 2);
  }

  /**
   * Deserialize connection from JSON string
   * @param {string} jsonString - JSON string
   * @returns {Object} - Connection object
   * @throws {Error} If JSON is invalid
   */
  static deserialize(jsonString) {
    try {
      const json = JSON.parse(jsonString);
      return this.parseConnectionData(json);
    } catch (error) {
      throw new Error(`Failed to deserialize connection: ${error.message}`);
    }
  }

  /**
   * Parse tags from comma-separated string
   * @private
   * @param {string} tagString - Comma-separated tags
   * @returns {Array} - Array of tags
   */
  static _parseTags(tagString) {
    if (!tagString) {
      return [];
    }
    return tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * Sanitize string for use as CSS class name
   * @private
   * @param {string} value - String to sanitize
   * @returns {string} - Sanitized string
   */
  static _sanitizeClass(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract all connections from a Drawflow export
   * @param {Object} drawflowData - Drawflow exported data
   * @returns {Array} - Array of connection objects
   */
  static extractConnectionsFromDrawflow(drawflowData) {
    const connections = [];

    if (!drawflowData || !drawflowData.drawflow) {
      return connections;
    }

    Object.values(drawflowData.drawflow).forEach(flow => {
      if (!flow.connections) {
        return;
      }

      Object.values(flow.connections).forEach(connection => {
        connections.push({
          fromId: connection.source_node,
          fromOut: connection.source_output,
          toId: connection.target_node,
          toIn: connection.target_input,
          id: `${connection.source_node}_${connection.source_output}_${connection.target_node}_${connection.target_input}`
        });
      });
    });

    return connections;
  }

  /**
   * Validate connection structure
   * @param {Object} connection - Connection to validate
   * @returns {Object} - Validation result with valid flag and errors array
   */
  static validateConnection(connection) {
    const errors = [];

    if (!connection.fromId) {
      errors.push('Missing fromId');
    }
    if (!connection.fromOut) {
      errors.push('Missing fromOut');
    }
    if (!connection.toId) {
      errors.push('Missing toId');
    }
    if (!connection.toIn) {
      errors.push('Missing toIn');
    }

    // Check for self-connection (usually invalid)
    if (connection.fromId === connection.toId) {
      errors.push('Self-connections are not allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get schema definition
   * @returns {Object} - Metadata schema
   */
  static getSchema() {
    return { ...METADATA_SCHEMA };
  }
}

export default ConnectionParser;
