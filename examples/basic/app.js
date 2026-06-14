/**
 * Basic Example Application
 * Demonstrates core Drawflow-plus functionality
 */

// Initialize Drawflow and Drawflow-plus
let drawflowInstance = null;
let drawflowPlus = null;
let nodeCounter = 1;

document.addEventListener('DOMContentLoaded', function() {
  initializeDrawflow();
  setupDragAndDrop();
});

/**
 * Initialize Drawflow and Drawflow-plus
 */
function initializeDrawflow() {
  const container = document.getElementById('drawflow');
  drawflowInstance = new Drawflow(container);

  // Initialize Drawflow-plus
  drawflowPlus = new DrawflowPlus({
    nodeTypes: {},
    validation: { strict: false },
    state: { persisted: true }
  });

  drawflowPlus.init(drawflowInstance);

  // Register extensions
  drawflowPlus.use('nodeTypes', new DrawflowPlus.NodeTypeSystem());
  drawflowPlus.use('ui', new DrawflowPlus.UIBuilder());
  drawflowPlus.use('validation', new DrawflowPlus.ValidationFramework());
  drawflowPlus.use('state', new DrawflowPlus.StateManager());
  drawflowPlus.use('connections', new DrawflowPlus.ConnectionManager());

  // Register custom node types
  registerNodeTypes();

  // Define connection styles
  defineConnectionStyles();

  // Create initial state
  const appState = drawflowPlus.createStore('app', {
    nodes: [],
    connections: []
  });

  // Listen to node/connection changes
  listenToChanges();
}

/**
 * Register custom node types
 */
function registerNodeTypes() {
  // Input node type
  drawflowPlus.registerNodeType('input', {
    template: `
      <div class="title">Input Node</div>
      <div class="content">
        <label>Name:</label>
        <input type="text" placeholder="Enter name" class="input-name">
      </div>
    `,
    outputs: {
      output_1: 'Output'
    }
  });

  // Trigger node type
  drawflowPlus.registerNodeType('trigger', {
    template: `
      <div class="title">Trigger</div>
      <div class="content">
        <label>Event:</label>
        <input type="text" placeholder="Event name" class="input-event">
      </div>
    `,
    outputs: {
      output_1: 'Trigger'
    }
  });

  // Condition node type
  drawflowPlus.registerNodeType('condition', {
    template: `
      <div class="title">Condition</div>
      <div class="content">
        <label>Logic:</label>
        <input type="text" placeholder="Condition" class="input-logic">
      </div>
    `,
    inputs: {
      input_1: 'Input'
    },
    outputs: {
      output_1: 'True',
      output_2: 'False'
    }
  });

  // Operation node type
  drawflowPlus.registerNodeType('operation', {
    template: `
      <div class="title">Operation</div>
      <div class="content">
        <label>Operation:</label>
        <select class="input-operation">
          <option value="add">Add</option>
          <option value="subtract">Subtract</option>
          <option value="multiply">Multiply</option>
          <option value="divide">Divide</option>
        </select>
      </div>
    `,
    inputs: {
      input_1: 'Value 1',
      input_2: 'Value 2'
    },
    outputs: {
      output_1: 'Result'
    }
  });

  // Output node type
  drawflowPlus.registerNodeType('output', {
    template: `
      <div class="title">Output</div>
      <div class="content">
        <label>Result:</label>
        <div class="output-display"></div>
      </div>
    `,
    inputs: {
      input_1: 'Input'
    }
  });
}

/**
 * Define connection styles
 */
function defineConnectionStyles() {
  drawflowPlus.defineConnectionStyle('normal', {
    strokeColor: '#3498db',
    strokeWidth: 2,
    opacity: 1
  });

  drawflowPlus.defineConnectionStyle('success', {
    strokeColor: '#2ecc71',
    strokeWidth: 2,
    opacity: 1
  });

  drawflowPlus.defineConnectionStyle('error', {
    strokeColor: '#e74c3c',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    opacity: 1
  });
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
  const nodeTemplates = document.querySelectorAll('.node-template');

  nodeTemplates.forEach(template => {
    template.addEventListener('dragstart', handleDragStart);
  });

  const drawflowArea = document.getElementById('drawflow');
  drawflowArea.addEventListener('dragover', handleDragOver);
  drawflowArea.addEventListener('drop', handleDrop);
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('nodeType', e.target.dataset.nodeType);
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop
 */
function handleDrop(e) {
  e.preventDefault();

  const nodeType = e.dataTransfer.getData('nodeType');
  if (!nodeType) return;

  const drawflowArea = document.getElementById('drawflow');
  const rect = drawflowArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  addNode(nodeType, x, y);
}

/**
 * Add a new node to the canvas
 */
function addNode(nodeType, x = 100, y = 100) {
  const nodeConfig = drawflowPlus.getNodeType(nodeType);
  if (!nodeConfig) {
    console.error(`Unknown node type: ${nodeType}`);
    return;
  }

  const nodeId = nodeCounter++;
  const nodeData = {
    id: nodeId,
    type: nodeType,
    data: {},
    position: { x, y }
  };

  // Add to Drawflow
  drawflowInstance.addNode(nodeType, nodeConfig.outputs || {}, nodeConfig.inputs || {}, x, y);

  // Update app state
  const appState = drawflowPlus.getStore('app');
  if (appState) {
    const nodes = appState.get('nodes') || [];
    nodes.push(nodeData);
    appState.set('nodes', nodes);
  }

  console.log(`Node added: ${nodeType} (ID: ${nodeId})`);
}

/**
 * Listen to canvas changes
 */
function listenToChanges() {
  // This would be connected to Drawflow's event system in a real implementation
  console.log('Listening to canvas changes...');
}

/**
 * Clear the canvas
 */
function clearCanvas() {
  if (confirm('Are you sure you want to clear the canvas?')) {
    drawflowInstance.clear();
    nodeCounter = 1;

    const appState = drawflowPlus.getStore('app');
    if (appState) {
      appState.set('nodes', []);
      appState.set('connections', []);
    }

    console.log('Canvas cleared');
  }
}

/**
 * Export canvas as JSON
 */
function exportJSON() {
  const data = drawflowInstance.export();
  const json = JSON.stringify(data, null, 2);

  console.log('Exported JSON:', json);

  // Create download link
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
  element.setAttribute('download', 'drawflow-export.json');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Delete selected node
 */
function deleteSelected() {
  // This would use Drawflow's selection API
  console.log('Delete selected functionality');
}
