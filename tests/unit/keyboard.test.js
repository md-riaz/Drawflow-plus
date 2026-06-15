/**
 * Unit Tests for KeyboardShortcuts Extension
 */

import KeyboardShortcuts from '../../src/extensions/keyboard/index.js';

let cleanups = [];

afterEach(() => {
  cleanups.forEach(fn => fn());
  cleanups = [];
});

function makeMockDfp({ extensions = {}, methods = {} } = {}) {
  const drawflow = {
    on: jest.fn(),
    zoom: 1,
    node_selected: null,
    removeNodeId: jest.fn(),
    module: 'Home',
    drawflow: { drawflow: { Home: { data: {} } } },
  };
  return {
    drawflow,
    extensions,
    getExtension: (name) => extensions[name] || null,
    ...methods,
  };
}

function fireKey(key, modifiers = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false,
    bubbles: true,
  });
  event.preventDefault = jest.fn();
  document.dispatchEvent(event);
  return event;
}

function installKb(dfp, options = {}) {
  const kb = new KeyboardShortcuts(options);
  kb.install(dfp, options);
  cleanups.push(() => document.removeEventListener('keydown', kb._onKeyDown));
  return kb;
}

describe('KeyboardShortcuts', () => {
  describe('install', () => {
    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      installKb(dfp);
      expect(typeof dfp.bindKey).toBe('function');
      expect(typeof dfp.unbindKey).toBe('function');
      expect(typeof dfp.registerKeyAction).toBe('function');
    });

    test('loads default bindings', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      expect(kb._bindings.get('ctrl+z')).toBe('undo');
      expect(kb._bindings.get('delete')).toBe('delete');
      expect(kb._bindings.get('ctrl+a')).toBe('selectAll');
      expect(kb._bindings.get('0')).toBe('fitToScreen');
    });

    test('accepts custom bindings override', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp, { bindings: { f: 'fitToScreen' } });
      expect(kb._bindings.get('f')).toBe('fitToScreen');
      expect(kb._bindings.has('ctrl+z')).toBe(false);
    });
  });

  describe('bind / unbind', () => {
    test('bind adds a new key mapping', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      dfp.bindKey('ctrl+k', 'fitToScreen');
      expect(kb._bindings.get('ctrl+k')).toBe('fitToScreen');
    });

    test('unbind removes a key mapping', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      dfp.unbindKey('ctrl+z');
      expect(kb._bindings.has('ctrl+z')).toBe(false);
    });

    test('bind is case-insensitive', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      dfp.bindKey('Ctrl+K', 'fitToScreen');
      expect(kb._bindings.get('ctrl+k')).toBe('fitToScreen');
    });
  });

  describe('registerAction', () => {
    test('registers a custom action handler', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      const handler = jest.fn();
      dfp.registerKeyAction('myAction', handler);
      expect(kb._customActions.get('myAction')).toBe(handler);
    });

    test('custom action is invoked when its bound key fires', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);
      const handler = jest.fn();
      dfp.registerKeyAction('myAction', handler);
      dfp.bindKey('ctrl+q', 'myAction');
      fireKey('q', { ctrl: true });
      expect(handler).toHaveBeenCalledWith(dfp, expect.any(KeyboardEvent));
    });
  });

  describe('input guard', () => {
    test('does not fire when an INPUT has focus', () => {
      const dfp = makeMockDfp({
        methods: { fitToScreen: jest.fn() },
      });
      installKb(dfp);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      fireKey('0');
      expect(dfp.fitToScreen).not.toHaveBeenCalled();
      input.remove();
    });

    test('does not fire when a TEXTAREA has focus', () => {
      const dfp = makeMockDfp({
        methods: { fitToScreen: jest.fn() },
      });
      installKb(dfp);

      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      ta.focus();
      fireKey('0');
      expect(dfp.fitToScreen).not.toHaveBeenCalled();
      ta.remove();
    });
  });

  describe('CanvasMode guard for edit-only actions', () => {
    test('delete is blocked in readonly mode', () => {
      const deleteNodes = jest.fn();
      const dfp = makeMockDfp({
        extensions: { canvasMode: { isEditable: () => false } },
        methods: { deleteSelectedNodes: deleteNodes },
      });
      installKb(dfp);
      fireKey('Delete');
      expect(deleteNodes).not.toHaveBeenCalled();
    });

    test('delete fires in edit mode (no canvasMode extension)', () => {
      const deleteNodes = jest.fn();
      const dfp = makeMockDfp({
        extensions: { multiSelect: {} },
        methods: { deleteSelectedNodes: deleteNodes },
      });
      installKb(dfp);
      fireKey('Delete');
      expect(deleteNodes).toHaveBeenCalled();
    });

    test('undo is blocked in readonly mode', () => {
      const undo = jest.fn();
      const dfp = makeMockDfp({
        extensions: {
          canvasMode: { isEditable: () => false },
          state: { getStore: () => ({ undo }) },
        },
      });
      installKb(dfp);
      fireKey('z', { ctrl: true });
      expect(undo).not.toHaveBeenCalled();
    });
  });

  describe('action execution', () => {
    test('fitToScreen (key 0) calls dfp.fitToScreen', () => {
      const fitToScreen = jest.fn();
      const dfp = makeMockDfp({ methods: { fitToScreen } });
      installKb(dfp);
      const ev = fireKey('0');
      expect(fitToScreen).toHaveBeenCalled();
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    test('zoomIn (key +) calls dfp.zoomIn', () => {
      const zoomIn = jest.fn();
      const dfp = makeMockDfp({ methods: { zoomIn } });
      installKb(dfp);
      fireKey('+');
      expect(zoomIn).toHaveBeenCalled();
    });

    test('zoomOut (key -) calls dfp.zoomOut', () => {
      const zoomOut = jest.fn();
      const dfp = makeMockDfp({ methods: { zoomOut } });
      installKb(dfp);
      fireKey('-');
      expect(zoomOut).toHaveBeenCalled();
    });

    test('selectAll (ctrl+a) calls dfp.selectAllNodes', () => {
      const selectAllNodes = jest.fn();
      const dfp = makeMockDfp({ methods: { selectAllNodes } });
      installKb(dfp);
      const ev = fireKey('a', { ctrl: true });
      expect(selectAllNodes).toHaveBeenCalled();
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    test('deselect (Escape) calls dfp.deselectAllNodes', () => {
      const deselectAllNodes = jest.fn();
      const dfp = makeMockDfp({ methods: { deselectAllNodes } });
      installKb(dfp);
      fireKey('Escape');
      expect(deselectAllNodes).toHaveBeenCalled();
    });

    test('duplicate (ctrl+d) calls dfp.duplicateSelectedNodes', () => {
      const duplicateSelectedNodes = jest.fn();
      const dfp = makeMockDfp({ methods: { duplicateSelectedNodes } });
      installKb(dfp);
      const ev = fireKey('d', { ctrl: true });
      expect(duplicateSelectedNodes).toHaveBeenCalled();
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    test('undo (ctrl+z) calls store.undo', () => {
      const undo = jest.fn();
      const dfp = makeMockDfp({
        extensions: { state: { getStore: () => ({ undo }) } },
      });
      installKb(dfp);
      fireKey('z', { ctrl: true });
      expect(undo).toHaveBeenCalled();
    });

    test('redo (ctrl+y) calls store.redo', () => {
      const redo = jest.fn();
      const dfp = makeMockDfp({
        extensions: { state: { getStore: () => ({ redo }) } },
      });
      installKb(dfp);
      fireKey('y', { ctrl: true });
      expect(redo).toHaveBeenCalled();
    });

    test('redo (ctrl+shift+z) calls store.redo', () => {
      const redo = jest.fn();
      const dfp = makeMockDfp({
        extensions: { state: { getStore: () => ({ redo }) } },
      });
      installKb(dfp);
      fireKey('z', { ctrl: true, shift: true });
      expect(redo).toHaveBeenCalled();
    });

    test('delete falls back to df.removeNodeId when no multiSelect', () => {
      const dfp = makeMockDfp();
      dfp.drawflow.node_selected = { id: 'node-1' };
      installKb(dfp);
      fireKey('Delete');
      expect(dfp.drawflow.removeNodeId).toHaveBeenCalledWith('node-1');
    });

    test('does not call preventDefault when action returns false', () => {
      const dfp = makeMockDfp();
      installKb(dfp);
      // ctrl+z with no state extension → undo returns false
      const ev = fireKey('z', { ctrl: true });
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    test('unknown key does nothing', () => {
      const dfp = makeMockDfp();
      installKb(dfp);
      expect(() => fireKey('F9')).not.toThrow();
    });
  });

  describe('_normalizeKey', () => {
    test('produces correct key string for modifier combos', () => {
      const dfp = makeMockDfp();
      const kb = installKb(dfp);

      const makeEvent = (key, mods) => ({
        key,
        ctrlKey: mods.ctrl || false,
        metaKey: mods.meta || false,
        shiftKey: mods.shift || false,
        altKey: mods.alt || false,
      });

      expect(kb._normalizeKey(makeEvent('z', { ctrl: true }))).toBe('ctrl+z');
      expect(kb._normalizeKey(makeEvent('Z', { ctrl: true, shift: true }))).toBe('ctrl+shift+z');
      expect(kb._normalizeKey(makeEvent('Delete', {}))).toBe('delete');
      expect(kb._normalizeKey(makeEvent('0', {}))).toBe('0');
    });
  });
});
