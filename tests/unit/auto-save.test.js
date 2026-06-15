/**
 * Unit Tests for AutoSave Extension
 */

import AutoSave from '../../src/extensions/auto-save/index.js';

jest.useFakeTimers();

function makeMockDfp(extensions = {}) {
  const drawflow = {
    on: jest.fn(),
    export: jest.fn(() => ({ drawflow: { Home: { data: {} } } })),
  };
  return {
    drawflow,
    extensions,
    getExtension: (name) => extensions[name],
  };
}

describe('AutoSave', () => {
  describe('install', () => {
    test('throws if saveFn not provided', () => {
      const dfp = makeMockDfp();
      const as = new AutoSave();
      expect(() => as.install(dfp, {})).toThrow('saveFn');
    });

    test('injects methods onto drawflowPlus', () => {
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn: jest.fn() });
      as.install(dfp, {});
      expect(typeof dfp.scheduleSave).toBe('function');
      expect(typeof dfp.flushSave).toBe('function');
      expect(typeof dfp.holdSave).toBe('function');
      expect(typeof dfp.releaseSave).toBe('function');
      expect(typeof dfp.openSaveGate).toBe('function');
      expect(typeof dfp.getSaveStatus).toBe('function');
    });
  });

  describe('schedule', () => {
    test('does not save immediately', () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 500 });
      as.install(dfp, {});
      dfp.scheduleSave();
      expect(saveFn).not.toHaveBeenCalled();
    });

    test('saves after delay', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 500 });
      as.install(dfp, {});
      dfp.scheduleSave();
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });

    test('debounces: two calls within delay result in one save', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 500 });
      as.install(dfp, {});
      dfp.scheduleSave();
      jest.advanceTimersByTime(300);
      dfp.scheduleSave();
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('hold / release', () => {
    test('hold blocks save', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      dfp.holdSave();
      dfp.scheduleSave();
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled();
    });

    test('release flushes pending save', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      dfp.holdSave();
      dfp.scheduleSave();
      jest.advanceTimersByTime(500);
      dfp.releaseSave();
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('openGate', () => {
    test('gate blocks saves', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      const closeGate = dfp.openSaveGate('import');
      dfp.scheduleSave();
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled();
      closeGate();
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });

    test('same-label gates are reference-counted', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      const close1 = dfp.openSaveGate('batch');
      const close2 = dfp.openSaveGate('batch');
      dfp.scheduleSave();
      jest.advanceTimersByTime(500);
      close1();
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled(); // second ref still open
      close2();
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });

    test('multiple gates: last close triggers save', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      const closeA = dfp.openSaveGate('a');
      const closeB = dfp.openSaveGate('b');
      dfp.scheduleSave();
      jest.advanceTimersByTime(500);
      closeA();
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled(); // gate b still open
      closeB();
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry', () => {
    test('retries on failure and eventually succeeds', async () => {
      jest.useRealTimers();
      let attempt = 0;
      const saveFn = jest.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) return Promise.reject(new Error('fail'));
        return Promise.resolve(null);
      });
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 0, maxRetries: 3, retryBaseDelay: 1 });
      as.install(dfp, {});

      const spy = jest.fn();
      dfp.onSave(spy);

      // Trigger save directly (bypass debounce)
      await as._runSave('full');

      expect(saveFn).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith('full', true, null);
      jest.useFakeTimers();
    });
  });

  describe('flush', () => {
    test('flush triggers timer-scheduled save immediately', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 5000 });
      as.install(dfp, {});
      dfp.scheduleSave('full');
      dfp.flushSave();
      await Promise.resolve();
      expect(saveFn).toHaveBeenCalledTimes(1);
    });

    test('flush is a no-op when nothing is pending', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      dfp.flushSave();
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    test('cancel prevents pending save from firing', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 500 });
      as.install(dfp, {});
      dfp.scheduleSave();
      dfp.cancelSave();
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled();
    });
  });

  describe('CanvasMode integration', () => {
    test('does not save in readonly mode', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp({
        canvasMode: { isEditable: () => false },
      });
      const as = new AutoSave({ saveFn, delay: 100, checkMode: true });
      as.install(dfp, {});
      dfp.scheduleSave('full');
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      expect(saveFn).not.toHaveBeenCalled();
    });
  });

  describe('onSave callback', () => {
    test('fires with type and success on completed save', async () => {
      const saveFn = jest.fn().mockResolvedValue(null);
      const dfp = makeMockDfp();
      const as = new AutoSave({ saveFn, delay: 100 });
      as.install(dfp, {});
      const spy = jest.fn();
      dfp.onSave(spy);
      dfp.scheduleSave('full');
      jest.advanceTimersByTime(200);
      // Flush multiple microtask rounds: saveFn resolves, then _runSave resumes
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(spy).toHaveBeenCalledWith('full', true, null);
    });
  });
});
