# Drawflow-plus Quick Start Guide

## Installation & Setup

```bash
# 1. Navigate to the project
cd drawflow-plus

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Building

```bash
# Development build (with source maps)
npm run build:dev

# Production build (minified)
npm run build
```

## Code Quality

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Documentation

```bash
# Generate JSDoc documentation
npm run docs

# Open generated docs
open docs/html/index.html
```

## Project Structure

```
src/
  ├── index.js                    # Main DrawflowPlus class
  ├── utils/index.js              # Utility functions
  └── extensions/
      ├── node-types/             # NodeTypeSystem
      ├── ui/                     # UIBuilder
      ├── validation/             # ValidationFramework
      ├── state/                  # StateManager
      └── connections/            # ConnectionManager

examples/
  └── basic/                      # Basic example app

tests/
  ├── unit/                       # Unit tests (84 tests)
  └── integration/                # Integration tests

docs/                             # Generated documentation
```

## Quick Examples

### Initialize DrawflowPlus

```javascript
import DrawflowPlus from 'drawflow-plus';

const drawflowPlus = new DrawflowPlus();
drawflowPlus.init(drawflowInstance);

// Register extensions
drawflowPlus.use('nodeTypes', new DrawflowPlus.NodeTypeSystem());
drawflowPlus.use('validation', new DrawflowPlus.ValidationFramework());
```

### Register a Node Type

```javascript
drawflowPlus.registerNodeType('custom', {
  template: '<div class="custom-node">Custom</div>',
  inputs: { input_1: 'Input' },
  outputs: { output_1: 'Output' }
});
```

### Create a Validation Schema

```javascript
const validator = drawflowPlus.createValidator({
  name: 'required',
  email: ['required', 'email'],
  age: [{ name: 'min', value: 18 }]
});

const result = validator.validate({ name: 'John', email: 'john@example.com', age: 25 });
```

### Manage State

```javascript
const store = drawflowPlus.createStore('app', {
  user: { name: 'John' },
  count: 0
});

store.watch('user.name', (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`);
});

store.set('user.name', 'Jane');
```

### Define Connection Styles

```javascript
drawflowPlus.defineConnectionStyle('error', {
  strokeColor: '#ff0000',
  strokeWidth: 3,
  animatedArrow: true
});
```

## Common Tasks

### Add a New Utility Function

1. Edit `src/utils/index.js`
2. Add your function with JSDoc comments
3. Add tests in `tests/unit/utils.test.js`
4. Run `npm test` to verify

### Create a New Extension

1. Create `src/extensions/my-extension/index.js`
2. Implement the `install()` method
3. Add tests in `tests/unit/my-extension.test.js`
4. Update `src/index.js` to export it

### Fix Linting Issues

```bash
npm run lint:fix
```

### Check Test Coverage

```bash
npm run test:coverage
# Coverage report is in coverage/
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.js` | Main DrawflowPlus class |
| `package.json` | Dependencies and scripts |
| `webpack.config.js` | Build configuration |
| `jest.config.js` | Test configuration |
| `.eslintrc.json` | Linting rules |
| `README.md` | Full documentation |
| `SETUP_SUMMARY.md` | Detailed setup info |

## Troubleshooting

### Tests not running?
```bash
npm install
npm test
```

### Build failing?
```bash
npm run lint:fix
npm run build:dev
```

### Documentation not generating?
```bash
npm run docs
# Check docs/html/index.html
```

## Next Development Phases

| Phase | Task | Status |
|-------|------|--------|
| 1 | Implement Node Type System | Pending |
| 2 | Implement Settings UI Builder | Pending |
| 3 | Implement Validation Framework | Pending |
| 4 | Implement Reactive State Binding | Pending |
| 5 | Implement Connection Management | Pending |

## Resources

- **Main Documentation**: [README.md](README.md)
- **Setup Details**: [SETUP_SUMMARY.md](SETUP_SUMMARY.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **API Examples**: [README.md](README.md) (sections on each extension)

## Support

- Check [SETUP_SUMMARY.md](SETUP_SUMMARY.md) for detailed setup info
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Run tests: `npm test`
- Generate docs: `npm run docs`

---

**Happy developing!** Start with `npm run dev` and begin implementing Phase 1.
