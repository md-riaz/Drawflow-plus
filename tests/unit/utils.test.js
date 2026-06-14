/**
 * Unit Tests for Utility Functions
 */

import * as Utils from '../../src/utils/index.js';

describe('Utils', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = Utils.generateId();
      const id2 = Utils.generateId();
      expect(id1).not.toBe(id2);
    });

    test('should return a string', () => {
      const id = Utils.generateId();
      expect(typeof id).toBe('string');
    });

    test('should contain timestamp and random part', () => {
      const id = Utils.generateId();
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });
  });

  describe('deepClone', () => {
    test('should clone simple objects', () => {
      const obj = { a: 1, b: 'test' };
      const cloned = Utils.deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    test('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = Utils.deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
    });

    test('should clone arrays', () => {
      const arr = [1, 2, 3, { a: 1 }];
      const cloned = Utils.deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    test('should clone dates', () => {
      const date = new Date();
      const cloned = Utils.deepClone(date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });

    test('should handle primitives', () => {
      expect(Utils.deepClone(123)).toBe(123);
      expect(Utils.deepClone('test')).toBe('test');
      expect(Utils.deepClone(true)).toBe(true);
      expect(Utils.deepClone(null)).toBe(null);
    });
  });

  describe('deepMerge', () => {
    test('should merge simple objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = Utils.deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('should overwrite target properties', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3 };
      const result = Utils.deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    test('should merge nested objects', () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      const result = Utils.deepMerge(target, source);
      expect(result).toEqual({ a: { b: 1, c: 2 } });
    });

    test('should not mutate original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      Utils.deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty values', () => {
      expect(Utils.isEmpty(null)).toBe(true);
      expect(Utils.isEmpty(undefined)).toBe(true);
      expect(Utils.isEmpty('')).toBe(true);
      expect(Utils.isEmpty('   ')).toBe(true);
      expect(Utils.isEmpty([])).toBe(true);
      expect(Utils.isEmpty({})).toBe(true);
    });

    test('should return false for non-empty values', () => {
      expect(Utils.isEmpty('test')).toBe(false);
      expect(Utils.isEmpty([1])).toBe(false);
      expect(Utils.isEmpty({ a: 1 })).toBe(false);
      expect(Utils.isEmpty(123)).toBe(false);
    });
  });

  describe('debounce', () => {
    test('should delay function execution', (done) => {
      const callback = jest.fn();
      const debounced = Utils.debounce(callback, 100);

      debounced();
      expect(callback).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    test('should cancel previous calls', (done) => {
      const callback = jest.fn();
      const debounced = Utils.debounce(callback, 100);

      debounced();
      debounced();
      debounced();

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe('throttle', () => {
    test('should limit function calls', (done) => {
      const callback = jest.fn();
      const throttled = Utils.throttle(callback, 100);

      throttled();
      throttled();
      throttled();

      expect(callback).toHaveBeenCalledTimes(1);

      setTimeout(() => {
        throttled();
        expect(callback).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct emails', () => {
      expect(Utils.isValidEmail('test@example.com')).toBe(true);
      expect(Utils.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(Utils.isValidEmail('invalid')).toBe(false);
      expect(Utils.isValidEmail('invalid@')).toBe(false);
      expect(Utils.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('should validate correct URLs', () => {
      expect(Utils.isValidUrl('https://example.com')).toBe(true);
      expect(Utils.isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(Utils.isValidUrl('not a url')).toBe(false);
      expect(Utils.isValidUrl('example.com')).toBe(false);
    });
  });
});
