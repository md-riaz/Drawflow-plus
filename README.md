# Drawflow-plus

Enhanced Drawflow library with powerful extensions for building professional node-based editors and visual programming interfaces.

## Features

- **Node Type System**: Register and manage custom node types with templates and validation
- **UI Builder**: Fluent API for building node settings UI forms
- **Validation Framework**: Comprehensive validation rules and error handling
- **State Manager**: Reactive state management with watchers and subscriptions
- **Connection Manager**: Advanced connection styling, metadata, and validation

## Installation

```bash
npm install drawflow-plus
```

## Quick Start

```javascript
import DrawflowPlus from 'drawflow-plus';
import Drawflow from 'drawflow';

// Create instances
const drawflow = new Drawflow(document.getElementById('drawflow'));
const drawflowPlus = new DrawflowPlus();

// Initialize
drawflowPlus.init(drawflow);

// Register extensions
drawflowPlus.use('nodeTypes', new NodeTypeSystem());
drawflowPlus.use('ui', new UIBuilder());
drawflowPlus.use('validation', new ValidationFramework());
drawflowPlus.use('state', new StateManager());
drawflowPlus.use('connections', new ConnectionManager());

// Start using!
drawflowPlus.registerNodeType('input', {
  template: `<div class="node-input">Input</div>`
});
```

## API Documentation

### Node Type System

Register custom node types:

```javascript
drawflowPlus.registerNodeType('custom', {
  template: '<div class="custom-node">Custom</div>',
  inputs: { input_1: 'Input' },
  outputs: { output_1: 'Output' }
});
```

### UI Builder

Create settings forms:

```javascript
const builder = drawflowPlus.createUIBuilder('settings');
builder
  .addTextField('name', { label: 'Node Name', required: true })
  .addNumberField('delay', { label: 'Delay (ms)', min: 0, max: 5000 })
  .addSelectField('type', { 
    label: 'Type',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'priority', label: 'Priority' }
    ]
  });
```

### Validation Framework

Define validation rules:

```javascript
const validator = drawflowPlus.createValidator({
  name: 'required',
  email: ['required', 'email'],
  age: [{ name: 'min', value: 18 }, { name: 'max', value: 100 }]
});

const result = validator.validate({
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
});

if (!result.valid) {
  console.log(result.errors);
}
```

### State Manager

Manage reactive state:

```javascript
const store = drawflowPlus.createStore('app', {
  user: { name: 'John' },
  count: 0
});

// Watch for changes
store.watch('user.name', (newValue, oldValue) => {
  console.log(`Name changed from ${oldValue} to ${newValue}`);
});

// Update state
store.set('user.name', 'Jane');
store.update({ count: 5 });
```

### Connection Manager

Style and validate connections:

```javascript
drawflowPlus.defineConnectionStyle('error', {
  strokeColor: '#ff0000',
  strokeWidth: 3,
  animatedArrow: true
});

const connBuilder = drawflowPlus.createBuilder(1, 'output_1')
  .to(2, 'input_1')
  .withStyle('error')
  .ofType('error')
  .withLabel('Error path')
  .required();

const connection = connBuilder.build();
```

## Project Structure

```
drawflow-plus/
├── src/
│   ├── extensions/
│   │   ├── node-types/       # Node type management
│   │   ├── ui/               # UI builder
│   │   ├── validation/        # Validation framework
│   │   ├── state/            # State management
│   │   └── connections/      # Connection management
│   ├── utils/                # Utility functions
│   └── index.js              # Main entry point
├── examples/
│   ├── call-flow/            # Call flow example
│   ├── workflow/             # Workflow example
│   └── basic/                # Basic example
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── docs/                     # Documentation
├── webpack.config.js         # Webpack configuration
├── jest.config.js            # Jest configuration
└── package.json              # Package metadata
```

## Scripts

- `npm run build` - Build for production
- `npm run build:dev` - Build for development with source maps
- `npm run dev` - Watch mode for development
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Lint source code
- `npm run lint:fix` - Fix linting issues
- `npm run docs` - Generate JSDoc documentation

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`

## Testing

Tests are located in `tests/` directory. Run with:

```bash
npm test
```

View coverage report:

```bash
npm run test:coverage
```

## Documentation

JSDoc documentation is generated in `docs/html/`. Generate with:

```bash
npm run docs
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires ES6 support.

## License

MIT

## Author

md-riaz

## Contributing

Contributions are welcome! Please follow the coding standards and include tests for any new features.

## Roadmap

- [x] Core extension system
- [x] Node type management
- [x] UI builder
- [x] Validation framework
- [x] State management
- [x] Connection management
- [ ] Advanced styling system
- [ ] Plugin marketplace
- [ ] Visual debugger
- [ ] Performance monitoring

## Support

For issues and feature requests, visit the [GitHub repository](https://github.com/md-riaz/Drawflow-plus).
