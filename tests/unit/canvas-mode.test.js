/**
 * Unit Tests for CanvasMode Extension
 */

import CanvasMode from '../../src/extensions/canvas-mode/index.js';

function makeMockDfp(opts = {}) {
  const precanvas = {
    style: {},
    parentElement: {
      classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
    },
  };

  const drawflow = {
    editor_mode: 'edit',
    precanvas,
  };

  return {
    drawflow,
    extensions: {},
    getExtension: (name) => opts.extensions && opts.extensions[name],
  };
}

describe('CanvasMode', () => {
  describe('install', () => {
    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(typeof dfp.setMode).toBe('function');
      expect(typeof dfp.getMode).toBe('function');
      expect(typeof dfp.isEditable).toBe('function');
      expect(typeof dfp.isPanEnabled).toBe('function');
      expect(typeof dfp.isZoomEnabled).toBe('function');
      expect(typeof dfp.onModeChange).toBe('function');
      expect(typeof dfp.withMode).toBe('function');
    });

    test('applies initial mode from options', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode({ initialMode: 'readonly' });
      cm.install(dfp, {});
      expect(dfp.getMode()).toBe('readonly');
    });

    test('defaults to edit mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(dfp.getMode()).toBe('edit');
    });
  });

  describe('setMode', () => {
    test('transitions to valid mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('readonly');
      expect(dfp.getMode()).toBe('readonly');
    });

    test('returns false for unknown mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const result = dfp.setMode('unknown');
      expect(result).toBe(false);
      expect(dfp.getMode()).toBe('edit');
    });

    test('returns true for valid mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(dfp.setMode('locked')).toBe(true);
    });

    test('no-ops when mode is the same', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const spy = jest.fn();
      dfp.onModeChange(spy);
      dfp.setMode('edit'); // already edit
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('mode mapping to editor_mode', () => {
    test('edit maps to DrawFlow edit', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('edit');
      expect(dfp.drawflow.editor_mode).toBe('edit');
    });

    test('readonly maps to DrawFlow view', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('readonly');
      expect(dfp.drawflow.editor_mode).toBe('view');
    });

    test('preview maps to DrawFlow view', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('preview');
      expect(dfp.drawflow.editor_mode).toBe('view');
    });

    test('locked maps to DrawFlow fixed', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('locked');
      expect(dfp.drawflow.editor_mode).toBe('fixed');
    });
  });

  describe('capability checks', () => {
    test('isEditable is true only in edit mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(dfp.isEditable()).toBe(true);
      dfp.setMode('readonly');
      expect(dfp.isEditable()).toBe(false);
      dfp.setMode('preview');
      expect(dfp.isEditable()).toBe(false);
      dfp.setMode('locked');
      expect(dfp.isEditable()).toBe(false);
    });

    test('isPanEnabled is false only in locked mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(dfp.isPanEnabled()).toBe(true);
      dfp.setMode('readonly');
      expect(dfp.isPanEnabled()).toBe(true);
      dfp.setMode('preview');
      expect(dfp.isPanEnabled()).toBe(true);
      dfp.setMode('locked');
      expect(dfp.isPanEnabled()).toBe(false);
    });

    test('isZoomEnabled is false in preview and locked', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      expect(dfp.isZoomEnabled()).toBe(true);
      dfp.setMode('readonly');
      expect(dfp.isZoomEnabled()).toBe(true);
      dfp.setMode('preview');
      expect(dfp.isZoomEnabled()).toBe(false);
      dfp.setMode('locked');
      expect(dfp.isZoomEnabled()).toBe(false);
    });
  });

  describe('onModeChange', () => {
    test('fires callback with new and previous mode', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const spy = jest.fn();
      dfp.onModeChange(spy);
      dfp.setMode('readonly');
      expect(spy).toHaveBeenCalledWith('readonly', 'edit');
    });

    test('returns unsubscribe function', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const spy = jest.fn();
      const unsub = dfp.onModeChange(spy);
      unsub();
      dfp.setMode('locked');
      expect(spy).not.toHaveBeenCalled();
    });

    test('onModeChange option fires on transition', () => {
      const spy = jest.fn();
      const dfp = makeMockDfp();
      const cm = new CanvasMode({ onModeChange: spy });
      cm.install(dfp, {});
      dfp.setMode('preview');
      expect(spy).toHaveBeenCalledWith('preview', 'edit');
    });
  });

  describe('guard', () => {
    test('executes fn when mode matches', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const spy = jest.fn();
      dfp.guardMode('edit', spy);
      expect(spy).toHaveBeenCalled();
    });

    test('does not execute fn when mode does not match', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      const spy = jest.fn();
      dfp.setMode('readonly');
      dfp.guardMode('edit', spy);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('withMode', () => {
    test('temporarily enters mode and restores', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      let modeInsideFn;
      dfp.withMode('locked', () => { modeInsideFn = dfp.getMode(); });
      expect(modeInsideFn).toBe('locked');
      expect(dfp.getMode()).toBe('edit');
    });

    test('restores mode even if fn throws', () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      try {
        dfp.withMode('locked', () => { throw new Error('oops'); });
      } catch (e) { /* expected */ }
      expect(dfp.getMode()).toBe('edit');
    });

    test('handles async fn with finally', async () => {
      const dfp = makeMockDfp();
      const cm = new CanvasMode();
      cm.install(dfp, {});
      let modeInsideFn;
      await dfp.withMode('locked', async () => {
        modeInsideFn = dfp.getMode();
        return 'done';
      });
      expect(modeInsideFn).toBe('locked');
      expect(dfp.getMode()).toBe('edit');
    });
  });

  describe('AutoSave integration', () => {
    test('calls hold when switching to locked', () => {
      const holdSpy = jest.fn();
      const releaseSpy = jest.fn();
      const dfp = makeMockDfp({
        extensions: {
          autoSave: { hold: holdSpy, release: releaseSpy },
        },
      });
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('locked');
      expect(holdSpy).toHaveBeenCalled();
    });

    test('calls release when exiting locked mode', () => {
      const holdSpy = jest.fn();
      const releaseSpy = jest.fn();
      const dfp = makeMockDfp({
        extensions: {
          autoSave: { hold: holdSpy, release: releaseSpy },
        },
      });
      const cm = new CanvasMode();
      cm.install(dfp, {});
      dfp.setMode('locked');
      dfp.setMode('edit');
      expect(releaseSpy).toHaveBeenCalled();
    });
  });
});
