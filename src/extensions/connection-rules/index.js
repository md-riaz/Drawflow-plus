/**
 * ConnectionRules Extension
 * Enforces per-output max-connection limits, type-based allow/deny matrices,
 * and custom canConnect callbacks. When a violation occurs in strict mode,
 * the offending connection is immediately removed.
 */

const DEFAULTS = {
  strict: true,
  onViolation: null,
};

class ConnectionRules {
  constructor(options = {}) {
    this._postAdd = false;
    this._outputMaxByType = new Map();
    this._inputMaxByType = new Map();
    this._outputMaxByNode = new Map();
    this._inputMaxByNode = new Map();
    this._typeRules = new Map();
    this._canConnectFns = [];
    this._violations = [];
    this.options = { ...DEFAULTS, ...options };
  }

  install(drawflowPlus, options = {}) {
    this.dfp = drawflowPlus;
    this.options = { ...this.options, ...options };

    drawflowPlus.setOutputMaxConnections = (nodeTypeId, outputKey, max) =>
      this.setOutputMaxConnections(nodeTypeId, outputKey, max);
    drawflowPlus.setInputMaxConnections = (nodeTypeId, inputKey, max) =>
      this.setInputMaxConnections(nodeTypeId, inputKey, max);
    drawflowPlus.setOutputMaxConnectionsForNode = (nodeId, outputKey, max) =>
      this.setOutputMaxConnectionsForNode(nodeId, outputKey, max);
    drawflowPlus.setInputMaxConnectionsForNode = (nodeId, inputKey, max) =>
      this.setInputMaxConnectionsForNode(nodeId, inputKey, max);
    drawflowPlus.addTypeRule = (fromType, toType, allow) =>
      this.addTypeRule(fromType, toType, allow);
    drawflowPlus.setTypeMatrix = (matrix) => this.setTypeMatrix(matrix);
    drawflowPlus.setCanConnect = (fn) => this.setCanConnect(fn);
    drawflowPlus.clearConnectionRules = () => this.clearRules();
    drawflowPlus.canConnect = (fromId, fromOut, toId, toIn) =>
      this.canConnect(fromId, fromOut, toId, toIn);
    drawflowPlus.validateFlow = () => this.validateFlow();
    drawflowPlus.getConnectionViolations = () => this.getViolations();

    this._hookDrawflow();
  }

  setOutputMaxConnections(nodeTypeId, outputKey, max) {
    const key = outputKey ? `${nodeTypeId}::${outputKey}` : nodeTypeId;
    this._outputMaxByType.set(key, max);
    return this;
  }

  setInputMaxConnections(nodeTypeId, inputKey, max) {
    const key = inputKey ? `${nodeTypeId}::${inputKey}` : nodeTypeId;
    this._inputMaxByType.set(key, max);
    return this;
  }

  setOutputMaxConnectionsForNode(nodeId, outputKey, max) {
    const key = `${nodeId}::${outputKey}`;
    this._outputMaxByNode.set(key, max);
    return this;
  }

  setInputMaxConnectionsForNode(nodeId, inputKey, max) {
    const key = `${nodeId}::${inputKey}`;
    this._inputMaxByNode.set(key, max);
    return this;
  }

  addTypeRule(fromType, toType, allow) {
    this._typeRules.set(`${fromType}->${toType}`, allow);
    return this;
  }

  setTypeMatrix(matrix) {
    for (const [fromType, config] of Object.entries(matrix)) {
      const allowed = config.allowOutputTo || [];
      this.addTypeRule(fromType, '*', false);
      for (const toType of allowed) {
        this.addTypeRule(fromType, toType, true);
      }
    }
    return this;
  }

  setCanConnect(fn) {
    this._canConnectFns.push(fn);
    return this;
  }

  clearRules() {
    this._outputMaxByType.clear();
    this._inputMaxByType.clear();
    this._outputMaxByNode.clear();
    this._inputMaxByNode.clear();
    this._typeRules.clear();
    this._canConnectFns = [];
    return this;
  }

