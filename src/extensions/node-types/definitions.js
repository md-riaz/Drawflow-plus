/**
 * Node Type Definitions
 * Pre-built node type definitions for common workflow patterns
 *
 * Includes:
 * - Basic node types (input, output, process, decision, switch)
 * - IVR (Interactive Voice Response) nodes
 * - Call routing nodes (RingGroup, Extension, Queue)
 * - Field validation utilities
 * - Schema normalization functions
 */

/**
 * Input Node Type
 * Represents start/input points in workflow
 */
export const InputNodeType = {
  id: 'input',
  label: 'Input',
  description: 'Workflow entry point',
  category: 'basic',
  icon: 'arrow-right',
  color: '#2ecc71',
  inputs: {},
  outputs: {
    output: { label: 'Output', type: 'default' }
  },
  fields: {
    name: {
      label: 'Input Name',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Name is required';
        if (value.length > 50) return 'Name must be less than 50 characters';
        return null;
      }
    },
    description: {
      label: 'Description',
      type: 'string',
      required: false
    }
  }
};

/**
 * Output Node Type
 * Represents end/output points in workflow
 */
export const OutputNodeType = {
  id: 'output',
  label: 'Output',
  description: 'Workflow exit point',
  category: 'basic',
  icon: 'arrow-right',
  color: '#e74c3c',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {},
  fields: {
    name: {
      label: 'Output Name',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Name is required';
        if (value.length > 50) return 'Name must be less than 50 characters';
        return null;
      }
    },
    result: {
      label: 'Result',
      type: 'string',
      required: false
    }
  }
};

/**
 * Process Node Type
 * Represents processing/action steps
 */
export const ProcessNodeType = {
  id: 'process',
  label: 'Process',
  description: 'Processing or action node',
  category: 'basic',
  icon: 'cogs',
  color: '#3498db',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {
    success: { label: 'Success', type: 'default' },
    error: { label: 'Error', type: 'default' }
  },
  fields: {
    name: {
      label: 'Process Name',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Name is required';
        return null;
      }
    },
    action: {
      label: 'Action Type',
      type: 'string',
      required: true,
      validate: (value) => {
        const valid = ['log', 'transform', 'fetch', 'script'];
        if (!valid.includes(value)) return `Must be one of: ${valid.join(', ')}`;
        return null;
      }
    },
    timeout: {
      label: 'Timeout (ms)',
      type: 'number',
      required: false,
      validate: (value) => {
        if (value && value < 0) return 'Timeout must be positive';
        return null;
      }
    }
  }
};

/**
 * Decision Node Type
 * Binary decision branching (if/else)
 */
export const DecisionNodeType = {
  id: 'decision',
  label: 'Decision',
  description: 'Conditional branching node',
  category: 'basic',
  icon: 'code-branch',
  color: '#f39c12',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {
    true: { label: 'True', type: 'default' },
    false: { label: 'False', type: 'default' }
  },
  fields: {
    name: {
      label: 'Decision Name',
      type: 'string',
      required: true
    },
    condition: {
      label: 'Condition',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Condition is required';
        return null;
      }
    },
    operator: {
      label: 'Operator',
      type: 'string',
      required: true,
      validate: (value) => {
        const valid = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'regex'];
        if (!valid.includes(value)) return `Invalid operator: ${value}`;
        return null;
      }
    },
    value: {
      label: 'Compare Value',
      type: 'string',
      required: true
    }
  }
};

/**
 * Switch Node Type
 * Multi-way branching (switch/case)
 */
export const SwitchNodeType = {
  id: 'switch',
  label: 'Switch',
  description: 'Multi-way branching node',
  category: 'basic',
  icon: 'random',
  color: '#9b59b6',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {},
  computeOutputs: (config) => {
    const outputs = {};
    if (config.cases && Array.isArray(config.cases)) {
      config.cases.forEach((caseItem, index) => {
        outputs[`case_${index}`] = {
          label: caseItem.label || `Case ${index + 1}`,
          type: 'default'
        };
      });
    }
    outputs.default = { label: 'Default', type: 'default' };
    return outputs;
  },
  fields: {
    name: {
      label: 'Switch Name',
      type: 'string',
      required: true
    },
    variable: {
      label: 'Variable to Switch',
      type: 'string',
      required: true
    },
    cases: {
      label: 'Cases',
      type: 'array',
      required: true,
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one case is required';
        }
        return null;
      }
    }
  }
};

