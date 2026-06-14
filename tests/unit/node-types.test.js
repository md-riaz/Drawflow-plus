/**
 * Unit Tests for Node Type System
 * Comprehensive test suite covering registration, validation, creation, and updates
 */

import NodeTypeSystem from '../../src/extensions/node-types/index.js';
import {
  InputNodeType,
  OutputNodeType,
  ProcessNodeType,
  DecisionNodeType,
  SwitchNodeType,
  IVRNodeType,
  RingGroupNodeType,
  ExtensionNodeType,
  QueueNodeType,
  registerBuiltInTypes,
  validateField,
  normalizeConfig,
  mergeFieldDefaults
} from '../../src/extensions/node-types/definitions.js';

describe('NodeTypeSystem', () => {
  let system;

  beforeEach(() => {
    system = new NodeTypeSystem();
  });

  describe('Constructor and Options', () => {
    test('should create instance with default options', () => {
      const sys = new NodeTypeSystem();
      expect(sys.options.strict).toBe(true);
      expect(sys.options.autoNormalize).toBe(true);
    });

    test('should accept custom options', () => {
      const sys = new NodeTypeSystem({
        strict: false,
        onTypeRegistered: jest.fn()
      });
      expect(sys.options.strict).toBe(false);
      expect(typeof sys.options.onTypeRegistered).toBe('function');
    });
  });

  describe('register()', () => {
    test('should register a node type with valid definition', () => {
      const definition = {
        label: 'Test Node',
        description: 'A test node',
        inputs: { input: { label: 'Input' } },
        outputs: { output: { label: 'Output' } },
        fields: {}
      };

      system.register('test', definition);
      expect(system.get('test')).not.toBeNull();
    });

    test('should throw error if id is invalid', () => {
      expect(() => {
        system.register('', { label: 'Test' });
      }).toThrow('Node type id must be a non-empty string');

      expect(() => {
        system.register(null, { label: 'Test' });
      }).toThrow('Node type id must be a non-empty string');
    });

    test('should throw error if definition is invalid', () => {
      expect(() => {
        system.register('test', null);
      }).toThrow('Node type definition must be an object');

      expect(() => {
        system.register('test', {});
      }).toThrow('Node type "test" must have a label');
    });

    test('should throw error if label is missing', () => {
      expect(() => {
        system.register('test', { description: 'No label' });
      }).toThrow('Node type "test" must have a label');
    });

    test('should normalize definition with defaults', () => {
      system.register('test', { label: 'Test' });
      const def = system.get('test');

      expect(def.id).toBe('test');
      expect(def.version).toBe('1.0.0');
      expect(def.category).toBe('general');
      expect(def.inputs).toEqual({});
      expect(def.outputs).toEqual({});
    });

    test('should call onTypeRegistered callback', () => {
      const callback = jest.fn();
      const sys = new NodeTypeSystem({ onTypeRegistered: callback });

      sys.register('test', { label: 'Test' });
      expect(callback).toHaveBeenCalledWith('test', expect.any(Object));
    });

    test('should support method chaining', () => {
      const result = system
        .register('type1', { label: 'Type 1' })
        .register('type2', { label: 'Type 2' });

      expect(result).toBe(system);
      expect(system.get('type1')).not.toBeNull();
      expect(system.get('type2')).not.toBeNull();
    });

    test('should register custom validator', () => {
      const validator = jest.fn();
      system.register('test', {
        label: 'Test',
        validator
      });

      expect(system.validators.has('test')).toBe(true);
    });
  });

  describe('get()', () => {
    test('should return registered type', () => {
      const def = { label: 'Test' };
      system.register('test', def);
      const result = system.get('test');

      expect(result).not.toBeNull();
      expect(result.label).toBe('Test');
    });

    test('should return null for unregistered type', () => {
      const result = system.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAll()', () => {
    test('should return empty array for empty registry', () => {
      const result = system.getAll();
      expect(result).toEqual([]);
    });

    test('should return all registered types', () => {
      system.register('type1', { label: 'Type 1' });
      system.register('type2', { label: 'Type 2' });

      const result = system.getAll();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('type1');
      expect(result[1].id).toBe('type2');
    });

    test('should return objects with id and definition', () => {
      system.register('test', { label: 'Test' });
      const [item] = system.getAll();

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('definition');
      expect(item.id).toBe('test');
      expect(item.definition.label).toBe('Test');
    });
  });

  describe('unregister()', () => {
    test('should remove registered type', () => {
      system.register('test', { label: 'Test' });
      const result = system.unregister('test');

      expect(result).toBe(true);
      expect(system.get('test')).toBeNull();
    });

    test('should return false for unregistered type', () => {
      const result = system.unregister('nonexistent');
      expect(result).toBe(false);
    });

    test('should remove associated validator', () => {
      const validator = jest.fn();
      system.register('test', { label: 'Test', validator });

      expect(system.validators.has('test')).toBe(true);
      system.unregister('test');
      expect(system.validators.has('test')).toBe(false);
    });
  });

  describe('validate()', () => {
    beforeEach(() => {
      system.register('test', {
        label: 'Test Node',
        fields: {
          name: { label: 'Name', type: 'string', required: true },
          count: { label: 'Count', type: 'number', required: false }
        }
      });
    });

    test('should validate required fields', () => {
      const result = system.validate('test', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "name" is required');
    });

    test('should pass when required fields present', () => {
      const result = system.validate('test', { name: 'Test' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should validate field types', () => {
      const result = system.validate('test', {
        name: 'Test',
        count: 'not a number'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type number'))).toBe(true);
    });

    test('should return error for non-existent type', () => {
      const result = system.validate('nonexistent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not found');
    });

    test('should apply custom field validation', () => {
      system.register('email', {
        label: 'Email Node',
        fields: {
          email: {
            label: 'Email',
            type: 'string',
            required: true,
            validate: (value) => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return 'Invalid email format';
              }
              return null;
            }
          }
        }
      });

      const result = system.validate('email', { email: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid email format');
    });

    test('should run custom validator function', () => {
      const customValidator = jest.fn(() => ({
        valid: false,
        errors: ['Custom error']
      }));

      system.register('custom', {
        label: 'Custom Node',
        validator: customValidator
      });

      const result = system.validate('custom', { some: 'config' });
      expect(customValidator).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Custom error');
    });

    test('should validate conditional fields (dependsOn)', () => {
      system.register('conditional', {
        label: 'Conditional Node',
        fields: {
          type: { label: 'Type', type: 'string', required: true },
          apiKey: {
            label: 'API Key',
            type: 'string',
            required: true,
            dependsOn: { field: 'type', value: 'api' }
          }
        }
      });

      const result1 = system.validate('conditional', {
        type: 'api'
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('apiKey'))).toBe(true);

      const result2 = system.validate('conditional', {
        type: 'local'
      });
      expect(result2.valid).toBe(true);
    });
  });

  describe('createNode()', () => {
    beforeEach(() => {
      system.register('basic', {
        label: 'Basic Node',
        inputs: { in: { label: 'Input' } },
        outputs: { out: { label: 'Output' } },
        fields: {
          name: { label: 'Name', type: 'string', required: true }
        }
      });
    });

    test('should create node with valid config', () => {
      const node = system.createNode('basic', { name: 'Test' }, { x: 0, y: 0 });

      expect(node).not.toBeNull();
      expect(node.id).toBeDefined();
      expect(node.typeId).toBe('basic');
      expect(node.config.name).toBe('Test');
      expect(node.position).toEqual({ x: 0, y: 0 });
    });

    test('should generate unique node IDs', () => {
      const node1 = system.createNode('basic', { name: 'Test1' });
      const node2 = system.createNode('basic', { name: 'Test2' });

      expect(node1.id).not.toBe(node2.id);
    });

    test('should include metadata with createdAt', () => {
      const node = system.createNode('basic', { name: 'Test' });

      expect(node.metadata).toBeDefined();
      expect(node.metadata.createdAt).toBeDefined();
      expect(typeof node.metadata.createdAt).toBe('number');
    });

    test('should copy outputs from definition', () => {
      const node = system.createNode('basic', { name: 'Test' });

      expect(node.outputs).toEqual({ out: { label: 'Output' } });
    });

    test('should compute dynamic outputs if computeOutputs provided', () => {
      system.register('dynamic', {
        label: 'Dynamic Node',
        outputs: {},
        computeOutputs: (config) => {
          const outputs = {};
          if (config.count) {
            for (let i = 0; i < config.count; i++) {
              outputs[`out_${i}`] = { label: `Output ${i}` };
            }
          }
          return outputs;
        },
        fields: { count: { label: 'Count', type: 'number' } }
      });

      const node = system.createNode('dynamic', { count: 3 });
      expect(node.outputs).toEqual({
        out_0: { label: 'Output 0' },
        out_1: { label: 'Output 1' },
        out_2: { label: 'Output 2' }
      });
    });

    test('should throw error for invalid type in strict mode', () => {
      const sys = new NodeTypeSystem({ strict: true });
      expect(() => {
        sys.createNode('nonexistent', {});
      }).toThrow('Cannot create node: type "nonexistent" not found');
    });

    test('should return null for invalid type in non-strict mode', () => {
      const sys = new NodeTypeSystem({ strict: false });
      const result = sys.createNode('nonexistent', {});
      expect(result).toBeNull();
    });

    test('should call onNodeCreated callback', () => {
      const callback = jest.fn();
      const sys = new NodeTypeSystem({ onNodeCreated: callback });
      sys.register('basic', {
        label: 'Basic',
        fields: { name: { required: true } }
      });

      sys.createNode('basic', { name: 'Test' });
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        typeId: 'basic',
        config: { name: 'Test' }
      }));
    });

    test('should store node instance', () => {
      const node = system.createNode('basic', { name: 'Test' });
      const stored = system.getNodeInstance(node.id);

      expect(stored).not.toBeNull();
      expect(stored.id).toBe(node.id);
    });
  });

  describe('updateNodeConfig()', () => {
    let nodeId;

    beforeEach(() => {
      system.register('test', {
        label: 'Test',
        fields: {
          name: { label: 'Name', type: 'string' },
          count: { label: 'Count', type: 'number' }
        }
      });

      const node = system.createNode('test', { name: 'Original' });
      nodeId = node.id;
    });

    test('should update node config', () => {
      const updated = system.updateNodeConfig(nodeId, { count: 5 });

      expect(updated.config.name).toBe('Original');
      expect(updated.config.count).toBe(5);
    });

    test('should merge config by default', () => {
      const updated = system.updateNodeConfig(nodeId, { count: 5 }, { merge: true });

      expect(updated.config.name).toBe('Original');
      expect(updated.config.count).toBe(5);
    });

    test('should replace config if merge is false', () => {
      const updated = system.updateNodeConfig(
        nodeId,
        { count: 5 },
        { merge: false }
      );

      expect(updated.config.name).toBeUndefined();
      expect(updated.config.count).toBe(5);
    });

    test('should validate before update if enabled', () => {
      system.register('validated', {
        label: 'Validated',
        fields: {
          email: {
            label: 'Email',
            required: true,
            validate: (v) => /^[^\s@]+@/.test(v) ? null : 'Invalid email'
          }
        }
      });

      const node = system.createNode('validated', { email: 'test@example.com' });
      expect(() => {
        system.updateNodeConfig(node.id, { email: 'invalid' });
      }).toThrow('Config update validation failed');
    });

    test('should skip validation if validate is false', () => {
      const node = system.createNode('test', { name: 'Test' });
      expect(() => {
        system.updateNodeConfig(node.id, { invalid: true }, { validate: false });
      }).not.toThrow();
    });

    test('should call onChange callback', () => {
      const onChange = jest.fn();
      system.updateNodeConfig(
        nodeId,
        { count: 5 },
        { onChange }
      );

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        nodeId,
        oldConfig: { name: 'Original' },
        newConfig: { name: 'Original', count: 5 },
        changes: expect.any(Object)
      }));
    });

    test('should track changes in detail', () => {
      const node = system.createNode('test', {
        name: 'Original',
        count: 1
      });

      const onChange = jest.fn();
      system.updateNodeConfig(
        node.id,
        { name: 'Updated', extra: 'added' },
        { onChange }
      );

      const call = onChange.mock.calls[0][0];
      expect(call.changes.modified).toHaveProperty('name');
      expect(call.changes.added).toHaveProperty('extra');
    });

    test('should notify registered listeners', () => {
      const listener = jest.fn();
      system.onNodeChange(nodeId, listener);

      system.updateNodeConfig(nodeId, { count: 5 });

      expect(listener).toHaveBeenCalled();
    });

    test('should throw error for non-existent node', () => {
      expect(() => {
        system.updateNodeConfig('nonexistent', { name: 'Test' });
      }).toThrow('Node instance "nonexistent" not found');
    });

    test('should recompute outputs if computeOutputs exists', () => {
      system.register('dynamic', {
        label: 'Dynamic',
        outputs: {},
        computeOutputs: (config) => {
          const outputs = {};
          if (config.count) {
            for (let i = 0; i < config.count; i++) {
              outputs[`out_${i}`] = { label: `Output ${i}` };
            }
          }
          return outputs;
        },
        fields: { count: { label: 'Count', type: 'number' } }
      });

      const node = system.createNode('dynamic', { count: 2 });
      expect(Object.keys(node.outputs)).toHaveLength(2);

      system.updateNodeConfig(node.id, { count: 4 });
      const updated = system.getNodeInstance(node.id);
      expect(Object.keys(updated.outputs)).toHaveLength(4);
    });
  });

  describe('getFieldState()', () => {
    beforeEach(() => {
      system.register('conditional', {
        label: 'Conditional',
        fields: {
          visible: { label: 'Visible', type: 'string' },
          hidden: { label: 'Hidden', hidden: true },
          disabled: { label: 'Disabled', disabled: true },
          conditional: {
            label: 'Conditional',
            dependsOn: { field: 'type', value: 'api' }
          }
        }
      });
    });

    test('should return visible and enabled for normal fields', () => {
      const state = system.getFieldState('conditional', {}, 'visible');
      expect(state.visible).toBe(true);
      expect(state.disabled).toBe(false);
    });

    test('should mark hidden fields as invisible', () => {
      const state = system.getFieldState('conditional', {}, 'hidden');
      expect(state.visible).toBe(false);
    });

    test('should mark disabled fields', () => {
      const state = system.getFieldState('conditional', {}, 'disabled');
      expect(state.disabled).toBe(true);
    });

    test('should respect dependsOn conditions', () => {
      const state1 = system.getFieldState('conditional', { type: 'api' }, 'conditional');
      expect(state1.visible).toBe(true);

      const state2 = system.getFieldState('conditional', { type: 'local' }, 'conditional');
      expect(state2.visible).toBe(false);
    });
  });

  describe('onNodeChange()', () => {
    test('should register change listener', () => {
      const listener = jest.fn();
      system.register('test', {
        label: 'Test',
        fields: { name: { label: 'Name' } }
      });

      const node = system.createNode('test', {});
      const unsubscribe = system.onNodeChange(node.id, listener);

      system.updateNodeConfig(node.id, { name: 'Updated' });
      expect(listener).toHaveBeenCalled();
    });

    test('should return unsubscribe function', () => {
      const listener = jest.fn();
      system.register('test', {
        label: 'Test',
        fields: { name: { label: 'Name' } }
      });

      const node = system.createNode('test', {});
      const unsubscribe = system.onNodeChange(node.id, listener);

      system.updateNodeConfig(node.id, { name: 'First' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      system.updateNodeConfig(node.id, { name: 'Second' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      system.register('test', {
        label: 'Test',
        fields: { name: { label: 'Name' } }
      });

      const node = system.createNode('test', {});
      system.onNodeChange(node.id, listener1);
      system.onNodeChange(node.id, listener2);

      system.updateNodeConfig(node.id, { name: 'Updated' });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Built-in Type Definitions', () => {
    test('InputNodeType should be valid', () => {
      system.register('input', InputNodeType);
      expect(system.get('input')).not.toBeNull();
    });

    test('OutputNodeType should be valid', () => {
      system.register('output', OutputNodeType);
      expect(system.get('output')).not.toBeNull();
    });

    test('ProcessNodeType should be valid', () => {
      system.register('process', ProcessNodeType);
      expect(system.get('process')).not.toBeNull();
    });

    test('DecisionNodeType should be valid', () => {
      system.register('decision', DecisionNodeType);
      expect(system.get('decision')).not.toBeNull();
    });

    test('SwitchNodeType should compute outputs dynamically', () => {
      system.register('switch', SwitchNodeType);
      const node = system.createNode('switch', {
        name: 'Switch',
        variable: 'status',
        cases: [
          { label: 'Case 1', value: 'val1' },
          { label: 'Case 2', value: 'val2' }
        ]
      });

      expect(node.outputs).toHaveProperty('case_0');
      expect(node.outputs).toHaveProperty('case_1');
      expect(node.outputs).toHaveProperty('default');
    });

    test('IVRNodeType should compute menu outputs', () => {
      system.register('ivr', IVRNodeType);
      const node = system.createNode('ivr', {
        name: 'IVR',
        prompt: 'https://example.com/prompt.mp3',
        menuItems: [
          { key: '1', label: 'Sales' },
          { key: '2', label: 'Support' }
        ],
        timeout: 30
      });

      expect(node.outputs).toHaveProperty('option_1');
      expect(node.outputs).toHaveProperty('option_2');
      expect(node.outputs).toHaveProperty('timeout');
      expect(node.outputs).toHaveProperty('invalid');
    });

    test('RingGroupNodeType should validate ring settings', () => {
      system.register('ringgroup', RingGroupNodeType);
      const result = system.validate('ringgroup', {
        name: 'Group',
        extensions: [],
        ringTimeout: 1,
        ringType: 'simultaneous'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('At least one extension'))).toBe(true);
      expect(result.errors.some(e => e.includes('between 5 and 300'))).toBe(true);
    });

    test('ExtensionNodeType should validate extension format', () => {
      system.register('extension', ExtensionNodeType);

      const result1 = system.validate('extension', {
        name: 'Ext',
        extensionNumber: '1',
        timeout: 30
      });
      expect(result1.valid).toBe(false);

      const result2 = system.validate('extension', {
        name: 'Ext',
        extensionNumber: '123',
        timeout: 30
      });
      expect(result2.valid).toBe(true);
    });

    test('QueueNodeType should validate queue settings', () => {
      system.register('queue', QueueNodeType);
      const result = system.validate('queue', {
        name: 'Queue',
        queueId: 'sales_queue',
        timeout: 5
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('between 10 and 3600'))).toBe(true);
    });
  });

  describe('registerBuiltInTypes()', () => {
    test('should register all built-in types', () => {
      registerBuiltInTypes(system);
      const all = system.getAll();

      expect(all.length).toBeGreaterThanOrEqual(8);
      expect(system.get('input')).not.toBeNull();
      expect(system.get('output')).not.toBeNull();
      expect(system.get('ivr')).not.toBeNull();
    });
  });

  describe('Helper Functions', () => {
    test('validateField should validate field value', () => {
      const fieldDef = {
        label: 'Email',
        type: 'string',
        required: true,
        validate: (value) => {
          if (!value.includes('@')) return 'Invalid email';
          return null;
        }
      };

      expect(validateField('test@example.com', fieldDef)).toBeNull();
      expect(validateField('invalid', fieldDef)).toBe('Invalid email');
    });

    test('normalizeConfig should convert string numbers', () => {
      const config = { count: '42', name: 'Test', flag: '1' };
      const normalized = normalizeConfig(config);

      expect(normalized.count).toBe(42);
      expect(typeof normalized.count).toBe('number');
      expect(normalized.name).toBe('Test');
    });

    test('mergeFieldDefaults should apply defaults', () => {
      const fields = {
        name: { label: 'Name' },
        count: { label: 'Count', required: true }
      };

      const merged = mergeFieldDefaults(fields);
      expect(merged.name.required).toBe(false);
      expect(merged.name.type).toBe('string');
      expect(merged.count.required).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle multiple validation errors', () => {
      system.register('multi', {
        label: 'Multi',
        fields: {
          name: { required: true },
          email: { required: true },
          count: { type: 'number' }
        }
      });

      const result = system.validate('multi', {
        count: 'invalid'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle circular dependsOn gracefully', () => {
      system.register('test', {
        label: 'Test',
        fields: {
          a: { label: 'A', dependsOn: { field: 'b', value: 'val' } },
          b: { label: 'B', dependsOn: { field: 'a', value: 'val' } }
        }
      });

      expect(() => {
        system.validate('test', {});
      }).not.toThrow();
    });

    test('should handle missing field definitions gracefully', () => {
      system.register('test', { label: 'Test', fields: {} });
      const result = system.validate('test', { unknown: 'value' });
      expect(result.valid).toBe(true);
    });

    test('should not mutate original config on merge', () => {
      system.register('test', {
        label: 'Test',
        fields: { name: { label: 'Name' } }
      });

      const original = { name: 'Original' };
      const node = system.createNode('test', original);

      system.updateNodeConfig(node.id, { count: 5 });

      expect(original).toEqual({ name: 'Original' });
    });
  });

  describe('Integration Tests', () => {
    test('complete workflow: register, create, validate, update', () => {
      system.register('workflow', {
        label: 'Workflow',
        inputs: { in: { label: 'Input' } },
        outputs: { out: { label: 'Output' } },
        fields: {
          name: { label: 'Name', type: 'string', required: true },
          timeout: { label: 'Timeout', type: 'number', required: true }
        },
        validator: (config) => {
          if (config.timeout < 0) {
            return { valid: false, errors: ['Timeout must be positive'] };
          }
          return { valid: true, errors: [] };
        }
      });

      // Create node
      const node = system.createNode('workflow', {
        name: 'MyWorkflow',
        timeout: 30
      });

      expect(node).toBeDefined();
      expect(node.config.name).toBe('MyWorkflow');

      // Update and listen
      const changes = [];
      system.onNodeChange(node.id, (change) => {
        changes.push(change);
      });

      system.updateNodeConfig(node.id, { timeout: 60 });
      expect(changes).toHaveLength(1);
      expect(changes[0].changes.modified.timeout.new).toBe(60);

      // Validate
      const invalid = system.validate('workflow', { name: 'Test', timeout: -1 });
      expect(invalid.valid).toBe(false);
    });
  });
});
