/**
 * Unit Tests for Connection Manager and Parser
 */

import ConnectionManager from '../../src/extensions/connections/index.js';
import ConnectionParser from '../../src/extensions/connections/parser.js';

describe('ConnectionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  describe('constructor', () => {
    test('should initialize with empty maps', () => {
      expect(manager.connections.size).toBe(0);
      expect(manager.metadata.size).toBe(0);
      expect(manager.connectionStatus.size).toBe(0);
    });

    test('should initialize default styles', () => {
      const styles = manager.getStyleNames();
      expect(styles).toContain('primary');
      expect(styles).toContain('success');
      expect(styles).toContain('danger');
      expect(styles).toContain('warning');
    });
  });

  describe('addConnection', () => {
    test('should add a new connection', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      expect(conn).toBeDefined();
      expect(conn.fromId).toBe(1);
      expect(conn.toId).toBe(2);
      expect(conn.status).toBe('primary');
    });

    test('should generate unique connection ID', () => {
      const conn = manager.addConnection(1, 'out1', 2, 'in');
      expect(conn.id).toBe('1_out1_2_in');
    });

    test('should throw error if parameters missing', () => {
      expect(() => {
        manager.addConnection(null, 'out', 2, 'in');
      }).toThrow('Connection requires');
    });

    test('should store metadata from connection', () => {
      const meta = { label: 'test', type: 'data' };
      const conn = manager.addConnection(1, 'out', 2, 'in', meta);
      expect(conn.metadata.label).toBe('test');
      expect(conn.metadata.type).toBe('data');
    });

    test('should set initial status to primary', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      expect(manager.connectionStatus.get(conn.id)).toBe('primary');
    });
  });

  describe('removeConnection', () => {
    test('should remove an existing connection', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      const removed = manager.removeConnection(conn.id);
      expect(removed).toBe(true);
      expect(manager.connections.has(conn.id)).toBe(false);
    });

    test('should return false for non-existent connection', () => {
      const removed = manager.removeConnection('nonexistent');
      expect(removed).toBe(false);
    });

    test('should clean up all references', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      manager.removeConnection(conn.id);
      expect(manager.metadata.has(conn.id)).toBe(false);
      expect(manager.connectionStatus.has(conn.id)).toBe(false);
    });
  });

  describe('getConnection', () => {
    test('should retrieve existing connection', () => {
      const added = manager.addConnection(1, 'out', 2, 'in');
      const retrieved = manager.getConnection(added.id);
      expect(retrieved).toEqual(added);
    });

    test('should return null for non-existent connection', () => {
      const conn = manager.getConnection('nonexistent');
      expect(conn).toBeNull();
    });
  });

  describe('getConnectionsMeta', () => {
    test('should return all connections without predicate', () => {
      manager.addConnection(1, 'out1', 2, 'in');
      manager.addConnection(1, 'out2', 3, 'in');
      const conns = manager.getConnectionsMeta();
      expect(conns.length).toBe(2);
    });

    test('should filter connections by predicate', () => {
      manager.addConnection(1, 'out', 2, 'in', { type: 'data' });
      manager.addConnection(1, 'out', 3, 'in', { type: 'control' });
      const conns = manager.getConnectionsMeta(c => c.metadata.type === 'data');
      expect(conns.length).toBe(1);
      expect(conns[0].metadata.type).toBe('data');
    });

    test('should include metadata in results', () => {
      manager.addConnection(1, 'out', 2, 'in', { label: 'Test' });
      const conns = manager.getConnectionsMeta();
      expect(conns[0].metadata.label).toBe('Test');
    });
  });

  describe('styleConnection', () => {
    test('should apply named style to connection', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      const result = manager.styleConnection(conn.id, 'success');
      expect(result).toBe(true);
      expect(conn.style).toBe('success');
    });

    test('should apply custom style object', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      const customStyle = { stroke: '#fff', strokeWidth: 3 };
      manager.styleConnection(conn.id, customStyle);
      expect(conn.styleConfig).toEqual(expect.objectContaining(customStyle));
    });

    test('should throw error for invalid style name', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      expect(() => {
        manager.styleConnection(conn.id, 'nonexistent');
      }).toThrow('Style');
    });

    test('should return false for non-existent connection', () => {
      const result = manager.styleConnection('nonexistent', 'primary');
      expect(result).toBe(false);
    });
  });

  describe('setConnectionStatus', () => {
    test('should set valid status', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      const result = manager.setConnectionStatus(conn.id, 'success');
      expect(result).toBe(true);
      expect(conn.status).toBe('success');
    });

    test('should throw error for invalid status', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      expect(() => {
        manager.setConnectionStatus(conn.id, 'invalid');
      }).toThrow('Invalid status');
    });

    test('should accept all valid statuses', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      ['primary', 'success', 'danger', 'warning'].forEach(status => {
        const result = manager.setConnectionStatus(conn.id, status);
        expect(result).toBe(true);
        expect(conn.status).toBe(status);
      });
    });

    test('should apply corresponding style on status change', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      manager.setConnectionStatus(conn.id, 'danger');
      expect(conn.style).toBe('danger');
    });

    test('should return false for non-existent connection', () => {
      const result = manager.setConnectionStatus('nonexistent', 'success');
      expect(result).toBe(false);
    });
  });

  describe('refreshConnectionStyles', () => {
    test('should refresh all connection styles', () => {
      manager.addConnection(1, 'out1', 2, 'in');
      manager.addConnection(1, 'out2', 3, 'in');
      const count = manager.refreshConnectionStyles();
      expect(count).toBe(2);
    });

    test('should only refresh connections with style', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      conn.style = null;
      const count = manager.refreshConnectionStyles();
      expect(count).toBe(0);
    });
  });

  describe('paintConnections', () => {
    test('should paint matching connections', () => {
      manager.addConnection(1, 'out1', 2, 'in', { type: 'data' });
      manager.addConnection(1, 'out2', 3, 'in', { type: 'control' });
      const count = manager.paintConnections(
        c => c.metadata.type === 'data',
        'success'
      );
      expect(count).toBe(1);
    });

    test('should paint all connections when predicate matches all', () => {
      manager.addConnection(1, 'out1', 2, 'in');
      manager.addConnection(1, 'out2', 3, 'in');
      const count = manager.paintConnections(() => true, 'danger');
      expect(count).toBe(2);
    });

    test('should paint zero connections when predicate matches none', () => {
      manager.addConnection(1, 'out', 2, 'in', { type: 'data' });
      const count = manager.paintConnections(() => false, 'success');
      expect(count).toBe(0);
    });

    test('should apply style to matched connections', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in', { type: 'data' });
      manager.paintConnections(c => c.metadata.type === 'data', 'success');
      expect(conn.style).toBe('success');
    });
  });

  describe('defineStyle', () => {
    test('should define new style', () => {
      manager.defineStyle('custom', { stroke: '#fff', strokeWidth: 3 });
      const style = manager.getStyle('custom');
      expect(style.stroke).toBe('#fff');
      expect(style.strokeWidth).toBe(3);
    });

    test('should return manager for chaining', () => {
      const result = manager.defineStyle('test', { stroke: '#000' });
      expect(result).toBe(manager);
    });

    test('should throw error for non-object config', () => {
      expect(() => {
        manager.defineStyle('test', 'not an object');
      }).toThrow('Style config must be an object');
    });

    test('should preserve existing styles', () => {
      manager.defineStyle('custom', { stroke: '#fff' });
      const customStyle = manager.getStyle('custom');
      expect(customStyle).toBeDefined();
      expect(manager.getStyle('primary')).toBeDefined();
    });
  });

  describe('setMetadata', () => {
    test('should set metadata for connection', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      manager.setMetadata(conn.id, { label: 'Updated' });
      const meta = manager.getMetadata(conn.id);
      expect(meta.label).toBe('Updated');
    });

    test('should throw error for non-existent connection', () => {
      expect(() => {
        manager.setMetadata('nonexistent', { label: 'Test' });
      }).toThrow('not found');
    });

    test('should return manager for chaining', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      const result = manager.setMetadata(conn.id, { label: 'Test' });
      expect(result).toBe(manager);
    });

    test('should validate metadata', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in');
      manager.setMetadata(conn.id, { type: 'custom' });
      const meta = manager.getMetadata(conn.id);
      expect(meta.type).toBe('custom');
      expect(meta.label).toBe('');
      expect(meta.required).toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('should retrieve connection metadata', () => {
      const conn = manager.addConnection(1, 'out', 2, 'in', { label: 'Test' });
      const meta = manager.getMetadata(conn.id);
      expect(meta.label).toBe('Test');
    });

    test('should return null for non-existent connection', () => {
      const meta = manager.getMetadata('nonexistent');
      expect(meta).toBeNull();
    });
  });

  describe('registerValidator', () => {
    test('should register connection validator', () => {
      const validator = jest.fn(() => ({ valid: true, errors: [] }));
      manager.registerValidator('dataFlow', validator);
      const result = manager.validateConnection('dataFlow', {});
      expect(validator).toHaveBeenCalled();
    });

    test('should throw error if validator not function', () => {
      expect(() => {
        manager.registerValidator('test', 'not a function');
      }).toThrow('Validator must be a function');
    });
  });

  describe('validateConnection', () => {
    test('should validate using registered validator', () => {
      const validator = jest.fn(() => ({ valid: false, errors: ['Invalid'] }));
      manager.registerValidator('test', validator);
      const result = manager.validateConnection('test', {});
      expect(result.valid).toBe(false);
    });

    test('should return valid for unregistered type', () => {
      const result = manager.validateConnection('unknown', {});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should catch validator errors', () => {
      manager.registerValidator('errorTest', () => {
        throw new Error('Validator error');
      });
      const result = manager.validateConnection('errorTest', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Validator error');
    });
  });

  describe('createBuilder', () => {
    test('should create connection builder', () => {
      const builder = manager.createBuilder(1, 'out');
      expect(builder).toBeDefined();
      expect(builder.connection.fromNodeId).toBe(1);
      expect(builder.connection.fromOutput).toBe('out');
    });

    test('should build connection through builder', () => {
      const conn = manager
        .createBuilder(1, 'out')
        .to(2, 'in')
        .withLabel('Test')
        .withStatus('success')
        .build();
      expect(conn.toNodeId).toBe(2);
      expect(conn.metadata.label).toBe('Test');
      expect(conn.status).toBe('success');
    });
  });

  describe('install', () => {
    test('should add methods to DrawflowPlus instance', () => {
      const drawflowPlus = {};
      manager.install(drawflowPlus);
      expect(typeof drawflowPlus.addConnection).toBe('function');
      expect(typeof drawflowPlus.setConnectionStatus).toBe('function');
      expect(typeof drawflowPlus.paintConnections).toBe('function');
    });
  });
});

