/**
 * Unit Tests for State Manager - Phase 4
 * Tests reactive state, adapters, and history management
 */

import StateManager, { ReactiveState } from '../../src/extensions/state/index.js';
import HistoryManager from '../../src/extensions/state/history.js';
import VanillaAdapter from '../../src/extensions/state/adapters/vanilla-adapter.js';
import ReefAdapter from '../../src/extensions/state/adapters/reef-adapter.js';

describe('StateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new StateManager();
  });

  describe('createReactiveState', () => {
    test('should create reactive state', () => {
      const state = manager.createReactiveState('test', { initialState: { count: 0 } });
      expect(state).toBeInstanceOf(ReactiveState);
      expect(state.name).toBe('test');
    });

    test('should initialize with initial state', () => {
      const state = manager.createReactiveState('test', { initialState: { count: 0 } });
      expect(state.get('count')).toBe(0);
    });
  });

  describe('getReactiveState', () => {
    test('should retrieve created state', () => {
      const created = manager.createReactiveState('test', { initialState: { count: 0 } });
      const retrieved = manager.getReactiveState('test');
      expect(retrieved).toBe(created);
    });

    test('should return undefined for non-existent state', () => {
      expect(manager.getReactiveState('nonexistent')).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    test('should subscribe to state changes', () => {
      const state = manager.createReactiveState('test', { initialState: { count: 0 } });
      const callback = jest.fn();
      manager.subscribe('test', 'count', callback);
      state.set('count', 5);
      expect(callback).toHaveBeenCalledWith(5, 0, expect.any(Object));
    });

    test('should throw for non-existent store', () => {
      expect(() => {
        manager.subscribe('nonexistent', 'path', () => {});
      }).toThrow();
    });
  });

  describe('store aliases', () => {
    test('createStore should work like createReactiveState', () => {
      const store = manager.createStore('test', { count: 0 });
      expect(store).toBeInstanceOf(ReactiveState);
    });

    test('getStore should work like getReactiveState', () => {
      const store = manager.createStore('test', { count: 0 });
      expect(manager.getStore('test')).toBe(store);
    });
  });
});

