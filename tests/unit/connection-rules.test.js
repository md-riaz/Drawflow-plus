/**
 * Unit Tests for ConnectionRules Extension
 */

import ConnectionRules from '../../src/extensions/connection-rules/index.js';

function makeNodes(extra = {}) {
  return {
    1: {
      name: 'ivr',
      pos_x: 0, pos_y: 0,
      outputs: { output_1: { connections: [] }, output_2: { connections: [] } },
      inputs: { input_1: { connections: [] } },
    },
    2: {
      name: 'extension',
      pos_x: 300, pos_y: 0,
      outputs: {},
      inputs: { input_1: { connections: [] } },
    },
    3: {
      name: 'voicemail',
      pos_x: 600, pos_y: 0,
      outputs: {},
      inputs: { input_1: { connections: [] } },
    },
    ...extra,
  };
}

function makeMockDfp(nodes = makeNodes(), extensions = {}) {
  let connectionCreatedHandler = null;
  const drawflow = {
    on: (event, handler) => {
      if (event === 'connectionCreated') connectionCreatedHandler = handler;
    },
    drawflow: { drawflow: { Home: { data: nodes } } },
    removeSingleConnection: jest.fn(),
    _triggerConnectionCreated: (info) => connectionCreatedHandler && connectionCreatedHandler(info),
  };

  return {
    drawflow,
    extensions,
    getExtension: (name) => extensions[name],
  };
}

describe('ConnectionRules', () => {
  describe('install', () => {
    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      expect(typeof dfp.setOutputMaxConnections).toBe('function');
      expect(typeof dfp.addTypeRule).toBe('function');
      expect(typeof dfp.setCanConnect).toBe('function');
      expect(typeof dfp.canConnect).toBe('function');
      expect(typeof dfp.validateFlow).toBe('function');
    });
  });

  describe('canConnect - no rules', () => {
    test('allows connection with no rules set', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('setOutputMaxConnections', () => {
    test('blocks when output already at max', () => {
      const nodes = makeNodes();
      nodes[1].outputs.output_1.connections = [{ node: 2, output: 'input_1' }];
      const dfp = makeMockDfp(nodes);
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 1);

      const result = dfp.canConnect(1, 'output_1', 3, 'input_1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('output_1');
    });

    test('allows when output is below max', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 2);

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true);
    });

    test('node-level override takes precedence over type-level', () => {
      const nodes = makeNodes();
      nodes[1].outputs.output_1.connections = [{ node: 2, output: 'input_1' }];
      const dfp = makeMockDfp(nodes);
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 1); // type-level: max 1
      dfp.setOutputMaxConnectionsForNode(1, 'output_1', 5); // node-level override: max 5

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true); // node override allows it
    });
  });

  describe('addTypeRule', () => {
    test('blocks disallowed type combinations', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.addTypeRule('ivr', 'voicemail', false);

      const result = dfp.canConnect(1, 'output_1', 3, 'input_1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('voicemail');
    });

    test('allows explicitly allowed type combinations', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.addTypeRule('ivr', 'extension', true);

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true);
    });

    test('setTypeMatrix allows listed types and blocks others via wildcard', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setTypeMatrix({
        ivr: { allowOutputTo: ['extension'] },
      });

      expect(dfp.canConnect(1, 'output_1', 2, 'input_1').allowed).toBe(true);  // ivr->extension: allowed
      expect(dfp.canConnect(1, 'output_1', 3, 'input_1').allowed).toBe(false); // ivr->voicemail: blocked
    });
  });

  describe('setCanConnect callback', () => {
    test('blocking callback prevents connection', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setCanConnect(() => false);

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(false);
    });

    test('string return used as reason', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setCanConnect(() => 'custom reason');

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('custom reason');
    });

    test('object return with allowed:false blocked', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setCanConnect(() => ({ allowed: false, reason: 'nope' }));

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('nope');
    });

    test('true return allows connection', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setCanConnect(() => true);

      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('clearRules', () => {
    test('removes all rules', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 0);
      dfp.clearConnectionRules();
      const result = dfp.canConnect(1, 'output_1', 2, 'input_1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('strict mode enforcement', () => {
    test('removes connection on violation in strict mode', () => {
      const nodes = makeNodes();
      nodes[1].outputs.output_1.connections = [{ node: 2, output: 'input_1' }];
      const dfp = makeMockDfp(nodes);
      const onViolation = jest.fn();
      const rules = new ConnectionRules({ strict: true, onViolation });
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 1);

      // Simulate DrawFlow having added the new connection to its data before firing the event
      nodes[1].outputs.output_1.connections.push({ node: 3, output: 'input_1' });
      dfp.drawflow._triggerConnectionCreated({
        output_id: 1, output_class: 'output_1',
        input_id: 3, input_class: 'input_1',
      });

      expect(dfp.drawflow.removeSingleConnection).toHaveBeenCalled();
      expect(onViolation).toHaveBeenCalled();
    });

    test('does not remove connection in non-strict mode', () => {
      const nodes = makeNodes();
      nodes[1].outputs.output_1.connections = [{ node: 2, output: 'input_1' }];
      const dfp = makeMockDfp(nodes);
      const rules = new ConnectionRules({ strict: false });
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 1);

      nodes[1].outputs.output_1.connections.push({ node: 3, output: 'input_1' });
      dfp.drawflow._triggerConnectionCreated({
        output_id: 1, output_class: 'output_1',
        input_id: 3, input_class: 'input_1',
      });

      expect(dfp.drawflow.removeSingleConnection).not.toHaveBeenCalled();
    });
  });

  describe('validateFlow', () => {
    test('returns empty array when no violations', () => {
      const dfp = makeMockDfp();
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 3);
      const violations = dfp.validateFlow();
      expect(violations).toEqual([]);
    });

    test('detects over-connected output', () => {
      const nodes = makeNodes();
      nodes[1].outputs.output_1.connections = [
        { node: 2, output: 'input_1' },
        { node: 3, output: 'input_1' },
      ];
      const dfp = makeMockDfp(nodes);
      const rules = new ConnectionRules();
      rules.install(dfp, {});
      dfp.setOutputMaxConnections('ivr', 'output_1', 1);

      const violations = dfp.validateFlow();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].nodeId).toBe('1');
    });
  });
});
