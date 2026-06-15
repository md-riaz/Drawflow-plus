/**
 * Unit Tests for GridBackground Extension
 */

import GridBackground from '../../src/extensions/grid/index.js';

// Prevent jsdom's real MutationObserver from rejecting plain-object nodes
beforeEach(() => {
  global.MutationObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
});
afterEach(() => {
  delete global.MutationObserver;
});

function makeMockDfp({ viewportExtension = null } = {}) {
  const precanvas = {
    style: { transform: '' },
    parentElement: {
      classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
      style: { setProperty: jest.fn() },
    },
  };

  const drawflow = {
    zoom: 1,
    canvas_x: 0,
    canvas_y: 0,
    precanvas,
    module: 'Home',
    drawflow: { drawflow: { Home: { data: {} } } },
  };

  const extensions = viewportExtension ? { viewport: viewportExtension } : {};

  return {
    drawflow,
    extensions,
    getExtension: (name) => extensions[name] || null,
    _viewportChangeCallbacks: [],
    onViewportChange: jest.fn(function (cb) { this._viewportChangeCallbacks.push(cb); }),
  };
}

function installGrid(dfp, options = {}) {
  const grid = new GridBackground(options);
  grid.install(dfp, options);
  return grid;
}

describe('GridBackground', () => {
  describe('install', () => {
    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      installGrid(dfp);
      expect(typeof dfp.setGridStyle).toBe('function');
      expect(typeof dfp.setGridSize).toBe('function');
      expect(typeof dfp.toggleGrid).toBe('function');
    });

    test('adds dfp-canvas-grid class to wrapper', () => {
      const dfp = makeMockDfp();
      installGrid(dfp);
      expect(dfp.drawflow.precanvas.parentElement.classList.add).toHaveBeenCalledWith('dfp-canvas-grid');
    });

    test('subscribes to ViewportManager when viewport extension is present', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      installGrid(dfp);
      expect(dfp.onViewportChange).toHaveBeenCalled();
    });

    test('falls back to MutationObserver when no viewport extension', () => {
      const dfp = makeMockDfp();
      const observeSpy = jest.fn();
      global.MutationObserver = jest.fn(() => ({ observe: observeSpy, disconnect: jest.fn() }));
      installGrid(dfp);
      expect(observeSpy).toHaveBeenCalledWith(dfp.drawflow.precanvas, expect.objectContaining({ attributes: true }));
      delete global.MutationObserver;
    });

    test('injects a style element into document.head', () => {
      const beforeCount = document.head.querySelectorAll('style').length;
      const dfp = makeMockDfp();
      installGrid(dfp);
      expect(document.head.querySelectorAll('style').length).toBe(beforeCount + 1);
    });
  });

  describe('_update — CSS custom properties', () => {
    test('sets --dfp-grid-step on wrapper', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp, { gridSize: 16 });
      grid._update(0, 0, 1);
      const wrapper = dfp.drawflow.precanvas.parentElement;
      expect(wrapper.style.setProperty).toHaveBeenCalledWith('--dfp-grid-step', expect.stringContaining('px'));
    });

    test('step scales with zoom (clamped between 0.45 and 2.4)', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp, { gridSize: 10 });

      grid._update(0, 0, 0.1);
      const callsLowZoom = dfp.drawflow.precanvas.parentElement.style.setProperty.mock.calls
        .filter(c => c[0] === '--dfp-grid-step');
      const lowStepValue = parseFloat(callsLowZoom[callsLowZoom.length - 1][1]);
      expect(lowStepValue).toBeCloseTo(10 * 0.45, 1);

      grid._update(0, 0, 10);
      const callsHighZoom = dfp.drawflow.precanvas.parentElement.style.setProperty.mock.calls
        .filter(c => c[0] === '--dfp-grid-step');
      const highStepValue = parseFloat(callsHighZoom[callsHighZoom.length - 1][1]);
      expect(highStepValue).toBeCloseTo(10 * 2.4, 1);
    });

    test('offsets wrap correctly (modulo step)', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp, { gridSize: 10 });
      grid._update(25, 0, 1);
      const wrapper = dfp.drawflow.precanvas.parentElement;
      const xCall = wrapper.style.setProperty.mock.calls.find(c => c[0] === '--dfp-grid-offset-x');
      const offsetX = parseFloat(xCall[1]);
      expect(offsetX).toBeGreaterThanOrEqual(0);
      expect(offsetX).toBeLessThan(10);
    });
  });

  describe('viewport change integration', () => {
    test('calls _update when viewport change fires', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp);
      const updateSpy = jest.spyOn(grid, '_update');

      const cb = dfp._viewportChangeCallbacks[0];
      cb({ x: 10, y: 20, zoom: 1.5 });

      expect(updateSpy).toHaveBeenCalledWith(10, 20, 1.5);
    });
  });

  describe('MutationObserver fallback', () => {
    test('parses transform string and calls _update', () => {
      const dfp = makeMockDfp();
      let mutationCallback;
      global.MutationObserver = jest.fn((cb) => {
        mutationCallback = cb;
        return { observe: jest.fn(), disconnect: jest.fn() };
      });
      const grid = installGrid(dfp);
      const updateSpy = jest.spyOn(grid, '_update');

      dfp.drawflow.precanvas.style.transform = 'translate(50px, 30px) scale(1.2)';
      mutationCallback([]);

      expect(updateSpy).toHaveBeenCalledWith(50, 30, 1.2);
      delete global.MutationObserver;
    });

    test('does not call _update when transform does not match pattern', () => {
      const dfp = makeMockDfp();
      let mutationCallback;
      global.MutationObserver = jest.fn((cb) => {
        mutationCallback = cb;
        return { observe: jest.fn(), disconnect: jest.fn() };
      });
      const grid = installGrid(dfp);
      const updateSpy = jest.spyOn(grid, '_update');

      dfp.drawflow.precanvas.style.transform = 'none';
      mutationCallback([]);

      expect(updateSpy).not.toHaveBeenCalled();
      delete global.MutationObserver;
    });
  });

  describe('setStyle', () => {
    test('updates style option and rebuilds CSS', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp);
      const rebuildSpy = jest.spyOn(grid, '_rebuildStyles');
      grid.setStyle('lines');
      expect(grid.options.style).toBe('lines');
      expect(rebuildSpy).toHaveBeenCalled();
    });

    test('CSS contains linear-gradient for lines style', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp, { style: 'lines' });
      expect(grid._buildCSS()).toContain('linear-gradient');
    });

    test('CSS contains radial-gradient for dots style', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp, { style: 'dots' });
      expect(grid._buildCSS()).toContain('radial-gradient');
    });
  });

  describe('setSize', () => {
    test('updates gridSize option', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp);
      grid.setSize(32);
      expect(grid.options.gridSize).toBe(32);
    });

    test('triggers _update with current drawflow transform values', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      dfp.drawflow.canvas_x = 5;
      dfp.drawflow.canvas_y = 10;
      dfp.drawflow.zoom = 1.5;
      const grid = installGrid(dfp);
      const updateSpy = jest.spyOn(grid, '_update');
      grid.setSize(20);
      expect(updateSpy).toHaveBeenCalledWith(5, 10, 1.5);
    });
  });

  describe('toggle', () => {
    test('toggles dfp-canvas-grid class on wrapper', () => {
      const dfp = makeMockDfp({ viewportExtension: {} });
      const grid = installGrid(dfp);
      const wrapper = dfp.drawflow.precanvas.parentElement;
      grid.toggle(false);
      expect(wrapper.classList.toggle).toHaveBeenCalledWith('dfp-canvas-grid', false);
      grid.toggle(true);
      expect(wrapper.classList.toggle).toHaveBeenCalledWith('dfp-canvas-grid', true);
    });
  });
});