/**
 * IVR Node Type
 * Interactive Voice Response for call handling
 */
export const IVRNodeType = {
  id: 'ivr',
  label: 'IVR',
  description: 'Interactive Voice Response menu',
  category: 'call',
  icon: 'phone',
  color: '#1abc9c',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {},
  computeOutputs: (config) => {
    const outputs = {};
    if (config.menuItems && Array.isArray(config.menuItems)) {
      config.menuItems.forEach((item) => {
        outputs[`option_${item.key}`] = {
          label: `Option ${item.key}`,
          type: 'default'
        };
      });
    }
    outputs.timeout = { label: 'Timeout', type: 'default' };
    outputs.invalid = { label: 'Invalid Input', type: 'default' };
    return outputs;
  },
  fields: {
    name: {
      label: 'IVR Name',
      type: 'string',
      required: true
    },
    prompt: {
      label: 'Audio Prompt URL',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Prompt URL is required';
        try {
          new URL(value);
        } catch (e) {
          return 'Invalid URL';
        }
        return null;
      }
    },
    menuItems: {
      label: 'Menu Items',
      type: 'array',
      required: true,
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one menu item is required';
        }
        return null;
      }
    },
    timeout: {
      label: 'Timeout (seconds)',
      type: 'number',
      required: true,
      validate: (value) => {
        if (value < 1 || value > 300) return 'Timeout must be between 1 and 300 seconds';
        return null;
      }
    },
    maxRetries: {
      label: 'Max Retries',
      type: 'number',
      required: false,
      validate: (value) => {
        if (value && (value < 0 || value > 10)) return 'Max retries must be between 0 and 10';
        return null;
      }
    }
  }
};

/**
 * RingGroup Node Type
 * Rings multiple extensions simultaneously
 */
export const RingGroupNodeType = {
  id: 'ringgroup',
  label: 'Ring Group',
  description: 'Ring multiple extensions',
  category: 'call',
  icon: 'users',
  color: '#34495e',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {
    answered: { label: 'Answered', type: 'default' },
    timeout: { label: 'Timeout', type: 'default' },
    busy: { label: 'Busy', type: 'default' }
  },
  fields: {
    name: {
      label: 'Ring Group Name',
      type: 'string',
      required: true
    },
    extensions: {
      label: 'Extensions',
      type: 'array',
      required: true,
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one extension is required';
        }
        return null;
      }
    },
    ringTimeout: {
      label: 'Ring Timeout (seconds)',
      type: 'number',
      required: true,
      validate: (value) => {
        if (value < 5 || value > 300) return 'Timeout must be between 5 and 300 seconds';
        return null;
      }
    },
    ringType: {
      label: 'Ring Type',
      type: 'string',
      required: true,
      validate: (value) => {
        const valid = ['simultaneous', 'sequential', 'weighted'];
        if (!valid.includes(value)) return `Must be one of: ${valid.join(', ')}`;
        return null;
      }
    },
    strategy: {
      label: 'Failover Strategy',
      type: 'string',
      required: false,
      validate: (value) => {
        if (value) {
          const valid = ['voicemail', 'queue', 'hangup'];
          if (!valid.includes(value)) return `Must be one of: ${valid.join(', ')}`;
        }
        return null;
      }
    }
  }
};

/**
 * Extension Node Type
 * Routes to a specific extension
 */
export const ExtensionNodeType = {
  id: 'extension',
  label: 'Extension',
  description: 'Route to extension',
  category: 'call',
  icon: 'phone-square',
  color: '#16a085',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {
    answered: { label: 'Answered', type: 'default' },
    unanswered: { label: 'Unanswered', type: 'default' }
  },
  fields: {
    name: {
      label: 'Extension Name',
      type: 'string',
      required: true
    },
    extensionNumber: {
      label: 'Extension Number',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || !/^\d{2,5}$/.test(value)) {
          return 'Extension must be 2-5 digits';
        }
        return null;
      }
    },
    timeout: {
      label: 'Ring Timeout (seconds)',
      type: 'number',
      required: true,
      validate: (value) => {
        if (value < 5 || value > 120) return 'Timeout must be between 5 and 120 seconds';
        return null;
      }
    },
    priority: {
      label: 'Priority',
      type: 'number',
      required: false,
      validate: (value) => {
        if (value && (value < 1 || value > 100)) return 'Priority must be between 1 and 100';
        return null;
      }
    }
  }
};