describe('ReactiveState', () => {
  let state;

  beforeEach(() => {
    state = new ReactiveState('test', {
      initialState: { count: 0, user: { name: 'John', age: 30 } }
    });
  });

  describe('get', () => {
    test('should get simple property', () => {
      expect(state.get('count')).toBe(0);
    });

    test('should get nested property', () => {
      expect(state.get('user.name')).toBe('John');
      expect(state.get('user.age')).toBe(30);
    });

    test('should return entire state with no path', () => {
      expect(state.get()).toEqual({ count: 0, user: { name: 'John', age: 30 } });
    });

    test('should return undefined for non-existent property', () => {
      expect(state.get('nonexistent')).toBeUndefined();
    });

    test('should return copy, not reference', () => {
      const copy1 = state.get();
      const copy2 = state.get();
      expect(copy1).not.toBe(copy2);
      expect(copy1).toEqual(copy2);
    });
  });

  describe('set', () => {
    test('should set simple property', () => {
      state.set('count', 5);
      expect(state.get('count')).toBe(5);
    });

    test('should set nested property', () => {
      state.set('user.name', 'Jane');
      expect(state.get('user.name')).toBe('Jane');
    });

    test('should create intermediate objects', () => {
      state.set('deep.nested.value', 42);
      expect(state.get('deep.nested.value')).toBe(42);
    });

    test('should not notify if value unchanged', () => {
      const callback = jest.fn();
      state.subscribe('count', callback);
      state.set('count', 0); // Same value
      expect(callback).not.toHaveBeenCalled();
    });

    test('should track mutations', () => {
      state.set('count', 5);
      const mutations = state.getMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].path).toBe('count');
      expect(mutations[0].oldValue).toBe(0);
      expect(mutations[0].newValue).toBe(5);
    });
  });

  describe('mutate', () => {
    test('should mutate with callback', () => {
      state.mutate('count', (val) => val + 1);
      expect(state.get('count')).toBe(1);
    });

    test('should work with objects', () => {
      state.mutate('user', (user) => ({ ...user, age: 31 }));
      expect(state.get('user.age')).toBe(31);
    });
  });

  describe('batch', () => {
    test('should batch mutations', () => {
      const mutations = [];
      const callback = jest.fn();
      state.subscribe('count', callback);

      state.batch((s) => {
        s.set('count', 1);
        s.set('count', 2);
        s.set('count', 3);
      });

      expect(state.get('count')).toBe(3);
    });
  });

  describe('subscribe', () => {
    test('should notify on change', () => {
      const callback = jest.fn();
      state.subscribe('count', callback);
      state.set('count', 5);
      expect(callback).toHaveBeenCalledWith(5, 0);
    });

    test('should support wildcard subscriptions', () => {
      const callback = jest.fn();
      state.subscribe('*', callback);
      state.set('count', 5);
      expect(callback).toHaveBeenCalled();
    });

    test('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = state.subscribe('count', callback);
      state.set('count', 5);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      state.set('count', 10);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      state.subscribe('count', callback1);
      state.subscribe('count', callback2);
      state.set('count', 5);
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('snapshot and restore', () => {
    test('should create snapshot', () => {
      const snapshot = state.snapshot();
      expect(snapshot).toHaveProperty('state');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot.state).toEqual({ count: 0, user: { name: 'John', age: 30 } });
    });

    test('should restore from snapshot', () => {
      state.set('count', 5);
      state.set('user.name', 'Jane');
      const snapshot = state.snapshot();

      state.set('count', 10);
      state.set('user.name', 'Bob');

      state.restore(snapshot);
      expect(state.get('count')).toBe(5);
      expect(state.get('user.name')).toBe('Jane');
    });

    test('should return previous state when restoring', () => {
      state.set('count', 5);
      const snapshot = state.snapshot();
      state.set('count', 10);

      const previous = state.restore(snapshot);
      expect(previous).toEqual({ count: 10, user: { name: 'John', age: 30 } });
    });

    test('should keep snapshots history', () => {
      state.snapshot();
      state.snapshot();
      state.snapshot();
      const snapshots = state.getSnapshots();
      expect(snapshots.length).toBe(3);
    });
  });

  describe('dirty tracking', () => {
    test('should track dirty paths', () => {
      expect(state.isDirty()).toBe(false);
      state.set('count', 5);
      expect(state.isDirty()).toBe(true);
      expect(state.isDirty('count')).toBe(true);
    });

    test('should get dirty paths', () => {
      state.set('count', 5);
      state.set('user.name', 'Jane');
      const dirty = state.getDirtyPaths();
      expect(dirty).toContain('count');
      expect(dirty).toContain('user.name');
    });

    test('should reset dirty state', () => {
      state.set('count', 5);
      state.resetDirty();
      expect(state.isDirty()).toBe(false);
    });

    test('should reset specific path dirty', () => {
      state.set('count', 5);
      state.set('user.name', 'Jane');
      state.resetDirty('count');
      expect(state.isDirty('count')).toBe(false);
      expect(state.isDirty('user.name')).toBe(true);
    });
  });

  describe('getMutations', () => {
    test('should track all mutations', () => {
      state.set('count', 1);
      state.set('count', 2);
      state.set('user.name', 'Jane');

      const mutations = state.getMutations();
      expect(mutations).toHaveLength(3);
    });

    test('should include old and new values', () => {
      state.set('count', 5);
      const mutations = state.getMutations();
      expect(mutations[0].oldValue).toBe(0);
      expect(mutations[0].newValue).toBe(5);
    });

    test('should clear mutations', () => {
      state.set('count', 5);
      state.clearMutations();
      expect(state.getMutations()).toHaveLength(0);
    });
  });

  describe('update', () => {
    test('should update multiple values', () => {
      state.update({ count: 5, 'user.name': 'Jane' });
      expect(state.get('count')).toBe(5);
      expect(state.get('user.name')).toBe('Jane');
    });
  });

  describe('getState and setState', () => {
    test('should return entire state copy', () => {
      const s = state.getState();
      expect(s).toEqual({ count: 0, user: { name: 'John', age: 30 } });
    });

    test('should replace entire state', () => {
      state.setState({ count: 10, new: 'value' });
      expect(state.get()).toEqual({ count: 10, new: 'value' });
    });
  });

  describe('has', () => {
    test('should check if path exists', () => {
      expect(state.has('count')).toBe(true);
      expect(state.has('user.name')).toBe(true);
      expect(state.has('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear all state', () => {
      state.clear();
      expect(state.get()).toEqual({});
    });
  });
});

describe('HistoryManager', () => {
  let state;
  let history;

  beforeEach(() => {
    state = new ReactiveState('test', { initialState: { count: 0, text: 'hello' } });
    history = new HistoryManager(state);
  });

  describe('record', () => {
    test('should record state snapshot', () => {
      history.record('initial');
      state.set('count', 5);
      history.record('after increment');

      expect(history.getPast()).toHaveLength(2);
    });

    test('should not record while restoring', () => {
      history.record('first');
      state.set('count', 5);
      history.record('second');
      history.undo();
      history.record('third');

      expect(history.getPast()).toHaveLength(2);
    });
  });

  describe('undo', () => {
    test('should undo to previous state', () => {
      history.record('initial');
      state.set('count', 5);
      history.record('change 1');

      history.undo();
      expect(state.get('count')).toBe(0);
    });

    test('should return false when no past', () => {
      expect(history.undo()).toBe(false);
    });

    test('should populate future', () => {
      history.record();
      state.set('count', 5);
      history.record();
      history.undo();

      expect(history.canRedo()).toBe(true);
    });
  });

  describe('redo', () => {
    test('should redo to future state', () => {
      history.record();
      state.set('count', 5);
      history.record();
      history.undo();
      history.redo();

      expect(state.get('count')).toBe(5);
    });

    test('should return false when no future', () => {
      history.record();
      expect(history.redo()).toBe(false);
    });

    test('should add to past', () => {
      history.record();
      state.set('count', 5);
      history.record();
      history.undo();
      history.redo();

      expect(history.getPast()).toHaveLength(2);
    });
  });

  describe('canUndo and canRedo', () => {
    test('should check undo availability', () => {
      expect(history.canUndo()).toBe(false);
      history.record();
      expect(history.canUndo()).toBe(true);
    });

    test('should check redo availability', () => {
      expect(history.canRedo()).toBe(false);
      history.record();
      state.set('count', 5);
      history.undo();
      expect(history.canRedo()).toBe(true);
    });
  });

  describe('getHistory', () => {
    test('should return complete history', () => {
      history.record();
      state.set('count', 5);
      history.record();

      const h = history.getHistory();
      expect(h).toHaveProperty('past');
      expect(h).toHaveProperty('future');
      expect(h).toHaveProperty('current');
    });
  });

  describe('clear', () => {
    test('should clear all history', () => {
      history.record();
      state.set('count', 5);
      history.record();
      history.undo();

      history.clear();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('getSize', () => {
    test('should return size information', () => {
      history.record();
      state.set('count', 5);
      history.record();
      history.undo();

      const size = history.getSize();
      expect(size).toHaveProperty('past');
      expect(size).toHaveProperty('future');
      expect(size).toHaveProperty('total');
      expect(size.past).toBe(2);
    });
  });

  describe('maxSize limit', () => {
    test('should limit history size', () => {
      const limited = new HistoryManager(state, { maxSize: 3 });
      limited.record();
      state.set('count', 1);
      limited.record();
      state.set('count', 2);
      limited.record();
      state.set('count', 3);
      limited.record();

      expect(limited.getPast().length).toBeLessThanOrEqual(3);
    });
  });
});

describe('VanillaAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new VanillaAdapter();
    adapter.initialize({ count: 0, user: { name: 'John' } });
  });

  describe('get and set', () => {
    test('should get and set values', () => {
      adapter.set('count', 5);
      expect(adapter.get('count')).toBe(5);
    });

    test('should handle nested paths', () => {
      adapter.set('user.name', 'Jane');
      expect(adapter.get('user.name')).toBe('Jane');
    });

    test('should return full state without path', () => {
      const state = adapter.get();
      expect(state).toHaveProperty('count');
      expect(state).toHaveProperty('user');
    });
  });

  describe('subscribe', () => {
    test('should notify subscribers on change', () => {
      const callback = jest.fn();
      adapter.subscribe('count', callback);
      adapter.set('count', 5);
      expect(callback).toHaveBeenCalledWith(5, 0);
    });

    test('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = adapter.subscribe('count', callback);
      adapter.set('count', 5);
      expect(callback).toHaveBeenCalledTimes(1);
      unsubscribe();
      adapter.set('count', 10);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshot and restore', () => {
    test('should create snapshot', () => {
      adapter.set('count', 5);
      const snapshot = adapter.snapshot();
      expect(snapshot).toHaveProperty('state');
      expect(snapshot.state.count).toBe(5);
    });

    test('should restore from snapshot', () => {
      adapter.set('count', 5);
      const snapshot = adapter.snapshot();
      adapter.set('count', 10);
      adapter.restore(snapshot);
      expect(adapter.get('count')).toBe(5);
    });
  });

  describe('isAvailable', () => {
    test('should always be available', () => {
      expect(VanillaAdapter.isAvailable()).toBe(true);
    });
  });

  describe('getPaths', () => {
    test('should return all signal paths', () => {
      const paths = adapter.getPaths();
      expect(paths).toContain('count');
    });
  });

  describe('clear', () => {
    test('should clear state and signals', () => {
      adapter.clear();
      expect(adapter.get()).toEqual({});
      expect(adapter.getPaths()).toHaveLength(0);
    });
  });
});

describe('ReefAdapter', () => {
  // Mock Reef for testing
  const mockReef = (value) => {
    return {
      value,
      watch: jest.fn((cb) => {
        setTimeout(() => cb(), 0);
        return jest.fn();
      })
    };
  };

  let adapter;

  beforeEach(() => {
    adapter = new ReefAdapter({ reef: mockReef });
    adapter.initialize({ count: 0, text: 'hello' });
  });

  describe('get and set', () => {
    test('should get and set values', () => {
      adapter.set('count', 5);
      expect(adapter.get('count')).toBe(5);
    });

    test('should create signals for initial state', () => {
      const paths = adapter.getPaths();
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('subscribe', () => {
    test('should subscribe to changes', (done) => {
      const callback = jest.fn();
      adapter.subscribe('count', callback);
      adapter.set('count', 5);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('snapshot and restore', () => {
    test('should create snapshot', () => {
      adapter.set('count', 5);
      const snapshot = adapter.snapshot();
      expect(snapshot.state.count).toBe(5);
    });

    test('should restore from snapshot', () => {
      adapter.set('count', 5);
      const snapshot = adapter.snapshot();
      adapter.set('count', 10);
      adapter.restore(snapshot);
      expect(adapter.get('count')).toBe(5);
    });
  });

  describe('isAvailable', () => {
    test('should check reef availability', () => {
      expect(ReefAdapter.isAvailable(mockReef)).toBe(true);
      expect(ReefAdapter.isAvailable(null)).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should throw when reef unavailable', () => {
      const noReef = new ReefAdapter({ reef: null });
      expect(() => noReef.initialize({ count: 0 })).toThrow();
    });
  });
});

