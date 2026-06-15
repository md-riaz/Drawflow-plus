/**
 * Unit Tests for ViewportManager Extension
 */

import ViewportManager from '../../src/extensions/viewport/index.js';

function makeMockDfp(nodes = {}) {
  const precanvas = {
    style: {},
    parentElement: {
      classList: { add: jest.fn(), remove: jest.fn() },
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      offsetWidth: 800,
      offsetHeight: 600,
      style: { setProperty: jest.fn() },
      appendChild: jest.fn(),
    },
  };

  const drawflow = {
    zoom: 1,
    canvas_x: 0,
    canvas_y: 0,
    zoom_min: 0.1,
    zoom_max: 2.5,
    precanvas,
    drawflow: {
      drawflow: {
        Home: { data: nodes },
      },
    },
  };

  return {
    drawflow,
    extensions: {},
    getExtension: () => null,
  };
}

function installViewport(dfp, options = {}) {
  const vm = new ViewportManager(options);
  // manually call install
  vm.install(dfp, options);
  return vm;
}

describe('ViewportManager', () => {
  describe('install', () => {
    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      installViewport(dfp);
      expect(typeof dfp.fitToScreen).toBe('function');
      expect(typeof dfp.zoomIn).toBe('function');
      expect(typeof dfp.zoomOut).toBe('function');
      expect(typeof dfp.zoomTo).toBe('function');
      expect(typeof dfp.panTo).toBe('function');
      expect(typeof dfp.getViewport).toBe('function');
      expect(typeof dfp.setViewport).toBe('function');
      expect(typeof dfp.onViewportChange).toBe('function');
    });

    test('sets zoom_min and zoom_max on drawflow instance', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.3, zoomMax: 1.8 });
      expect(dfp.drawflow.zoom_min).toBe(0.3);
      expect(dfp.drawflow.zoom_max).toBe(1.8);
    });
  });

  describe('zoomTo', () => {
    test('clamps to zoomMin', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.2, zoomMax: 2.0 });
      dfp.zoomTo(0.01);
      expect(dfp.drawflow.zoom).toBe(0.2);
    });

    test('clamps to zoomMax', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.2, zoomMax: 2.0 });
      dfp.zoomTo(5.0);
      expect(dfp.drawflow.zoom).toBe(2.0);
    });

    test('sets exact value within bounds', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.2, zoomMax: 2.0 });
      dfp.zoomTo(1.5);
      expect(dfp.drawflow.zoom).toBe(1.5);
    });
  });

  describe('zoomIn / zoomOut', () => {
    test('zoomIn increments by zoomStep', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomStep: 0.1 });
      dfp.drawflow.zoom = 1.0;
      dfp.zoomIn();
      expect(dfp.drawflow.zoom).toBeCloseTo(1.1);
    });

    test('zoomOut decrements by zoomStep', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomStep: 0.1 });
      dfp.drawflow.zoom = 1.0;
      dfp.zoomOut();
      expect(dfp.drawflow.zoom).toBeCloseTo(0.9);
    });
  });

  describe('zoomAtPoint', () => {
    test('preserves world point under cursor after zoom', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.1, zoomMax: 3.0 });
      dfp.drawflow.zoom = 1.0;
      dfp.drawflow.canvas_x = 0;
      dfp.drawflow.canvas_y = 0;

      const screenX = 400;
      const screenY = 300;
      // World point before zoom = (400/1, 300/1) = (400, 300)
      dfp.zoomAtPoint(2.0, screenX, screenY);

      // After zoom to 2.0, canvas offsets should be adjusted so world point is still under cursor
      // canvas_x = screenX - worldX * newZoom = 400 - 400*2 = -400
      expect(dfp.drawflow.canvas_x).toBeCloseTo(-400);
      expect(dfp.drawflow.canvas_y).toBeCloseTo(-300);
      expect(dfp.drawflow.zoom).toBe(2.0);
    });
  });

  describe('fitToScreen', () => {
    test('resets to origin when no nodes', () => {
      const dfp = makeMockDfp({});
      installViewport(dfp);
      dfp.drawflow.zoom = 0.5;
      dfp.drawflow.canvas_x = 100;
      dfp.fitToScreen();
      expect(dfp.drawflow.zoom).toBe(1);
      expect(dfp.drawflow.canvas_x).toBe(0);
      expect(dfp.drawflow.canvas_y).toBe(0);
    });

    test('computes zoom and offsets to fit nodes', () => {
      const nodes = {
        1: { pos_x: 0, pos_y: 0 },
        2: { pos_x: 500, pos_y: 400 },
      };
      const dfp = makeMockDfp(nodes);
      installViewport(dfp, { fitPadding: 0 });
      dfp.fitToScreen();
      // Should have computed a zoom and non-trivial canvas_x/y
      expect(dfp.drawflow.zoom).toBeGreaterThan(0);
      expect(dfp.drawflow.zoom).toBeLessThanOrEqual(2.5);
    });
  });

  describe('getViewport / setViewport', () => {
    test('getViewport returns current state', () => {
      const dfp = makeMockDfp();
      installViewport(dfp);
      dfp.drawflow.zoom = 1.2;
      dfp.drawflow.canvas_x = 50;
      dfp.drawflow.canvas_y = -30;
      const vp = dfp.getViewport();
      expect(vp.zoom).toBe(1.2);
      expect(vp.x).toBe(50);
      expect(vp.y).toBe(-30);
    });

    test('setViewport restores state', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.1, zoomMax: 3.0 });
      dfp.setViewport({ zoom: 0.8, x: 100, y: 200 });
      expect(dfp.drawflow.zoom).toBe(0.8);
      expect(dfp.drawflow.canvas_x).toBe(100);
      expect(dfp.drawflow.canvas_y).toBe(200);
    });

    test('setViewport clamps zoom', () => {
      const dfp = makeMockDfp();
      installViewport(dfp, { zoomMin: 0.5, zoomMax: 1.5 });
      dfp.setViewport({ zoom: 5.0 });
      expect(dfp.drawflow.zoom).toBe(1.5);
    });
  });

  describe('onViewportChange', () => {
    test('fires callback after zoomTo', () => {
      const dfp = makeMockDfp();
      installViewport(dfp);
      const spy = jest.fn();
      dfp.onViewportChange(spy);
      dfp.zoomTo(1.5);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({ reason: 'zoom', zoom: 1.5 });
    });

    test('returns unsubscribe function', () => {
      const dfp = makeMockDfp();
      installViewport(dfp);
      const spy = jest.fn();
      const unsub = dfp.onViewportChange(spy);
      unsub();
      dfp.zoomTo(1.3);
      expect(spy).not.toHaveBeenCalled();
    });

    test('fires only once per fitToScreen call', () => {
      const nodes = { 1: { pos_x: 0, pos_y: 0 } };
      const dfp = makeMockDfp(nodes);
      installViewport(dfp);
      const spy = jest.fn();
      dfp.onViewportChange(spy);
      dfp.fitToScreen();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('panTo', () => {
    test('centers viewport on world coordinate', () => {
      const dfp = makeMockDfp();
      installViewport(dfp);
      dfp.drawflow.zoom = 1;
      dfp.panTo(100, 200);
      // canvas_x = viewW/2 - worldX * zoom = 400 - 100 = 300
      expect(dfp.drawflow.canvas_x).toBeCloseTo(300);
      expect(dfp.drawflow.canvas_y).toBeCloseTo(100);
    });
  });
});
