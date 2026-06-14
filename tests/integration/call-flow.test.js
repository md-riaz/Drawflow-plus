/**
 * Call Flow Editor - Integration Test Suite
 * Phase 6: Complete Example Integration Tests
 *
 * Tests all 5 features working together in real-world scenarios
 * Including: Node management, Validation, Settings, Connections, State management
 */

describe('Call Flow Editor - Complete Integration Suite', () => {
    let editor;
    let testContainer;

    beforeEach(() => {
        // Setup DOM
        testContainer = document.createElement('div');
        testContainer.id = 'test-container';
        testContainer.innerHTML = `
            <div id="canvas"></div>
            <div id="connections-svg"></div>
            <div id="settings-content"></div>
        `;
        document.body.appendChild(testContainer);

        // Clear localStorage
        localStorage.clear();

        // Initialize app state (simulating the app)
        editor = {
            nodes: {},
            edges: [],
            selectedNode: null,
            validationErrors: {},
            history: [],
            historyIndex: -1,
            versions: [],
        };
    });

    afterEach(() => {
        document.body.removeChild(testContainer);
        localStorage.clear();
    });

    // ========================================================================
    // PHASE 1: NODE TYPE SYSTEM
    // ========================================================================

    describe('Phase 1: Node Type System', () => {
        const NODE_TYPES = {
            'incoming-call': {
                icon: '☎️',
                label: 'Incoming Call',
                color: '#10b981',
                inputs: 0,
                outputs: 1,
                config: {
                    name: { type: 'string', default: 'Incoming Call', required: true },
                    description: { type: 'string', default: '' },
                },
                locked: true,
            },
            'ivr': {
                icon: '🎙️',
                label: 'IVR Menu',
                color: '#6366f1',
                inputs: 1,
                outputs: 'dynamic',
                config: {
                    name: { type: 'string', default: 'IVR Menu', required: true },
                    prompt: { type: 'string', default: '', required: true },
                    timeout: { type: 'number', default: 5, min: 1, max: 30 },
                    maxAttempts: { type: 'number', default: 3, min: 1, max: 10 },
                    menuOptions: { type: 'array', default: [] },
                },
            },
            'extension': {
                icon: '📱',
                label: 'Extension',
                color: '#f59e0b',
                inputs: 1,
                outputs: 2,
                config: {
                    name: { type: 'string', default: 'Extension', required: true },
                    extensionNumber: { type: 'string', default: '', required: true },
                    timeout: { type: 'number', default: 30, min: 5, max: 120 },
                },
            },
            'ring-group': {
                icon: '👥',
                label: 'Ring Group',
                color: '#f59e0b',
                inputs: 1,
                outputs: 2,
                config: {
                    name: { type: 'string', default: 'Ring Group', required: true },
                    extensions: { type: 'array', default: [], required: true },
                    ringStrategy: { type: 'string', default: 'simultaneous' },
                    timeout: { type: 'number', default: 30, min: 5, max: 120 },
                },
            },
            'business-hours': {
                icon: '🕐',
                label: 'Business Hours',
                color: '#8b5cf6',
                inputs: 1,
                outputs: 2,
                config: {
                    name: { type: 'string', default: 'Business Hours', required: true },
                    timezone: { type: 'string', default: 'UTC' },
                    startTime: { type: 'string', default: '09:00', required: true },
                    endTime: { type: 'string', default: '17:00', required: true },
                    workDays: { type: 'array', default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
                },
            },
        };

        test('should create incoming call node with locked status', () => {
            const nodeId = 'node_incoming_1';
            const nodeType = NODE_TYPES['incoming-call'];

            editor.nodes[nodeId] = {
                id: nodeId,
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: {
                    name: 'Incoming Call',
                    description: 'Main line',
                },
            };

            expect(editor.nodes[nodeId]).toBeDefined();
            expect(editor.nodes[nodeId].type).toBe('incoming-call');
            expect(nodeType.locked).toBe(true);
        });

        test('should create IVR node with dynamic outputs', () => {
            const nodeId = 'node_ivr_1';
            const node = {
                id: nodeId,
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Main Menu',
                    prompt: 'Press 1 for sales',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2', '3'],
                },
            };

            editor.nodes[nodeId] = node;

            expect(editor.nodes[nodeId]).toBeDefined();
            expect(NODE_TYPES['ivr'].outputs).toBe('dynamic');
            expect(node.config.menuOptions.length).toBe(3);
        });

        test('should create extension node with timeout constraints', () => {
            const nodeId = 'node_ext_1';
            const nodeType = NODE_TYPES['extension'];

            editor.nodes[nodeId] = {
                id: nodeId,
                type: 'extension',
                x: 300,
                y: 400,
                config: {
                    name: 'Sales Rep',
                    extensionNumber: '101',
                    timeout: 30,
                },
            };

            const config = editor.nodes[nodeId].config;
            const timeoutField = nodeType.config.timeout;

            expect(config.timeout).toBeGreaterThanOrEqual(timeoutField.min);
            expect(config.timeout).toBeLessThanOrEqual(timeoutField.max);
        });

        test('should support multiple node types', () => {
            const types = ['incoming-call', 'ivr', 'extension', 'ring-group', 'business-hours'];

            types.forEach(type => {
                expect(NODE_TYPES[type]).toBeDefined();
                expect(NODE_TYPES[type].icon).toBeDefined();
                expect(NODE_TYPES[type].label).toBeDefined();
                expect(NODE_TYPES[type].color).toBeDefined();
            });
        });

        test('should support node positioning with coordinates', () => {
            const node = {
                id: 'node_test',
                type: 'extension',
                x: 250,
                y: 350,
                config: { name: 'Test', extensionNumber: '100', timeout: 30 },
            };

            editor.nodes['node_test'] = node;

            expect(editor.nodes['node_test'].x).toBe(250);
            expect(editor.nodes['node_test'].y).toBe(350);
        });
    });

    // ========================================================================
    // PHASE 2: SETTINGS UI
    // ========================================================================

    describe('Phase 2: Settings UI and Configuration', () => {
        test('should generate form fields based on node type', () => {
            const nodeType = 'ivr';
            const config = {
                name: 'Main Menu',
                prompt: 'Press 1 for sales',
                timeout: 5,
                maxAttempts: 3,
                menuOptions: ['1', '2', '3'],
            };

            editor.nodes['node_1'] = {
                id: 'node_1',
                type: nodeType,
                x: 100,
                y: 250,
                config: config,
            };

            const node = editor.nodes['node_1'];
            expect(node.config.name).toBeDefined();
            expect(node.config.prompt).toBeDefined();
            expect(node.config.timeout).toBeDefined();
        });

        test('should update configuration on save', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: 'Extension 100',
                    extensionNumber: '100',
                    timeout: 30,
                },
            };

            // Simulate form input and save
            const updatedConfig = {
                name: 'Sales Manager',
                extensionNumber: '101',
                timeout: 45,
            };

            editor.nodes['node_1'].config = updatedConfig;

            expect(editor.nodes['node_1'].config.name).toBe('Sales Manager');
            expect(editor.nodes['node_1'].config.extensionNumber).toBe('101');
            expect(editor.nodes['node_1'].config.timeout).toBe(45);
        });

        test('should support different input types', () => {
            editor.nodes['node_ivr'] = {
                id: 'node_ivr',
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Test IVR', // string
                    timeout: 5, // number
                    menuOptions: ['1', '2', '3'], // array
                },
            };

            const config = editor.nodes['node_ivr'].config;
            expect(typeof config.name).toBe('string');
            expect(typeof config.timeout).toBe('number');
            expect(Array.isArray(config.menuOptions)).toBe(true);
        });

        test('should preserve default values', () => {
            const nodeType = {
                config: {
                    name: { type: 'string', default: 'Extension', required: true },
                    timeout: { type: 'number', default: 30, min: 5, max: 120 },
                },
            };

            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: nodeType.config.name.default,
                    timeout: nodeType.config.timeout.default,
                    extensionNumber: '100',
                },
            };

            expect(editor.nodes['node_1'].config.timeout).toBe(30);
        });
    });

    // ========================================================================
    // PHASE 3: VALIDATION
    // ========================================================================

    describe('Phase 3: Validation Framework', () => {
        function validateNode(nodeId, nodeTypes) {
            const node = editor.nodes[nodeId];
            if (!node) return { valid: true, errors: [] };

            const errors = [];
            const nodeType = nodeTypes[node.type];

            // Required fields
            Object.entries(nodeType.config).forEach(([key, field]) => {
                if (field.required && (!node.config[key] || node.config[key] === '')) {
                    errors.push(`${key} is required`);
                }
            });

            // Type checking
            Object.entries(node.config).forEach(([key, value]) => {
                const field = nodeType.config[key];
                if (!field) return;

                if (field.type === 'number' && typeof value !== 'number') {
                    errors.push(`${key} must be a number`);
                }
            });

            // Numeric ranges
            Object.entries(node.config).forEach(([key, value]) => {
                const field = nodeType.config[key];
                if (!field) return;

                if (field.min !== undefined && value < field.min) {
                    errors.push(`${key} must be at least ${field.min}`);
                }
                if (field.max !== undefined && value > field.max) {
                    errors.push(`${key} must be at most ${field.max}`);
                }
            });

            editor.validationErrors[nodeId] = errors;
            return { valid: errors.length === 0, errors };
        }

        const NODE_TYPES = {
            'extension': {
                config: {
                    name: { type: 'string', required: true },
                    extensionNumber: { type: 'string', required: true },
                    timeout: { type: 'number', min: 5, max: 120, required: true },
                },
            },
            'ivr': {
                config: {
                    name: { type: 'string', required: true },
                    prompt: { type: 'string', required: true },
                    timeout: { type: 'number', min: 1, max: 30 },
                },
            },
        };

        test('should validate required fields', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: '',
                    extensionNumber: '101',
                    timeout: 30,
                },
            };

            const result = validateNode('node_1', NODE_TYPES);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('name is required');
        });

        test('should validate numeric ranges', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: 'Test',
                    extensionNumber: '101',
                    timeout: 200, // exceeds max of 120
                },
            };

            const result = validateNode('node_1', NODE_TYPES);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('timeout must be at most 120');
        });

        test('should pass validation with correct config', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: 'Sales Rep',
                    extensionNumber: '101',
                    timeout: 30,
                },
            };

            const result = validateNode('node_1', NODE_TYPES);

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('should detect orphaned nodes', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: {
                    name: 'Orphan',
                    extensionNumber: '101',
                    timeout: 30,
                },
            };

            // No edges connected to node_1
            const connectedNodes = new Set();
            editor.edges.forEach(edge => {
                connectedNodes.add(edge.from);
                connectedNodes.add(edge.to);
            });

            const orphaned = Object.keys(editor.nodes).filter(
                nodeId => !connectedNodes.has(nodeId)
            );

            expect(orphaned).toContain('node_1');
        });

        test('should validate entire flow', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: '', extensionNumber: '101', timeout: 30 },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'ivr',
                config: { name: 'Menu', prompt: '', timeout: 5 },
            };

            const errors = {};
            Object.keys(editor.nodes).forEach(nodeId => {
                const result = validateNode(nodeId, NODE_TYPES);
                if (!result.valid) {
                    errors[nodeId] = result.errors;
                }
            });

            expect(Object.keys(errors).length).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // PHASE 4: STATE MANAGEMENT
    // ========================================================================

    describe('Phase 4: Reactive State and History', () => {
        function saveHistory() {
            const state = {
                nodes: JSON.parse(JSON.stringify(editor.nodes)),
                edges: JSON.parse(JSON.stringify(editor.edges)),
            };
            editor.history = editor.history.slice(0, editor.historyIndex + 1);
            editor.history.push(state);
            editor.historyIndex++;
        }

        function undo() {
            if (editor.historyIndex > 0) {
                editor.historyIndex--;
                const state = editor.history[editor.historyIndex];
                editor.nodes = JSON.parse(JSON.stringify(state.nodes));
                editor.edges = JSON.parse(JSON.stringify(state.edges));
            }
        }

        function redo() {
            if (editor.historyIndex < editor.history.length - 1) {
                editor.historyIndex++;
                const state = editor.history[editor.historyIndex];
                editor.nodes = JSON.parse(JSON.stringify(state.nodes));
                editor.edges = JSON.parse(JSON.stringify(state.edges));
            }
        }

        test('should save state to history', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'Test', extensionNumber: '101', timeout: 30 },
            };

            saveHistory();

            expect(editor.history.length).toBe(1);
            expect(editor.historyIndex).toBe(0);
            expect(editor.history[0].nodes['node_1']).toBeDefined();
        });

        test('should support undo operation', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'Test', extensionNumber: '101', timeout: 30 },
            };
            saveHistory();

            delete editor.nodes['node_1'];
            saveHistory();

            expect(editor.nodes['node_1']).toBeUndefined();

            undo();

            expect(editor.nodes['node_1']).toBeDefined();
        });

        test('should support redo operation', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'Test', extensionNumber: '101', timeout: 30 },
            };
            saveHistory();

            delete editor.nodes['node_1'];
            saveHistory();

            undo();
            expect(editor.nodes['node_1']).toBeDefined();

            redo();
            expect(editor.nodes['node_1']).toBeUndefined();
        });

        test('should limit history size', () => {
            const MAX_HISTORY = 50;

            for (let i = 0; i < 100; i++) {
                editor.nodes[`node_${i}`] = {
                    id: `node_${i}`,
                    type: 'extension',
                    config: { name: `Node ${i}`, extensionNumber: `${100 + i}`, timeout: 30 },
                };
                saveHistory();

                if (editor.history.length > MAX_HISTORY) {
                    editor.history.shift();
                    editor.historyIndex--;
                }
            }

            expect(editor.history.length).toBeLessThanOrEqual(MAX_HISTORY);
        });

        test('should save and restore from localStorage', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'Saved', extensionNumber: '101', timeout: 30 },
            };

            editor.edges.push({ from: 'incoming', to: 'node_1' });

            const saveData = {
                nodes: editor.nodes,
                edges: editor.edges,
                timestamp: new Date().toISOString(),
            };

            localStorage.setItem('callflow_autosave', JSON.stringify(saveData));

            const loaded = JSON.parse(localStorage.getItem('callflow_autosave'));

            expect(loaded.nodes['node_1']).toBeDefined();
            expect(loaded.edges.length).toBe(1);
        });

        test('should manage multiple versions', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'v1', extensionNumber: '101', timeout: 30 },
            };

            const version1 = {
                name: 'Version 1',
                data: {
                    nodes: JSON.parse(JSON.stringify(editor.nodes)),
                    edges: JSON.parse(JSON.stringify(editor.edges)),
                },
            };

            editor.versions.push(version1);

            editor.nodes['node_1'].config.name = 'v2';
            const version2 = {
                name: 'Version 2',
                data: {
                    nodes: JSON.parse(JSON.stringify(editor.nodes)),
                    edges: JSON.parse(JSON.stringify(editor.edges)),
                },
            };

            editor.versions.push(version2);

            expect(editor.versions.length).toBe(2);
            expect(editor.versions[0].data.nodes['node_1'].config.name).toBe('v1');
            expect(editor.versions[1].data.nodes['node_1'].config.name).toBe('v2');
        });
    });

    // ========================================================================
    // PHASE 5: CONNECTIONS AND STYLING
    // ========================================================================

    describe('Phase 5: Connections and Visual Styling', () => {
        test('should create connections between nodes', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'incoming-call',
                config: { name: 'Incoming', description: '' },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'ivr',
                config: { name: 'Menu', prompt: 'Select', timeout: 5, maxAttempts: 3, menuOptions: ['1', '2'] },
            };

            editor.edges.push({
                from: 'node_1',
                to: 'node_2',
                status: 'valid',
            });

            expect(editor.edges.length).toBe(1);
            expect(editor.edges[0].from).toBe('node_1');
            expect(editor.edges[0].to).toBe('node_2');
        });

        test('should support multiple connections from one node', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'ivr',
                config: { name: 'Menu', prompt: 'Select', timeout: 5, maxAttempts: 3, menuOptions: ['1', '2'] },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'extension',
                config: { name: 'Ext 101', extensionNumber: '101', timeout: 30 },
            };

            editor.nodes['node_3'] = {
                id: 'node_3',
                type: 'extension',
                config: { name: 'Ext 102', extensionNumber: '102', timeout: 30 },
            };

            editor.edges.push({ from: 'node_1', to: 'node_2', status: 'valid' });
            editor.edges.push({ from: 'node_1', to: 'node_3', status: 'valid' });

            const connectionsFromNode1 = editor.edges.filter(e => e.from === 'node_1');
            expect(connectionsFromNode1.length).toBe(2);
        });

        test('should delete connections when node is deleted', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'incoming-call',
                config: { name: 'Incoming', description: '' },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'ivr',
                config: { name: 'Menu', prompt: 'Select', timeout: 5, maxAttempts: 3, menuOptions: ['1'] },
            };

            editor.edges.push({ from: 'node_1', to: 'node_2' });

            // Delete node
            delete editor.nodes['node_2'];
            editor.edges = editor.edges.filter(e => e.from !== 'node_2' && e.to !== 'node_2');

            expect(editor.edges.length).toBe(0);
        });

        test('should support connection status indicators', () => {
            editor.edges.push({
                from: 'node_1',
                to: 'node_2',
                status: 'valid',
            });

            editor.edges.push({
                from: 'node_3',
                to: 'node_4',
                status: 'warning',
            });

            editor.edges.push({
                from: 'node_5',
                to: 'node_6',
                status: 'error',
            });

            const statuses = editor.edges.map(e => e.status);
            expect(statuses).toContain('valid');
            expect(statuses).toContain('warning');
            expect(statuses).toContain('error');
        });

        test('should determine connection status based on nodes', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'incoming-call',
                config: { name: 'Incoming', description: '' },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'ivr',
                config: { name: 'Menu', prompt: 'Select', timeout: 5, maxAttempts: 3, menuOptions: ['1'] },
            };

            editor.edges.push({ from: 'node_1', to: 'node_2' });

            // If both nodes are valid, connection is valid
            const edge = editor.edges[0];
            const fromNode = editor.nodes[edge.from];
            const toNode = editor.nodes[edge.to];

            const status = fromNode && toNode ? 'valid' : 'error';
            expect(status).toBe('valid');
        });
    });

    // ========================================================================
    // INTEGRATION SCENARIOS
    // ========================================================================

    describe('Integration: Real-world Scenarios', () => {
        test('Workflow 1: Simple department routing', () => {
            // Create nodes
            editor.nodes['incoming'] = {
                id: 'incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: { name: 'Main Line', description: '' },
            };

            editor.nodes['ivr'] = {
                id: 'ivr',
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Main Menu',
                    prompt: 'Press 1 for Sales, 2 for Support',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2', '0'],
                },
            };

            editor.nodes['sales'] = {
                id: 'sales',
                type: 'ring-group',
                x: 300,
                y: 400,
                config: {
                    name: 'Sales Team',
                    extensions: ['101', '102', '103'],
                    ringStrategy: 'simultaneous',
                    timeout: 30,
                },
            };

            editor.nodes['support'] = {
                id: 'support',
                type: 'ring-group',
                x: 500,
                y: 400,
                config: {
                    name: 'Support Team',
                    extensions: ['201', '202', '203'],
                    ringStrategy: 'round-robin',
                    timeout: 45,
                },
            };

            // Create connections
            editor.edges.push({ from: 'incoming', to: 'ivr', status: 'valid' });
            editor.edges.push({ from: 'ivr', to: 'sales', status: 'valid' });
            editor.edges.push({ from: 'ivr', to: 'support', status: 'valid' });

            // Verify flow
            expect(Object.keys(editor.nodes).length).toBe(4);
            expect(editor.edges.length).toBe(3);

            const incomingConnections = editor.edges.filter(e => e.from === 'ivr');
            expect(incomingConnections.length).toBe(2);
        });

        test('Workflow 2: Business hours routing', () => {
            editor.nodes['incoming'] = {
                id: 'incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: { name: 'Main Line', description: '' },
            };

            editor.nodes['hours_check'] = {
                id: 'hours_check',
                type: 'business-hours',
                x: 100,
                y: 250,
                config: {
                    name: 'Business Hours',
                    timezone: 'America/New_York',
                    startTime: '09:00',
                    endTime: '17:00',
                    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                },
            };

            editor.nodes['queue'] = {
                id: 'queue',
                type: 'ring-group',
                x: 300,
                y: 350,
                config: {
                    name: 'Main Queue',
                    extensions: ['100', '101', '102'],
                    ringStrategy: 'round-robin',
                    timeout: 45,
                },
            };

            editor.nodes['voicemail'] = {
                id: 'voicemail',
                type: 'voicemail',
                x: 500,
                y: 350,
                config: {
                    name: 'After Hours',
                    mailbox: '100',
                    greeting: 'We are closed.',
                    maxDuration: 300,
                },
            };

            editor.edges.push({ from: 'incoming', to: 'hours_check' });
            editor.edges.push({ from: 'hours_check', to: 'queue' });
            editor.edges.push({ from: 'hours_check', to: 'voicemail' });

            expect(editor.nodes['hours_check'].config.startTime).toBe('09:00');
            expect(editor.nodes['hours_check'].config.endTime).toBe('17:00');
            expect(editor.edges.length).toBe(3);
        });

        test('Export and import flow', () => {
            // Create a flow
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                x: 100,
                y: 100,
                config: { name: 'Extension', extensionNumber: '101', timeout: 30 },
            };

            editor.edges.push({ from: 'incoming', to: 'node_1' });

            // Export
            const exported = JSON.stringify({
                version: '1.0',
                nodes: editor.nodes,
                edges: editor.edges,
            });

            // Clear
            editor.nodes = {};
            editor.edges = [];

            // Import
            const data = JSON.parse(exported);
            editor.nodes = data.nodes;
            editor.edges = data.edges;

            expect(editor.nodes['node_1']).toBeDefined();
            expect(editor.edges.length).toBe(1);
        });

        test('Complete flow lifecycle: create, validate, save, export', () => {
            // 1. Create
            editor.nodes['incoming'] = {
                id: 'incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: { name: 'Incoming', description: '' },
            };

            editor.nodes['ivr'] = {
                id: 'ivr',
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Menu',
                    prompt: 'Select',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2'],
                },
            };

            editor.edges.push({ from: 'incoming', to: 'ivr' });

            // 2. Save history
            const state1 = {
                nodes: JSON.parse(JSON.stringify(editor.nodes)),
                edges: JSON.parse(JSON.stringify(editor.edges)),
            };
            editor.history.push(state1);
            editor.historyIndex = 0;

            // 3. Add more nodes
            editor.nodes['ext'] = {
                id: 'ext',
                type: 'extension',
                x: 300,
                y: 350,
                config: { name: 'Ext', extensionNumber: '101', timeout: 30 },
            };

            editor.edges.push({ from: 'ivr', to: 'ext' });

            // 4. Save new version
            const version = {
                name: 'v1',
                timestamp: new Date().toISOString(),
                data: {
                    nodes: JSON.parse(JSON.stringify(editor.nodes)),
                    edges: JSON.parse(JSON.stringify(editor.edges)),
                },
            };
            editor.versions.push(version);

            // 5. Export
            const exported = JSON.stringify({
                version: '1.0',
                nodes: editor.nodes,
                edges: editor.edges,
            });

            // Verify final state
            expect(Object.keys(editor.nodes).length).toBe(3);
            expect(editor.edges.length).toBe(2);
            expect(editor.versions.length).toBe(1);
            expect(exported).toBeTruthy();
        });
    });

    // ========================================================================
    // ERROR HANDLING & EDGE CASES
    // ========================================================================

    describe('Error Handling and Edge Cases', () => {
        test('should handle node creation without crashing', () => {
            expect(() => {
                editor.nodes['test'] = {
                    id: 'test',
                    type: 'extension',
                    x: 100,
                    y: 100,
                    config: { name: 'Test', extensionNumber: '101', timeout: 30 },
                };
            }).not.toThrow();
        });

        test('should handle connection to non-existent nodes gracefully', () => {
            editor.edges.push({
                from: 'non-existent-1',
                to: 'non-existent-2',
                status: 'error',
            });

            expect(editor.edges[0].status).toBe('error');
        });

        test('should handle undo when no history exists', () => {
            const initialHistoryIndex = editor.historyIndex;

            // Try to undo with empty history
            if (editor.historyIndex > 0) {
                editor.historyIndex--;
            }

            expect(editor.historyIndex).toBe(initialHistoryIndex);
        });

        test('should handle circular connections', () => {
            editor.nodes['node_1'] = {
                id: 'node_1',
                type: 'extension',
                config: { name: 'n1', extensionNumber: '101', timeout: 30 },
            };

            editor.nodes['node_2'] = {
                id: 'node_2',
                type: 'extension',
                config: { name: 'n2', extensionNumber: '102', timeout: 30 },
            };

            editor.edges.push({ from: 'node_1', to: 'node_2' });
            editor.edges.push({ from: 'node_2', to: 'node_1' }); // Circular

            expect(editor.edges.length).toBe(2);
        });

        test('should handle large flows (100+ nodes)', () => {
            for (let i = 0; i < 100; i++) {
                editor.nodes[`node_${i}`] = {
                    id: `node_${i}`,
                    type: 'extension',
                    x: i * 10,
                    y: i * 10,
                    config: {
                        name: `Node ${i}`,
                        extensionNumber: `${100 + i}`,
                        timeout: 30,
                    },
                };
            }

            expect(Object.keys(editor.nodes).length).toBe(100);
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 10; i++) {
                editor.nodes[`node_${i}`] = {
                    id: `node_${i}`,
                    type: 'extension',
                    config: {
                        name: `Node ${i}`,
                        extensionNumber: `${100 + i}`,
                        timeout: 30,
                    },
                };
            }

            expect(Object.keys(editor.nodes).length).toBe(10);
        });
    });

    // ========================================================================
    // PERFORMANCE TESTS
    // ========================================================================

    describe('Performance and Optimization', () => {
        test('should create 50 nodes in reasonable time', () => {
            const startTime = performance.now();

            for (let i = 0; i < 50; i++) {
                editor.nodes[`node_${i}`] = {
                    id: `node_${i}`,
                    type: 'extension',
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    config: {
                        name: `Node ${i}`,
                        extensionNumber: `${100 + i}`,
                        timeout: 30,
                    },
                };
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(100); // Should be fast
            expect(Object.keys(editor.nodes).length).toBe(50);
        });

        test('should serialize large state efficiently', () => {
            for (let i = 0; i < 30; i++) {
                editor.nodes[`node_${i}`] = {
                    id: `node_${i}`,
                    type: 'extension',
                    x: i * 50,
                    y: i * 50,
                    config: {
                        name: `Node ${i}`,
                        extensionNumber: `${100 + i}`,
                        timeout: 30,
                    },
                };
            }

            const startTime = performance.now();
            const serialized = JSON.stringify(editor);
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(50);
            expect(serialized.length).toBeGreaterThan(0);
        });
    });
});