/**
 * Queue Node Type
 * Routes to agent queue
 */
export const QueueNodeType = {
  id: 'queue',
  label: 'Queue',
  description: 'Route to agent queue',
  category: 'call',
  icon: 'tasks',
  color: '#27ae60',
  inputs: {
    input: { label: 'Input', type: 'default' }
  },
  outputs: {
    answered: { label: 'Answered', type: 'default' },
    timeout: { label: 'Timeout', type: 'default' },
    abandoned: { label: 'Abandoned', type: 'default' }
  },
  fields: {
    name: {
      label: 'Queue Name',
      type: 'string',
      required: true
    },
    queueId: {
      label: 'Queue ID',
      type: 'string',
      required: true,
      validate: (value) => {
        if (!value || value.length === 0) return 'Queue ID is required';
        return null;
      }
    },
    timeout: {
      label: 'Wait Timeout (seconds)',
      type: 'number',
      required: true,
      validate: (value) => {
        if (value < 10 || value > 3600) return 'Timeout must be between 10 and 3600 seconds';
        return null;
      }
    },
    announcePosition: {
      label: 'Announce Position',
      type: 'boolean',
      required: false
    },
    music: {
      label: 'Music URL',
      type: 'string',
      required: false,
      validate: (value) => {
        if (value) {
          try {
            new URL(value);
          } catch (e) {
            return 'Invalid URL';
          }
        }
        return null;
      }
    }
  }
};

/**
 * All built-in node definitions
 */
export const BUILT_IN_TYPES = {
  input: InputNodeType,
  output: OutputNodeType,
  process: ProcessNodeType,
  decision: DecisionNodeType,
  switch: SwitchNodeType,
  ivr: IVRNodeType,
  ringgroup: RingGroupNodeType,
  extension: ExtensionNodeType,
  queue: QueueNodeType
};

/**
 * Register all built-in node types
 * @param {NodeTypeSystem} nodeTypeSystem - NodeTypeSystem instance
 */
export function registerBuiltInTypes(nodeTypeSystem) {
  for (const [id, definition] of Object.entries(BUILT_IN_TYPES)) {
    nodeTypeSystem.register(id, definition);
  }
}

/**
 * Validate a field value against field definition
 * @param {*} value - Field value to validate
 * @param {Object} fieldDef - Field definition
 * @returns {string|null} - Error message or null if valid
 */
export function validateField(value, fieldDef) {
  if (fieldDef.required && !value) {
    return `${fieldDef.label || 'Field'} is required`;
  }

  if (value !== undefined && fieldDef.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== fieldDef.type) {
      return `Expected ${fieldDef.type}, got ${actualType}`;
    }
  }

  if (fieldDef.validate && typeof fieldDef.validate === 'function') {
    return fieldDef.validate(value);
  }

  return null;
}

/**
 * Normalize a node configuration object
 * @param {Object} config - Raw configuration
 * @returns {Object} - Normalized configuration
 */
export function normalizeConfig(config) {
  const normalized = { ...config };

  // Convert string numbers to actual numbers where applicable
  for (const key in normalized) {
    const value = normalized[key];
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        normalized[key] = num;
      }
    }
  }

  return normalized;
}

/**
 * Merge field definitions with defaults
 * @param {Object} fields - Field definitions
 * @returns {Object} - Merged field definitions
 */
export function mergeFieldDefaults(fields) {
  const defaults = {
    required: false,
    type: 'string',
    validate: null,
    hidden: false,
    disabled: false,
    dependsOn: null
  };

  const merged = {};
  for (const [key, fieldDef] of Object.entries(fields)) {
    merged[key] = { ...defaults, ...fieldDef };
  }

  return merged;
}