describe('ConnectionParser', () => {
  describe('parseConnectionData', () => {
    test('should parse valid connection JSON', () => {
      const json = {
        id: 'conn1',
        fromId: 1,
        fromOut: 'out',
        toId: 2,
        toIn: 'in'
      };
      const conn = ConnectionParser.parseConnectionData(json);
      expect(conn.id).toBe('conn1');
      expect(conn.fromId).toBe('1');
    });

    test('should throw error for missing required fields', () => {
      expect(() => {
        ConnectionParser.parseConnectionData({ id: 'conn1' });
      }).toThrow('Missing required field');
    });

    test('should set default values', () => {
      const json = {
        id: 'conn1',
        fromId: 1,
        fromOut: 'out',
        toId: 2,
        toIn: 'in'
      };
      const conn = ConnectionParser.parseConnectionData(json);
      expect(conn.status).toBe('primary');
      expect(conn.style).toBe('primary');
    });

    test('should parse metadata', () => {
      const json = {
        id: 'conn1',
        fromId: 1,
        fromOut: 'out',
        toId: 2,
        toIn: 'in',
        metadata: { label: 'Test', type: 'data' }
      };
      const conn = ConnectionParser.parseConnectionData(json);
      expect(conn.metadata.label).toBe('Test');
      expect(conn.metadata.type).toBe('data');
    });
  });

  describe('validateMetadata', () => {
    test('should validate metadata structure', () => {
      const meta = ConnectionParser.validateMetadata({
        type: 'data',
        label: 'Test',
        required: true
      });
      expect(meta.type).toBe('data');
      expect(meta.label).toBe('Test');
      expect(meta.required).toBe(true);
    });

    test('should apply defaults for missing fields', () => {
      const meta = ConnectionParser.validateMetadata({});
      expect(meta.type).toBe('default');
      expect(meta.label).toBe('');
      expect(meta.required).toBe(false);
    });

    test('should correct invalid types', () => {
      const meta = ConnectionParser.validateMetadata({
        type: 123, // should be string
        label: { obj: true } // should be string
      });
      expect(meta.type).toBe('default');
      expect(meta.label).toBe('');
    });

    test('should preserve custom properties', () => {
      const meta = ConnectionParser.validateMetadata({
        type: 'data',
        customProp: 'value'
      });
      expect(meta.custom.customProp).toBe('value');
    });
  });

  describe('buildConnectionClass', () => {
    test('should build class string from metadata', () => {
      const classes = ConnectionParser.buildConnectionClass({
        type: 'data',
        status: 'success'
      });
      expect(classes).toContain('connection');
      expect(classes).toContain('connection-type-data');
      expect(classes).toContain('connection-status-success');
    });

    test('should sanitize class names', () => {
      const classes = ConnectionParser.buildConnectionClass({
        type: 'data/flow',
        tags: ['important', 'high-priority']
      });
      expect(classes).toContain('connection-type-data-flow');
    });

    test('should include required indicator', () => {
      const classes = ConnectionParser.buildConnectionClass({
        required: true
      });
      expect(classes).toContain('connection-required');
    });

    test('should include data type', () => {
      const classes = ConnectionParser.buildConnectionClass({
        dataType: 'object'
      });
      expect(classes).toContain('connection-data-object');
    });
  });

  describe('parseConnectionMeta', () => {
    test('should extract metadata from DOM element', () => {
      const element = document.createElement('path');
      element.setAttribute('data-connection-type', 'data');
      element.setAttribute('data-connection-label', 'Test Label');
      element.setAttribute('data-required', 'true');

      const meta = ConnectionParser.parseConnectionMeta(element);
      expect(meta.type).toBe('data');
      expect(meta.label).toBe('Test Label');
      expect(meta.required).toBe(true);
    });

    test('should return null for null element', () => {
      const meta = ConnectionParser.parseConnectionMeta(null);
      expect(meta).toBeNull();
    });

    test('should parse tags', () => {
      const element = document.createElement('path');
      element.setAttribute('data-tags', 'important,critical,urgent');
      const meta = ConnectionParser.parseConnectionMeta(element);
      expect(meta.tags).toEqual(['important', 'critical', 'urgent']);
    });

    test('should parse custom data attributes', () => {
      const element = document.createElement('path');
      element.setAttribute('data-custom-source', '"api"');
      element.setAttribute('data-custom-priority', '"high"');
      const meta = ConnectionParser.parseConnectionMeta(element);
      expect(meta.custom.source).toBe('api');
      expect(meta.custom.priority).toBe('high');
    });
  });

  describe('serialize/deserialize', () => {
    test('should serialize connection to JSON', () => {
      const conn = {
        id: 'conn1',
        fromId: 1,
        toId: 2,
        metadata: { label: 'Test' }
      };
      const json = ConnectionParser.serialize(conn);
      expect(typeof json).toBe('string');
      expect(json).toContain('conn1');
    });

    test('should deserialize JSON to connection', () => {
      const json = JSON.stringify({
        id: 'conn1',
        fromId: 1,
        fromOut: 'out',
        toId: 2,
        toIn: 'in'
      });
      const conn = ConnectionParser.deserialize(json);
      expect(conn.id).toBe('conn1');
    });

    test('should throw error on invalid JSON', () => {
      expect(() => {
        ConnectionParser.deserialize('not json');
      }).toThrow('Failed to deserialize');
    });
  });

  describe('validateConnection', () => {
    test('should validate connection structure', () => {
      const result = ConnectionParser.validateConnection({
        fromId: 1,
        fromOut: 'out',
        toId: 2,
        toIn: 'in'
      });
      expect(result.valid).toBe(true);
    });

    test('should detect self-connections', () => {
      const result = ConnectionParser.validateConnection({
        fromId: 1,
        fromOut: 'out',
        toId: 1,
        toIn: 'in'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect missing fields', () => {
      const result = ConnectionParser.validateConnection({
        fromId: 1,
        toId: 2
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getSchema', () => {
    test('should return metadata schema', () => {
      const schema = ConnectionParser.getSchema();
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('label');
      expect(schema).toHaveProperty('required');
    });

    test('should have type information for each field', () => {
      const schema = ConnectionParser.getSchema();
      expect(schema.type.type).toBe('string');
      expect(schema.required.type).toBe('boolean');
      expect(schema.tags.type).toBe('array');
    });
  });
});

describe('ConnectionBuilder', () => {
  let manager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  test('should chain methods fluently', () => {
    const conn = manager
      .createBuilder(1, 'out')
      .to(2, 'in')
      .withLabel('Test Label')
      .withDataType('string')
      .required()
      .withStatus('success')
      .ofType('dataFlow')
      .build();

    expect(conn.toNodeId).toBe(2);
    expect(conn.metadata.label).toBe('Test Label');
    expect(conn.metadata.dataType).toBe('string');
    expect(conn.metadata.required).toBe(true);
    expect(conn.status).toBe('success');
    expect(conn.metadata.type).toBe('dataFlow');
  });

  test('should throw error when building without target', () => {
    expect(() => {
      manager.createBuilder(1, 'out').build();
    }).toThrow('Target node and input');
  });

  test('should support metadata tags', () => {
    const conn = manager
      .createBuilder(1, 'out')
      .to(2, 'in')
      .withTags('critical', 'important')
      .build();

    expect(conn.metadata.tags).toEqual(['critical', 'important']);
  });

  test('should support custom metadata', () => {
    const conn = manager
      .createBuilder(1, 'out')
      .to(2, 'in')
      .withMetadata('source', 'api')
      .withMetadata('timeout', 5000)
      .build();

    expect(conn.metadata.source).toBe('api');
    expect(conn.metadata.timeout).toBe(5000);
  });
});