  canConnect(fromId, fromOut, toId, toIn) {
    // 1. Output max connections check
    const outputCheck = this._checkOutputMax(fromId, fromOut);
    if (!outputCheck.allowed) return outputCheck;

    // 2. Input max connections check
    const inputCheck = this._checkInputMax(toId, toIn);
    if (!inputCheck.allowed) return inputCheck;

    // 3. Type matrix check
    const typeCheck = this._checkTypeRule(fromId, toId);
    if (!typeCheck.allowed) return typeCheck;

    // 4. Custom canConnect callbacks
    for (const fn of this._canConnectFns) {
      const from = { nodeId: fromId, portKey: fromOut, nodeType: this._getNodeType(fromId) };
      const to = { nodeId: toId, portKey: toIn, nodeType: this._getNodeType(toId) };
      const result = fn(from, to);
      if (result === false) return { allowed: false, reason: 'Connection denied by rule' };
      if (typeof result === 'string') return { allowed: false, reason: result };
      if (result && result.allowed === false) return { allowed: false, reason: result.reason || 'Connection denied' };
    }

    return { allowed: true, reason: null };
  }

  validateFlow() {
    const nodes = this._getNodes();
    const violations = [];

    for (const [nodeId, node] of Object.entries(nodes)) {
      const outputs = node.outputs || {};
      for (const [outputKey, output] of Object.entries(outputs)) {
        const connections = output.connections || [];
        const max = this._resolveOutputMax(nodeId, outputKey);
        if (max !== null && connections.length > max) {
          violations.push({ nodeId, port: outputKey, type: 'outputMax', count: connections.length, max });
        }
        for (const conn of connections) {
          const toNodeId = String(conn.node);
          const typeCheck = this._checkTypeRule(nodeId, toNodeId);
          if (!typeCheck.allowed) {
            violations.push({ nodeId, port: outputKey, targetNodeId: toNodeId, type: 'typeRule', reason: typeCheck.reason });
          }
        }
      }

      const inputs = node.inputs || {};
      for (const [inputKey, input] of Object.entries(inputs)) {
        const connections = input.connections || [];
        const max = this._resolveInputMax(nodeId, inputKey);
        if (max !== null && connections.length > max) {
          violations.push({ nodeId, port: inputKey, type: 'inputMax', count: connections.length, max });
        }
      }
    }

    this._violations = violations;
    return violations;
  }

  getViolations() {
    return [...this._violations];
  }

  // --- private ---

  _hookDrawflow() {
    const df = this.dfp.drawflow;
    if (!df || typeof df.on !== 'function') return;

    df.on('connectionCreated', (info) => {
      this._postAdd = true;
      const result = this.canConnect(
        info.output_id, info.output_class,
        info.input_id, info.input_class
      );
      this._postAdd = false;

      if (!result.allowed && this.options.strict) {
        this._removeConnection(info);
        const violation = { ...info, reason: result.reason };
        this._violations.push(violation);
        if (typeof this.options.onViolation === 'function') {
          this.options.onViolation(violation);
        }
      }
    });
  }

  _removeConnection(info) {
    const df = this.dfp.drawflow;
    if (!df) return;
    try {
      if (typeof df.removeSingleConnection === 'function') {
        df.removeSingleConnection(info.output_id, info.input_id, info.output_class, info.input_class);
      } else {
        // DOM fallback: find and remove the connection SVG element
        if (typeof document !== 'undefined') {
          const connections = document.querySelectorAll('.connection');
          for (const el of connections) {
            if (
              el.classList.contains(`node_in_node-${info.input_id}`) &&
              el.classList.contains(`node_out_node-${info.output_id}`) &&
              el.classList.contains(info.output_class)
            ) {
              el.remove();
              break;
            }
          }
          // Also update DrawFlow internal data
          this._removeFromData(info.output_id, info.output_class, info.input_id, info.input_class);
        }
      }
    } catch (e) {
      // Silently fail if removal isn't possible
    }
  }

  _removeFromData(outputNodeId, outputClass, inputNodeId, inputClass) {
    try {
      const nodes = this._getNodes();
      const outNode = nodes[outputNodeId];
      if (outNode && outNode.outputs && outNode.outputs[outputClass]) {
        outNode.outputs[outputClass].connections = outNode.outputs[outputClass].connections.filter(
          c => !(String(c.node) === String(inputNodeId) && c.output === inputClass)
        );
      }
      const inNode = nodes[inputNodeId];
      if (inNode && inNode.inputs && inNode.inputs[inputClass]) {
        inNode.inputs[inputClass].connections = inNode.inputs[inputClass].connections.filter(
          c => !(String(c.node) === String(outputNodeId) && c.input === outputClass)
        );
      }
    } catch (e) {
      // ignore
    }
  }

