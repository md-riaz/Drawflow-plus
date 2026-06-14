/**
 * Unit Tests for Validation Framework
 * Comprehensive test suite for validation framework, rules, and validators
 */

import ValidationFramework, { Validator } from '../../src/extensions/validation/index.js';
import * as Rules from '../../src/extensions/validation/rules.js';
import {
  incomingCallValidator,
  ivrValidator,
  ringGroupValidator,
  businessHoursValidator,
  extensionValidator,
  queueValidator,
  conferenceValidator,
  voiceMailValidator,
  actionValidator
} from '../../src/extensions/validation/validators.js';

describe('ValidationFramework', () => {
  let framework;

  beforeEach(() => {
    framework = new ValidationFramework();
  });

  describe('registerRule', () => {
    test('should register a custom rule', () => {
      const rule = jest.fn(() => ({ valid: true }));
      framework.registerRule('custom', rule);
      expect(framework.getRule('custom')).toBe(rule);
    });

    test('should throw error if rule is not a function', () => {
      expect(() => {
        framework.registerRule('invalid', 'not a function');
      }).toThrow('Validation rule must be a function');
    });
  });

  describe('Default Rules', () => {
    test('required rule should validate empty values', () => {
      const validator = framework.createValidator({
        name: 'required'
      });

      const result1 = validator.validate({ name: '' });
      expect(result1.valid).toBe(false);

      const result2 = validator.validate({ name: 'John' });
      expect(result2.valid).toBe(true);
    });

    test('email rule should validate email format', () => {
      const validator = framework.createValidator({
        email: 'email'
      });

      const result1 = validator.validate({ email: 'test@example.com' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ email: 'invalid' });
      expect(result2.valid).toBe(false);
    });

    test('url rule should validate URL format', () => {
      const validator = framework.createValidator({
        url: 'url'
      });

      const result1 = validator.validate({ url: 'https://example.com' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ url: 'not a url' });
      expect(result2.valid).toBe(false);
    });

    test('min rule should validate minimum value', () => {
      const validator = framework.createValidator({
        age: { name: 'min', value: 18 }
      });

      const result1 = validator.validate({ age: 18 });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ age: 17 });
      expect(result2.valid).toBe(false);
    });

    test('max rule should validate maximum value', () => {
      const validator = framework.createValidator({
        age: { name: 'max', value: 100 }
      });

      const result1 = validator.validate({ age: 100 });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ age: 101 });
      expect(result2.valid).toBe(false);
    });

    test('minLength rule should validate minimum string length', () => {
      const validator = framework.createValidator({
        password: { name: 'minLength', value: 8 }
      });

      const result1 = validator.validate({ password: 'password123' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ password: 'short' });
      expect(result2.valid).toBe(false);
    });

    test('maxLength rule should validate maximum string length', () => {
      const validator = framework.createValidator({
        code: { name: 'maxLength', value: 5 }
      });

      const result1 = validator.validate({ code: 'ABC' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ code: 'ABCDEF' });
      expect(result2.valid).toBe(false);
    });

    test('numeric rule should validate numeric values', () => {
      const validator = framework.createValidator({
        amount: 'numeric'
      });

      const result1 = validator.validate({ amount: 123 });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ amount: 'not a number' });
      expect(result2.valid).toBe(false);
    });

    test('pattern rule should validate regex patterns', () => {
      const validator = framework.createValidator({
        code: { name: 'pattern', value: '^[A-Z]{3}$' }
      });

      const result1 = validator.validate({ code: 'ABC' });
      expect(result1.valid).toBe(true);

      const result2 = validator.validate({ code: 'abc' });
      expect(result2.valid).toBe(false);
    });
  });

  describe('createValidator', () => {
    test('should create a validator with schema', () => {
      const schema = {
        name: 'required',
        email: 'email'
      };
      const validator = framework.createValidator(schema);
      expect(validator.schema).toEqual(schema);
    });
  });

  describe('Validator.validate', () => {
    test('should validate data against schema', () => {
      const validator = framework.createValidator({
        name: 'required',
        email: 'email'
      });

      const result = validator.validate({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should collect multiple errors', () => {
      const validator = framework.createValidator({
        name: 'required',
        email: 'email'
      });

      const result = validator.validate({
        name: '',
        email: 'invalid'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('name');
      expect(result.errors).toHaveProperty('email');
    });

    test('should validate multiple rules for one field', () => {
      const validator = framework.createValidator({
        password: ['required', { name: 'minLength', value: 8 }]
      });

      const result = validator.validate({
        password: 'short'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.password).toHaveLength(1);
    });
  });

  describe('Validator.getErrors', () => {
    test('should return all validation errors', () => {
      const validator = framework.createValidator({
        name: 'required',
        email: 'email'
      });

      validator.validate({
        name: '',
        email: 'invalid'
      });

      const errors = validator.getErrors();
      expect(errors).toHaveProperty('name');
      expect(errors).toHaveProperty('email');
    });
  });

  describe('Validator.getFieldErrors', () => {
    test('should return errors for specific field', () => {
      const validator = framework.createValidator({
        password: ['required', { name: 'minLength', value: 8 }]
      });

      validator.validate({
        password: ''
      });

      const errors = validator.getFieldErrors('password');
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should return empty array for field with no errors', () => {
      const validator = framework.createValidator({
        name: 'required'
      });

      validator.validate({
        name: 'John'
      });

      const errors = validator.getFieldErrors('name');
      expect(errors).toEqual([]);
    });
  });

  describe('Validator.isValid', () => {
    test('should return true when valid', () => {
      const validator = framework.createValidator({
        name: 'required'
      });

      validator.validate({
        name: 'John'
      });

      expect(validator.isValid()).toBe(true);
    });

    test('should return false when invalid', () => {
      const validator = framework.createValidator({
        name: 'required'
      });

      validator.validate({
        name: ''
      });

      expect(validator.isValid()).toBe(false);
    });
  });
});

describe('Built-in Validation Rules', () => {
  let framework;

  beforeEach(() => {
    framework = new ValidationFramework();
  });

  describe('required rule', () => {
    test('should validate required fields', () => {
      const rule = Rules.required('name', 'Name is mandatory');
      expect(rule('John').valid).toBe(true);
      expect(rule('').valid).toBe(false);
      expect(rule(null).valid).toBe(false);
      expect(rule(undefined).valid).toBe(false);
    });

    test('should support custom error message', () => {
      const rule = Rules.required('email', 'Email is mandatory');
      const result = rule('');
      expect(result.message).toBe('Email is mandatory');
    });
  });

  describe('minLength rule', () => {
    test('should validate minimum string length', () => {
      const rule = Rules.minLength(5, 'Too short');
      expect(rule('hello').valid).toBe(true);
      expect(rule('hi').valid).toBe(false);
    });

    test('should support custom message', () => {
      const rule = Rules.minLength(8, 'Password must be at least 8 characters');
      const result = rule('pass');
      expect(result.message).toBe('Password must be at least 8 characters');
    });
  });

  describe('maxLength rule', () => {
    test('should validate maximum string length', () => {
      const rule = Rules.maxLength(10, 'Too long');
      expect(rule('hello').valid).toBe(true);
      expect(rule('this is too long').valid).toBe(false);
    });
  });

  describe('min rule', () => {
    test('should validate minimum numeric value', () => {
      const rule = Rules.min(18, 'Must be 18+');
      expect(rule(25).valid).toBe(true);
      expect(rule(10).valid).toBe(false);
    });
  });

  describe('max rule', () => {
    test('should validate maximum numeric value', () => {
      const rule = Rules.max(100, 'Too high');
      expect(rule(50).valid).toBe(true);
      expect(rule(150).valid).toBe(false);
    });
  });

  describe('range rule', () => {
    test('should validate range', () => {
      const rule = Rules.range(1, 10, 'Out of range');
      expect(rule(5).valid).toBe(true);
      expect(rule(0).valid).toBe(false);
      expect(rule(11).valid).toBe(false);
    });
  });

  describe('pattern rule', () => {
    test('should validate regex patterns', () => {
      const rule = Rules.pattern(/^[A-Z]{3}-\d{4}$/, 'Invalid SKU');
      expect(rule('ABC-1234').valid).toBe(true);
      expect(rule('abc-1234').valid).toBe(false);
      expect(rule('AB-12').valid).toBe(false);
    });
  });

  describe('email rule', () => {
    test('should validate email addresses', () => {
      const rule = Rules.email('Invalid email');
      expect(rule('user@example.com').valid).toBe(true);
      expect(rule('invalid').valid).toBe(false);
      expect(rule('test@domain').valid).toBe(false);
    });

    test('should allow empty values', () => {
      const rule = Rules.email();
      expect(rule('').valid).toBe(true);
      expect(rule(null).valid).toBe(true);
    });
  });

  describe('phoneNumber rule', () => {
    test('should validate various phone formats', () => {
      const rule = Rules.phoneNumber('Invalid phone');
      expect(rule('+1-234-567-8901').valid).toBe(true);
      expect(rule('(234) 567-8901').valid).toBe(true);
      expect(rule('234-567-8901').valid).toBe(true);
      expect(rule('invalid').valid).toBe(false);
    });
  });

  describe('url rule', () => {
    test('should validate URLs', () => {
      const rule = Rules.url('Invalid URL');
      expect(rule('https://example.com').valid).toBe(true);
      expect(rule('http://example.com:8080/path').valid).toBe(true);
      expect(rule('not a url').valid).toBe(false);
    });
  });

  describe('custom rule', () => {
    test('should support custom validation function', () => {
      const rule = Rules.custom(
        (value) => ({
          valid: parseInt(value) % 2 === 0,
          message: 'Must be even'
        })
      );
      expect(rule(4).valid).toBe(true);
      expect(rule(3).valid).toBe(false);
    });

    test('should handle custom function errors', () => {
      const rule = Rules.custom(() => {
        throw new Error('Validation error');
      });
      const result = rule('test');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('compose rule', () => {
    test('should compose multiple rules', () => {
      const rule = Rules.compose(
        Rules.required('name'),
        Rules.minLength(3),
        Rules.maxLength(50)
      );
      expect(rule('John').valid).toBe(true);
      expect(rule('').valid).toBe(false);
      expect(rule('ab').valid).toBe(false);
    });

    test('should return first error from composed rules', () => {
      const rule = Rules.compose(
        Rules.required('name'),
        Rules.minLength(3)
      );
      const result = rule('');
      expect(result.message).toContain('required');
    });
  });

  describe('when rule', () => {
    test('should conditionally apply validation', () => {
      const rule = Rules.when(
        (v) => v !== null,
        Rules.email()
      );
      expect(rule(null).valid).toBe(true);
      expect(rule('user@example.com').valid).toBe(true);
      expect(rule('invalid').valid).toBe(false);
    });
  });

  describe('integer rule', () => {
    test('should validate integers', () => {
      const rule = Rules.integer();
      expect(rule(42).valid).toBe(true);
      expect(rule(42.5).valid).toBe(false);
      expect(rule('not number').valid).toBe(false);
    });
  });

  describe('numeric rule', () => {
    test('should validate numeric values', () => {
      const rule = Rules.numeric();
      expect(rule(42).valid).toBe(true);
      expect(rule(42.5).valid).toBe(true);
      expect(rule('not number').valid).toBe(false);
    });
  });

  describe('arrayLength rule', () => {
    test('should validate array length', () => {
      const rule = Rules.arrayLength(1, 5);
      expect(rule([1, 2, 3]).valid).toBe(true);
      expect(rule([]).valid).toBe(false);
      expect(rule([1, 2, 3, 4, 5, 6]).valid).toBe(false);
    });
  });

  describe('unique rule', () => {
    test('should validate unique array values', () => {
      const rule = Rules.unique();
      expect(rule([1, 2, 3]).valid).toBe(true);
      expect(rule([1, 2, 1]).valid).toBe(false);
      expect(rule('not array').valid).toBe(true);
    });
  });

  describe('equals rule', () => {
    test('should validate value equality', () => {
      const rule = Rules.equals('password', 'Passwords must match');
      expect(rule('password').valid).toBe(true);
      expect(rule('different').valid).toBe(false);
    });
  });

  describe('oneOf rule', () => {
    test('should validate allowed values', () => {
      const rule = Rules.oneOf(['admin', 'user', 'guest']);
      expect(rule('admin').valid).toBe(true);
      expect(rule('superuser').valid).toBe(false);
    });
  });
});

describe('Node Type Validators', () => {
  describe('incomingCallValidator', () => {
    test('should validate required phone number', async () => {
      const result = await incomingCallValidator({});
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.phoneNumber).toBeDefined();
    });

    test('should validate phone number format', async () => {
      const result = await incomingCallValidator({
        phoneNumber: 'invalid'
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid phone number', async () => {
      const result = await incomingCallValidator({
        phoneNumber: '+1-234-567-8901'
      });
      expect(result.valid).toBe(true);
    });

    test('should validate extension range', async () => {
      const result = await incomingCallValidator({
        phoneNumber: '+1234567890',
        extension: 99999
      });
      expect(result.valid).toBe(false);
    });

    test('should validate ring timeout', async () => {
      const result = await incomingCallValidator({
        phoneNumber: '+1234567890',
        ringTimeout: 400
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('ivrValidator', () => {
    test('should require prompt message', async () => {
      const result = await ivrValidator({
        menuOptions: []
      });
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.prompt).toBeDefined();
    });

    test('should require menu options', async () => {
      const result = await ivrValidator({
        prompt: 'Select an option',
        menuOptions: []
      });
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.menuOptions).toBeDefined();
    });

    test('should validate duplicate menu digits', async () => {
      const result = await ivrValidator({
        prompt: 'Select an option',
        menuOptions: [
          { digit: '1', label: 'Sales', target: 'node-1' },
          { digit: '1', label: 'Support', target: 'node-2' }
        ]
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid IVR configuration', async () => {
      const result = await ivrValidator({
        prompt: 'Press 1 for sales',
        menuOptions: [
          { digit: '1', label: 'Sales', target: 'node-1' },
          { digit: '2', label: 'Support', target: 'node-2' }
        ]
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('ringGroupValidator', () => {
    test('should require members', async () => {
      const result = await ringGroupValidator({
        timeout: 30,
        strategy: 'simultaneous'
      });
      expect(result.valid).toBe(false);
    });

    test('should require timeout', async () => {
      const result = await ringGroupValidator({
        members: [{ id: 'ext-101', type: 'extension' }],
        strategy: 'simultaneous'
      });
      expect(result.valid).toBe(false);
    });

    test('should require valid strategy', async () => {
      const result = await ringGroupValidator({
        members: [{ id: 'ext-101', type: 'extension' }],
        timeout: 30,
        strategy: 'invalid'
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid ring group', async () => {
      const result = await ringGroupValidator({
        members: [
          { id: 'ext-101', type: 'extension', weight: 1 },
          { id: 'ext-102', type: 'extension', weight: 1 }
        ],
        timeout: 30,
        strategy: 'simultaneous'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('businessHoursValidator', () => {
    test('should require timezone', async () => {
      const result = await businessHoursValidator({
        schedule: {}
      });
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.timezone).toBeDefined();
    });

    test('should validate schedule time format', async () => {
      const result = await businessHoursValidator({
        timezone: 'America/New_York',
        schedule: {
          monday: { start: '900', end: '17:00', enabled: true }
        }
      });
      expect(result.valid).toBe(false);
    });

    test('should validate start < end time', async () => {
      const result = await businessHoursValidator({
        timezone: 'America/New_York',
        schedule: {
          monday: { start: '17:00', end: '09:00', enabled: true }
        }
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid business hours', async () => {
      const result = await businessHoursValidator({
        timezone: 'America/New_York',
        schedule: {
          monday: { start: '09:00', end: '17:00', enabled: true }
        }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('extensionValidator', () => {
    test('should require extension number', async () => {
      const result = await extensionValidator({});
      expect(result.valid).toBe(false);
      expect(result.fieldErrors.extensionNumber).toBeDefined();
    });

    test('should validate extension format', async () => {
      const result = await extensionValidator({
        extensionNumber: 'ABC'
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid extension', async () => {
      const result = await extensionValidator({
        extensionNumber: '101',
        label: 'Front Desk'
      });
      expect(result.valid).toBe(true);
    });

    test('should validate label length', async () => {
      const result = await extensionValidator({
        extensionNumber: '101',
        label: 'a'.repeat(101)
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('queueValidator', () => {
    test('should require queue ID', async () => {
      const result = await queueValidator({
        queueName: 'Sales',
        agents: [{ id: 'ext-101' }]
      });
      expect(result.valid).toBe(false);
    });

    test('should validate queue ID format', async () => {
      const result = await queueValidator({
        queueId: 'sales@queue!',
        queueName: 'Sales',
        agents: [{ id: 'ext-101' }]
      });
      expect(result.valid).toBe(false);
    });

    test('should require agents', async () => {
      const result = await queueValidator({
        queueId: 'sales-queue',
        queueName: 'Sales',
        agents: []
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid queue', async () => {
      const result = await queueValidator({
        queueId: 'sales-queue',
        queueName: 'Sales Queue',
        agents: [
          { id: 'ext-101' },
          { id: 'ext-102' }
        ]
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('conferenceValidator', () => {
    test('should require conference ID', async () => {
      const result = await conferenceValidator({});
      expect(result.valid).toBe(false);
    });

    test('should validate max participants', async () => {
      const result = await conferenceValidator({
        conferenceId: 'meeting-1',
        maxParticipants: 2000
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid conference', async () => {
      const result = await conferenceValidator({
        conferenceId: 'meeting-1',
        maxParticipants: 50
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('voiceMailValidator', () => {
    test('should require mailbox extension', async () => {
      const result = await voiceMailValidator({});
      expect(result.valid).toBe(false);
    });

    test('should validate mailbox extension format', async () => {
      const result = await voiceMailValidator({
        mailboxExtension: 'ABC'
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid voice mail', async () => {
      const result = await voiceMailValidator({
        mailboxExtension: '101'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('actionValidator', () => {
    test('should require action type', async () => {
      const result = await actionValidator({});
      expect(result.valid).toBe(false);
    });

    test('should validate JavaScript syntax', async () => {
      const result = await actionValidator({
        actionType: 'javascript',
        code: 'invalid {{{'
      });
      expect(result.valid).toBe(false);
    });

    test('should accept valid action', async () => {
      const result = await actionValidator({
        actionType: 'javascript',
        code: 'console.log("test");'
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe('Validation Framework Advanced Features', () => {
  let framework;

  beforeEach(() => {
    framework = new ValidationFramework();
  });

  describe('registerNodeValidator', () => {
    test('should register custom node validator', () => {
      const validator = jest.fn();
      framework.registerNodeValidator('customNode', validator);
      expect(framework.getValidationRules('customNode')).toBeDefined();
    });

    test('should throw error for non-function validator', () => {
      expect(() => {
        framework.registerNodeValidator('test', 'not a function');
      }).toThrow('Node validator must be a function');
    });
  });

  describe('validate method', () => {
    test('should validate node configuration', async () => {
      framework.registerNodeValidator('testNode', async (config) => ({
        valid: config.name !== '',
        errors: []
      }));

      const result = await framework.validate('testNode', { name: 'Test' });
      expect(result.valid).toBe(true);
    });

    test('should handle missing validator gracefully', async () => {
      const result = await framework.validate('unknownNode', {});
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('validateField method', () => {
    test('should validate single field', async () => {
      const result = await framework.validateField(
        { name: 'email', rules: ['required', 'email'] },
        'user@example.com'
      );
      expect(result.valid).toBe(true);
    });

    test('should return field errors', async () => {
      const result = await framework.validateField(
        { name: 'email', rules: ['required', 'email'] },
        'invalid'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    test('should handle validation errors in onError callback', async () => {
      const errorCallback = jest.fn();
      const validationWithError = new ValidationFramework({
        onError: errorCallback
      });

      validationWithError.registerNodeValidator('badNode', async () => {
        throw new Error('Validation failed');
      });

      try {
        await validationWithError.validate('badNode', {});
      } catch (e) {
        expect(errorCallback).toHaveBeenCalled();
      }
    });
  });

  describe('getAllRules', () => {
    test('should return all registered rules', () => {
      const rules = framework.getAllRules();
      expect(rules).toHaveProperty('required');
      expect(rules).toHaveProperty('email');
      expect(rules).toHaveProperty('min');
      expect(rules).toHaveProperty('max');
    });
  });

  describe('reset', () => {
    test('should clear custom validators', () => {
      framework.registerNodeValidator('test', () => ({}));
      framework.reset();
      const result = framework.getValidationRules('test');
      expect(result).toBeNull();
    });
  });

  describe('Validator.getFirstError', () => {
    test('should return first error message', () => {
      const validator = framework.createValidator({
        name: ['required', { name: 'minLength', value: 5 }],
        email: 'email'
      });

      validator.validate({
        name: 'ab',
        email: 'invalid'
      });

      const firstError = validator.getFirstError();
      expect(firstError).toBeDefined();
      expect(typeof firstError).toBe('string');
    });
  });

  describe('Validator.clearErrors', () => {
    test('should clear validation errors', () => {
      const validator = framework.createValidator({
        name: 'required'
      });

      validator.validate({ name: '' });
      expect(validator.isValid()).toBe(false);

      validator.clearErrors();
      expect(validator.isValid()).toBe(true);
      expect(Object.keys(validator.getErrors())).toHaveLength(0);
    });
  });

  describe('stopOnFirstError option', () => {
    test('should stop validation on first field error', () => {
      const validator = framework.createValidator(
        { name: ['required', { name: 'minLength', value: 5 }] },
        { stopOnFirstError: true }
      );

      validator.validate({ name: '' });
      const errors = validator.getFieldErrors('name');
      expect(errors.length).toBe(1);
    });
  });
});
