/**
 * Jest Setup File
 * Configures test environment and global test utilities
 */

// Polyfill structuredClone for older jsdom environments
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = localStorageMock;

// Mock Drawflow — provide a virtual module so tests work without the
// optional peer dependency being installed.
jest.mock(
  'drawflow',
  () => {
    return jest.fn().mockImplementation(() => ({
      addNode: jest.fn(),
      removeNode: jest.fn(),
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
      clear: jest.fn(),
      export: jest.fn(() => ({})),
      import: jest.fn(),
      on: jest.fn(),
      zoom: 1,
      canvas_x: 0,
      canvas_y: 0,
      zoom_min: 0.1,
      zoom_max: 2.5,
      editor_mode: 'edit',
      precanvas: null,
      drawflow: { drawflow: { Home: { data: {} } } },
    }));
  },
  { virtual: true }
);

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
