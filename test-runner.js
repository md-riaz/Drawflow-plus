/**
 * Simple Test Runner for Node Type System
 * Tests the core functionality without requiring Jest
 */

// Mock require for ES modules
const MODULE_CACHE = new Map();

function mockRequire(path) {
  if (MODULE_CACHE.has(path)) {
    return MODULE_CACHE.get(path);
  }
  console.log(`Mock require: ${path}`);
  return {};
}

// Simple test framework
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  describe(name, callback) {
    console.log(`\n${name}`);
    callback();
  }

  test(name, callback) {
    try {
      callback();
      console.log(`  ✓ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Value is null or undefined');
    }
  }

  summary() {
    console.log(`\n\n========================================`);
    console.log(`Tests passed: ${this.passed}`);
    console.log(`Tests failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);
    console.log(`========================================\n`);
    return this.failed === 0;
  }
}

// =====================
// Test Suite
// =====================

// Import the NodeTypeSystem class
const NodeTypeSystemCode = `
class NodeTypeSystem {
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

  register(id, definition) {
    if (!id || typeof id !== 'string') {
      throw new Error('Node type id must be a non-empty string');
    }
    if (typeof definition !== 'object' || definition === null) {
      throw new Error('Node type definition must be an object');
    }
    if (!definition.label) {
      throw new Error(\`Node type "\${id}" must have a label\`);
    }

    const normalizedDef = this._normalizeDefinition(id, definition);
    this.nodeTypes.set(id, normalizedDef);

    if (definition.validator) {
      this.validators.set(id, definition.validator);
    }

    if (this.options.onTypeRegistered) {
      this.options.onTypeRegistered(id, normalizedDef);
    }

    return this;
  }

  get(id) {
    return this.nodeTypes.get(id) || null;
  }

  getAll() {
    const result = [];
    for (const [id, definition] of this.nodeTypes.entries()) {
      result.push({ id, definition });
    }
    return result;
  }

  unregister(id) {
    const deleted = this.nodeTypes.delete(id);
    if (deleted) {
      this.validators.delete(id);
    }
    return deleted;
  }

  validate(typeId, config) {
    const errors = [];

    const definition = this.get(typeId);
    if (!definition) {
      return {
        valid: false,
        errors: [\`Node type "\${typeId}" not found\`]
      };
    }

    if (definition.fields) {
      for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
        if (fieldDef.required && !config[fieldName]) {
          errors.push(\`Field "\${fieldName}" is required\`);
        }

        if (config[fieldName] !== undefined && fieldDef.type) {
          if (typeof config[fieldName] !== fieldDef.type) {
            errors.push(
              \`Field "\${fieldName}" must be of type \${fieldDef.type}, got \${typeof config[fieldName]}\`
            );
          }
        }

        if (config[fieldName] !== undefined && fieldDef.validate) {
          const fieldError = fieldDef.validate(config[fieldName]);
          if (fieldError) {
            errors.push(\`Field "\${fieldName}": \${fieldError}\`);
          }
        }
      }
    }

    const customValidator = this.validators.get(typeId);
    if (customValidator) {
      const customResult = customValidator(config, definition);
      if (!customResult.valid) {
        errors.push(...(customResult.errors || []));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  createNode(typeId, config = {}, position = { x: 0, y: 0 }) {
    const definition = this.get(typeId);

    if (!definition) {
      const error = \`Cannot create node: type "\${typeId}" not found\`;
      if (this.options.strict) {
        throw new Error(error);
      }
      console.warn(error);
      return null;
    }

    const validation = this.validate(typeId, config);
    if (!validation.valid) {
      const error = \`Node validation failed: \${validation.errors.join('; ')}\`;
      if (this.options.strict) {
        throw new Error(error);
      }
      console.warn(error);
    }

    const nodeId = this._generateNodeId(typeId);

    let outputs = { ...definition.outputs };
    if (definition.computeOutputs && typeof definition.computeOutputs === 'function') {
      outputs = definition.computeOutputs(config, definition.outputs);
    }

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

    this.nodeInstances.set(nodeId, nodeInstance);

    if (!this.changeListeners.has(nodeId)) {
      this.changeListeners.set(nodeId, new Set());
    }

    if (this.options.onNodeCreated) {
      this.options.onNodeCreated(nodeInstance);
    }

    return nodeInstance;
  }

  updateNodeConfig(nodeId, newConfig, options = {}) {
    const {
      validate: shouldValidate = true,
      merge = true,
      onChange = null
    } = options;

    const nodeInstance = this.nodeInstances.get(nodeId);
    if (!nodeInstance) {
      throw new Error(\`Node instance "\${nodeId}" not found\`);
    }

    const updatedConfig = merge
      ? { ...nodeInstance.config, ...newConfig }
      : newConfig;

    if (shouldValidate) {
      const validation = this.validate(nodeInstance.typeId, updatedConfig);
      if (!validation.valid && this.options.strict) {
        throw new Error(\`Config update validation failed: \${validation.errors.join('; ')}\`);
      }
    }

    const oldConfig = { ...nodeInstance.config };
    nodeInstance.config = updatedConfig;

    const definition = this.get(nodeInstance.typeId);
    if (definition && definition.computeOutputs) {
      nodeInstance.outputs = definition.computeOutputs(updatedConfig, definition.outputs);
    }

    const changes = this._getConfigChanges(oldConfig, updatedConfig);

    if (onChange && typeof onChange === 'function') {
      onChange({
        nodeId,
        oldConfig,
        newConfig: updatedConfig,
        changes
      });
    }

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

  getNodeInstance(nodeId) {
    return this.nodeInstances.get(nodeId) || null;
  }

  onNodeChange(nodeId, callback) {
    if (!this.changeListeners.has(nodeId)) {
      this.changeListeners.set(nodeId, new Set());
    }

    const listeners = this.changeListeners.get(nodeId);
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  getFieldState(typeId, config, fieldName) {
    const definition = this.get(typeId);
    if (!definition || !definition.fields || !definition.fields[fieldName]) {
      return { visible: true, disabled: false };
    }

    const fieldDef = definition.fields[fieldName];
    let visible = true;
    let disabled = fieldDef.disabled || false;

    if (fieldDef.hidden) {
      visible = false;
    }

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

  _generateNodeId(typeId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return \`\${typeId}_\${timestamp}_\${random}\`;
  }

  _getConfigChanges(oldConfig, newConfig) {
    const added = {};
    const removed = {};
    const modified = {};

    for (const key in newConfig) {
      if (!(key in oldConfig)) {
        added[key] = newConfig[key];
      } else if (oldConfig[key] !== newConfig[key]) {
        modified[key] = {
          old: oldConfig[key],
          new: newConfig[key]
        };
      }
    }

    for (const key in oldConfig) {
      if (!(key in newConfig)) {
        removed[key] = oldConfig[key];
      }
    }

    return { added, removed, modified };
  }
}
`;

