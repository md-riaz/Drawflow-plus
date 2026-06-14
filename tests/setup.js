/**
 * Jest Setup File
 * Configures test environment and global test utilities
 */

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = localStorageMock;

// Mock Drawflow
jest.mock('drawflow', () => {
  return jest.fn().mockImplementation(() => {
    return {
      addNode: jest.fn(),
      removeNode: jest.fn(),
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
      clear: jest.fn(),
      export: jest.fn(() => ({})),
      import: jest.fn()
    };
  });
});

// Set up test utilities
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

// Silence console warnings during tests (optional)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};