  _checkOutputMax(nodeId, outputKey) {
    const max = this._resolveOutputMax(nodeId, outputKey);
    if (max === null) return { allowed: true, reason: null };

    const current = this._countOutputConnections(nodeId, outputKey);
    // postAdd: DrawFlow already added the connection, so current includes the new one
    if (this._postAdd ? current > max : current >= max) {
      return {
        allowed: false,
        reason: `Output "${outputKey}" on node ${nodeId} already has ${current}/${max} connections`,
      };
    }
    return { allowed: true, reason: null };
  }

  _checkInputMax(nodeId, inputKey) {
    const max = this._resolveInputMax(nodeId, inputKey);
    if (max === null) return { allowed: true, reason: null };

    const current = this._countInputConnections(nodeId, inputKey);
    if (this._postAdd ? current > max : current >= max) {
      return {
        allowed: false,
        reason: `Input "${inputKey}" on node ${nodeId} already has ${current}/${max} connections`,
      };
    }
    return { allowed: true, reason: null };
  }

  _resolveOutputMax(nodeId, outputKey) {
    const nodeKey = `${nodeId}::${outputKey}`;
    if (this._outputMaxByNode.has(nodeKey)) return this._outputMaxByNode.get(nodeKey);

    const nodeType = this._getNodeType(nodeId);
    if (nodeType) {
      const typeSpecificKey = `${nodeType}::${outputKey}`;
      if (this._outputMaxByType.has(typeSpecificKey)) return this._outputMaxByType.get(typeSpecificKey);
      if (this._outputMaxByType.has(nodeType)) return this._outputMaxByType.get(nodeType);
    }
    return null;
  }

  _resolveInputMax(nodeId, inputKey) {
    const nodeKey = `${nodeId}::${inputKey}`;
    if (this._inputMaxByNode.has(nodeKey)) return this._inputMaxByNode.get(nodeKey);

    const nodeType = this._getNodeType(nodeId);
    if (nodeType) {
      const typeSpecificKey = `${nodeType}::${inputKey}`;
      if (this._inputMaxByType.has(typeSpecificKey)) return this._inputMaxByType.get(typeSpecificKey);
      if (this._inputMaxByType.has(nodeType)) return this._inputMaxByType.get(nodeType);
    }
    return null;
  }

  _checkTypeRule(fromNodeId, toNodeId) {
    const fromType = this._getNodeType(fromNodeId);
    const toType = this._getNodeType(toNodeId);
    if (!fromType || !toType) return { allowed: true, reason: null };

    const specificRule = this._typeRules.get(`${fromType}->${toType}`);
    if (specificRule !== undefined) {
      return specificRule
        ? { allowed: true, reason: null }
        : { allowed: false, reason: `Connections from "${fromType}" to "${toType}" are not allowed` };
    }

    // Check wildcard deny (fromType->*)
    const wildcardRule = this._typeRules.get(`${fromType}->*`);
    if (wildcardRule !== undefined) {
      return wildcardRule
        ? { allowed: true, reason: null }
        : { allowed: false, reason: `Connections from "${fromType}" to "${toType}" are not allowed` };
    }

    return { allowed: true, reason: null };
  }

  _countOutputConnections(nodeId, outputKey) {
    try {
      const nodes = this._getNodes();
      const node = nodes[nodeId] || nodes[String(nodeId)];
      return node && node.outputs && node.outputs[outputKey]
        ? (node.outputs[outputKey].connections || []).length
        : 0;
    } catch (e) {
      return 0;
    }
  }

  _countInputConnections(nodeId, inputKey) {
    try {
      const nodes = this._getNodes();
      const node = nodes[nodeId] || nodes[String(nodeId)];
      return node && node.inputs && node.inputs[inputKey]
        ? (node.inputs[inputKey].connections || []).length
        : 0;
    } catch (e) {
      return 0;
    }
  }

  _getNodeType(nodeId) {
    const nts = this.dfp.getExtension('nodeTypes');
    if (nts && typeof nts.getNodeInstance === 'function') {
      const instance = nts.getNodeInstance(nodeId);
      if (instance) return instance.typeId;
    }
    // Fallback: read class from node data
    try {
      const nodes = this._getNodes();
      const node = nodes[nodeId] || nodes[String(nodeId)];
      return node ? node.name : null;
    } catch (e) {
      return null;
    }
  }

  _getNodes() {
    try {
      const df = this.dfp.drawflow;
      const moduleName = df.module || 'Home';
      return df.drawflow.drawflow[moduleName].data || {};
    } catch (e) {
      return {};
    }
  }
}

export default ConnectionRules;