eval(NodeTypeSystemCode);

// Run tests
const runner = new TestRunner();

runner.describe('NodeTypeSystem', () => {
  let system;

  // Constructor and Options
  runner.test('should create instance with default options', () => {
    const sys = new NodeTypeSystem();
    runner.assert(sys.options.strict === true);
    runner.assert(sys.options.autoNormalize === true);
  });

  runner.test('should accept custom options', () => {
    const callback = () => {};
    const sys = new NodeTypeSystem({
      strict: false,
      onTypeRegistered: callback
    });
    runner.assert(sys.options.strict === false);
    runner.assert(typeof sys.options.onTypeRegistered === 'function');
  });

  // Register tests
  runner.test('should register a node type with valid definition', () => {
    system = new NodeTypeSystem();
    const definition = {
      label: 'Test Node',
      description: 'A test node',
      inputs: { input: { label: 'Input' } },
      outputs: { output: { label: 'Output' } },
      fields: {}
    };
    system.register('test', definition);
    runner.assertNotNull(system.get('test'));
  });

  runner.test('should throw error if id is invalid', () => {
    system = new NodeTypeSystem();
    try {
      system.register('', { label: 'Test' });
      throw new Error('Should have thrown');
    } catch (e) {
      runner.assert(e.message.includes('id must be'));
    }
  });

  runner.test('should throw error if label is missing', () => {
    system = new NodeTypeSystem();
    try {
      system.register('test', { description: 'No label' });
      throw new Error('Should have thrown');
    } catch (e) {
      runner.assert(e.message.includes('label'));
    }
  });

  // Get tests
  runner.test('should return registered type', () => {
    system = new NodeTypeSystem();
    system.register('test', { label: 'Test' });
    const result = system.get('test');
    runner.assertNotNull(result);
    runner.assertEqual(result.label, 'Test');
  });

  runner.test('should return null for unregistered type', () => {
    system = new NodeTypeSystem();
    const result = system.get('nonexistent');
    runner.assert(result === null);
  });

  // GetAll tests
  runner.test('should return all registered types', () => {
    system = new NodeTypeSystem();
    system.register('type1', { label: 'Type 1' });
    system.register('type2', { label: 'Type 2' });
    const result = system.getAll();
    runner.assertEqual(result.length, 2);
  });

  // Unregister tests
  runner.test('should remove registered type', () => {
    system = new NodeTypeSystem();
    system.register('test', { label: 'Test' });
    const result = system.unregister('test');
    runner.assert(result === true);
    runner.assert(system.get('test') === null);
  });

  // Validate tests
  runner.test('should validate required fields', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        name: { label: 'Name', type: 'string', required: true }
      }
    });
    const result = system.validate('test', {});
    runner.assert(result.valid === false);
    runner.assert(result.errors.length > 0);
  });

  runner.test('should pass validation when required fields present', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        name: { label: 'Name', type: 'string', required: true }
      }
    });
    const result = system.validate('test', { name: 'Test' });
    runner.assert(result.valid === true);
  });

  runner.test('should validate field types', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        count: { label: 'Count', type: 'number' }
      }
    });
    const result = system.validate('test', { count: 'not a number' });
    runner.assert(result.valid === false);
  });

  // CreateNode tests
  runner.test('should create node with valid config', () => {
    system = new NodeTypeSystem();
    system.register('basic', {
      label: 'Basic',
      outputs: { out: { label: 'Output' } },
      fields: {
        name: { label: 'Name', type: 'string', required: true }
      }
    });
    const node = system.createNode('basic', { name: 'Test' }, { x: 0, y: 0 });
    runner.assertNotNull(node);
    runner.assertEqual(node.typeId, 'basic');
  });

  runner.test('should generate unique node IDs', () => {
    system = new NodeTypeSystem();
    system.register('basic', { label: 'Basic' });
    const node1 = system.createNode('basic', {});
    const node2 = system.createNode('basic', {});
    runner.assert(node1.id !== node2.id);
  });

  runner.test('should include metadata with createdAt', () => {
    system = new NodeTypeSystem();
    system.register('basic', { label: 'Basic' });
    const node = system.createNode('basic', {});
    runner.assertNotNull(node.metadata);
    runner.assert(typeof node.metadata.createdAt === 'number');
  });

  runner.test('should compute dynamic outputs', () => {
    system = new NodeTypeSystem();
    system.register('dynamic', {
      label: 'Dynamic',
      outputs: {},
      computeOutputs: (config) => {
        const outputs = {};
        if (config.count) {
          for (let i = 0; i < config.count; i++) {
            outputs[\`out_\${i}\`] = { label: \`Output \${i}\` };
          }
        }
        return outputs;
      },
      fields: {}
    });
    const node = system.createNode('dynamic', { count: 3 });
    runner.assertEqual(Object.keys(node.outputs).length, 3);
  });

  // UpdateNodeConfig tests
  runner.test('should update node config', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        name: { label: 'Name' },
        count: { label: 'Count', type: 'number' }
      }
    });
    const node = system.createNode('test', { name: 'Original' });
    const updated = system.updateNodeConfig(node.id, { count: 5 });
    runner.assertEqual(updated.config.name, 'Original');
    runner.assertEqual(updated.config.count, 5);
  });

  runner.test('should call onChange callback', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: { name: { label: 'Name' } }
    });
    const node = system.createNode('test', { name: 'Original' });

    let changeCalled = false;
    const onChange = () => {
      changeCalled = true;
    };
    system.updateNodeConfig(node.id, { name: 'Updated' }, { onChange });
    runner.assert(changeCalled === true);
  });

  // GetFieldState tests
  runner.test('should return visible and enabled for normal fields', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        visible: { label: 'Visible' }
      }
    });
    const state = system.getFieldState('test', {}, 'visible');
    runner.assert(state.visible === true);
    runner.assert(state.disabled === false);
  });

  runner.test('should mark hidden fields as invisible', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {
        hidden: { label: 'Hidden', hidden: true }
      }
    });
    const state = system.getFieldState('test', {}, 'hidden');
    runner.assert(state.visible === false);
  });

  // OnNodeChange tests
  runner.test('should register change listener', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: { name: { label: 'Name' } }
    });
    const node = system.createNode('test', {});

    let listenerCalled = false;
    system.onNodeChange(node.id, () => {
      listenerCalled = true;
    });

    system.updateNodeConfig(node.id, { name: 'Updated' });
    runner.assert(listenerCalled === true);
  });

  runner.test('should return unsubscribe function', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: { name: { label: 'Name' } }
    });
    const node = system.createNode('test', {});

    let callCount = 0;
    const listener = () => callCount++;

    const unsubscribe = system.onNodeChange(node.id, listener);

    system.updateNodeConfig(node.id, { name: 'First' });
    runner.assertEqual(callCount, 1);

    unsubscribe();

    system.updateNodeConfig(node.id, { name: 'Second' });
    runner.assertEqual(callCount, 1);
  });

  // Method chaining
  runner.test('should support method chaining', () => {
    system = new NodeTypeSystem();
    const result = system
      .register('type1', { label: 'Type 1' })
      .register('type2', { label: 'Type 2' });
    runner.assert(result === system);
  });

  // Edge cases
  runner.test('should not mutate original config on merge', () => {
    system = new NodeTypeSystem();
    system.register('test', {
      label: 'Test',
      fields: {}
    });
    const original = { name: 'Original' };
    const node = system.createNode('test', original);
    system.updateNodeConfig(node.id, { count: 5 });
    runner.assertEqual(original.count, undefined);
  });

  runner.test('should handle missing node gracefully', () => {
    system = new NodeTypeSystem();
    try {
      system.updateNodeConfig('nonexistent', { name: 'Test' });
      throw new Error('Should have thrown');
    } catch (e) {
      runner.assert(e.message.includes('not found'));
    }
  });
});

// Print summary
const success = runner.summary();
process.exit(success ? 0 : 1);
