# Contributing to Drawflow-plus

Thank you for your interest in contributing to Drawflow-plus! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature/fix: `git checkout -b feature/feature-name`
4. Install dependencies: `npm install`

## Development Workflow

### Setting Up Development Environment

```bash
npm install
npm run dev
```

This will start watching for changes and rebuilding the bundle.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Style

This project uses ESLint for code style. Before committing, run:

```bash
npm run lint
npm run lint:fix
```

### Building

To build the library for production:

```bash
npm run build
```

To build for development with source maps:

```bash
npm run build:dev
```

## Making Changes

### File Structure

- `src/extensions/` - Extension modules
- `src/utils/` - Utility functions
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `examples/` - Example applications
- `docs/` - Documentation

### Creating a New Extension

1. Create a new directory in `src/extensions/`
2. Add an `index.js` file with your extension class
3. Implement the `install()` method
4. Export the class as default
5. Add tests in `tests/unit/`
6. Update README.md with usage examples

Example extension structure:

```javascript
class MyExtension {
  constructor(options = {}) {
    this.options = options;
  }

  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };
    
    // Add methods to DrawflowPlus instance
    drawflowPlus.myMethod = this.myMethod.bind(this);
  }

  myMethod() {
    // Implementation
  }
}

export default MyExtension;
```

### Adding Tests

Tests should follow the Jest testing conventions:

- One test file per module
- Use `describe()` for grouping related tests
- Use `test()` or `it()` for individual test cases
- Mock external dependencies

Example test:

```javascript
import MyExtension from '../src/extensions/my-extension/index.js';

describe('MyExtension', () => {
  let extension;

  beforeEach(() => {
    extension = new MyExtension();
  });

  test('should do something', () => {
    const result = extension.myMethod();
    expect(result).toBeDefined();
  });
});
```

## Commit Guidelines

- Use clear, descriptive commit messages
- Start with a verb: "Add", "Fix", "Update", "Remove", etc.
- Keep commits focused on a single change
- Reference issues when applicable: "Fixes #123"

Example commit messages:
- "Add validation rule for phone numbers"
- "Fix state manager memory leak"
- "Update webpack configuration for better performance"

## Pull Request Process

1. Update README.md with relevant documentation changes
2. Add tests for any new functionality
3. Ensure all tests pass: `npm test`
4. Ensure code is linted: `npm run lint`
5. Provide a clear description of the changes
6. Reference any related issues

## Code Review

All pull requests will be reviewed for:

- Code quality and style
- Test coverage
- Documentation
- Performance implications
- Breaking changes

## Documentation

- Update README.md for user-facing changes
- Update JSDoc comments for code changes
- Keep examples up to date

Generate documentation with:

```bash
npm run docs
```

## Reporting Issues

When reporting issues, include:

- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (Node version, OS, browser if applicable)
- Error messages or logs

## Feature Requests

When proposing new features:

- Provide clear use cases
- Explain the benefit to the community
- Discuss implementation approach
- Consider backward compatibility

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or contact the maintainers for clarification.

Thank you for contributing to Drawflow-plus!
