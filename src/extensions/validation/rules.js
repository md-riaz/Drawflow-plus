/**
 * Built-in Validation Rules
 * Provides composable validation rules for common use cases
 *
 * @module extensions/validation/rules
 * @example
 * import ValidationFramework from '../validation/index.js';
 * import { required, email, minLength, pattern } from './rules.js';
 *
 * const framework = new ValidationFramework();
 * framework.registerRule('required', required());
 * framework.registerRule('email', email());
 */

/**
 * Required field validation
 * @param {string} fieldName - Field name for error messages
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = required('email', 'Email is mandatory');
 * rule('user@example.com') // { valid: true }
 * rule('') // { valid: false, message: 'Email is mandatory' }
 */
export function required(fieldName = 'Field', message) {
  return (value, params = {}) => {
    const isEmpty = value === null || value === undefined || value === '';
    return {
      valid: !isEmpty,
      message: message || params.message || `${fieldName} is required`
    };
  };
}

/**
 * Minimum string length validation
 * @param {number} length - Minimum length required
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = minLength(8, 'Password too short');
 * rule('password') // { valid: false, message: 'Password too short' }
 */
export function minLength(length, message) {
  return (value, params = {}) => {
    const strValue = String(value || '');
    const minLen = params.value !== undefined ? params.value : length;
    return {
      valid: strValue.length >= minLen,
      message: message || params.message || `Must be at least ${minLen} characters`
    };
  };
}

/**
 * Maximum string length validation
 * @param {number} length - Maximum length allowed
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = maxLength(50, 'Name too long');
 * rule('a'.repeat(51)) // { valid: false, message: 'Name too long' }
 */
export function maxLength(length, message) {
  return (value, params = {}) => {
    const strValue = String(value || '');
    const maxLen = params.value !== undefined ? params.value : length;
    return {
      valid: strValue.length <= maxLen,
      message: message || params.message || `Must be at most ${maxLen} characters`
    };
  };
}

/**
 * Minimum numeric value validation
 * @param {number} minValue - Minimum value required
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = min(18, 'Must be 18 or older');
 * rule(25) // { valid: true }
 * rule(16) // { valid: false, message: 'Must be 18 or older' }
 */
export function min(minValue, message) {
  return (value, params = {}) => {
    const min = params.value !== undefined ? params.value : minValue;
    const numValue = parseFloat(value);
    return {
      valid: !isNaN(numValue) && numValue >= min,
      message: message || params.message || `Value must be at least ${min}`
    };
  };
}

/**
 * Maximum numeric value validation
 * @param {number} maxValue - Maximum value allowed
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = max(100, 'Value too high');
 * rule(50) // { valid: true }
 * rule(150) // { valid: false, message: 'Value too high' }
 */
export function max(maxValue, message) {
  return (value, params = {}) => {
    const max = params.value !== undefined ? params.value : maxValue;
    const numValue = parseFloat(value);
    return {
      valid: !isNaN(numValue) && numValue <= max,
      message: message || params.message || `Value must be at most ${max}`
    };
  };
}

/**
 * Range validation (between min and max)
 * @param {number} minValue - Minimum value
 * @param {number} maxValue - Maximum value
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = range(1, 10, 'Must be 1-10');
 * rule(5) // { valid: true }
 * rule(15) // { valid: false, message: 'Must be 1-10' }
 */
export function range(minValue, maxValue, message) {
  return (value, params = {}) => {
    const min = params.min !== undefined ? params.min : minValue;
    const max = params.max !== undefined ? params.max : maxValue;
    const numValue = parseFloat(value);
    return {
      valid: !isNaN(numValue) && numValue >= min && numValue <= max,
      message: message || params.message || `Value must be between ${min} and ${max}`
    };
  };
}

/**
 * Regex pattern matching validation
 * @param {RegExp|string} regex - Regular expression pattern
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = pattern(/^[A-Z]{3}-\d{4}$/, 'Invalid SKU');
 * rule('ABC-1234') // { valid: true }
 * rule('abc-1234') // { valid: false, message: 'Invalid SKU' }
 */
export function pattern(regex, message) {
  return (value, params = {}) => {
    if (!value) return { valid: true }; // Don't validate empty values
    const reg = params.value instanceof RegExp ? params.value :
                 params.value ? new RegExp(params.value) : regex;
    return {
      valid: reg.test(String(value)),
      message: message || params.message || 'Invalid format'
    };
  };
}

/**
 * Email validation
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = email('Invalid email address');
 * rule('user@example.com') // { valid: true }
 * rule('invalid') // { valid: false, message: 'Invalid email address' }
 */
export function email(message) {
  return (value, params = {}) => {
    if (!value) return { valid: true };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: emailRegex.test(value),
      message: message || params.message || 'Invalid email address'
    };
  };
}

/**
 * Phone number validation
 * Supports various formats: +1(234)567-8901, (234) 567-8901, 234-567-8901, etc.
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = phoneNumber('Invalid phone number');
 * rule('+1-234-567-8901') // { valid: true }
 * rule('(234) 567-8901') // { valid: true }
 */
export function phoneNumber(message) {
  return (value, params = {}) => {
    if (!value) return { valid: true };
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return {
      valid: phoneRegex.test(String(value).trim()),
      message: message || params.message || 'Invalid phone number'
    };
  };
}

/**
 * URL validation
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = url('Invalid URL');
 * rule('https://example.com') // { valid: true }
 * rule('not a url') // { valid: false, message: 'Invalid URL' }
 */
export function url(message) {
  return (value, params = {}) => {
    if (!value) return { valid: true };
    try {
      new URL(value);
      return { valid: true };
    } catch (e) {
      return { valid: false, message: message || params.message || 'Invalid URL' };
    }
  };
}

/**
 * Custom validation function
 * Allows composing validation with a custom function
 * @param {Function} validatorFn - Validator function (value) => ({valid, message})
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const isEven = custom((value) => ({
 *   valid: parseInt(value) % 2 === 0,
 *   message: 'Number must be even'
 * }));
 * isEven(4) // { valid: true }
 * isEven(3) // { valid: false, message: 'Number must be even' }
 */
export function custom(validatorFn, message) {
  if (typeof validatorFn !== 'function') {
    throw new Error('Custom validator must be a function');
  }
  return (value, params = {}) => {
    try {
      const result = validatorFn(value, params);
      return {
        valid: result.valid === true,
        message: message || result.message || 'Validation failed'
      };
    } catch (error) {
      return {
        valid: false,
        message: message || error.message || 'Validation error'
      };
    }
  };
}

/**
 * Compose multiple rules into one
 * Validates value against all rules, returning first error
 * @param {...Function} rules - Validation rules to compose
 * @returns {Function} - Composed validation rule function
 *
 * @example
 * const rule = compose(
 *   required('Email'),
 *   minLength(5),
 *   email('Must be valid email')
 * );
 */
export function compose(...rules) {
  return (value, params = {}) => {
    for (const rule of rules) {
      const result = rule(value, params);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

/**
 * Conditional validation rule
 * Only validates if condition is true
 * @param {Function} condition - Condition function (value) => boolean
 * @param {Function} rule - Validation rule function
 * @returns {Function} - Conditional validation rule
 *
 * @example
 * const rule = when(
 *   (v) => v !== null,
 *   email('Invalid email when provided')
 * );
 */
export function when(condition, rule) {
  return (value, params = {}) => {
    if (typeof condition !== 'function') {
      throw new Error('Condition must be a function');
    }
    if (!condition(value, params)) {
      return { valid: true };
    }
    return rule(value, params);
  };
}

/**
 * Async custom validation
 * For validations that require async operations (API calls, database lookups)
 * @param {Function} validatorFn - Async validator function
 * @param {string} message - Error message
 * @returns {Function} - Async validation rule
 *
 * @example
 * const rule = asyncRule((value) => {
 *   const exists = await checkEmailExists(value);
 *   return { valid: !exists, message: 'Email already in use' };
 * });
 */
export function asyncRule(validatorFn, message) {
  if (typeof validatorFn !== 'function') {
    throw new Error('Async validator must be a function');
  }
  return async (value, params = {}) => {
    try {
      const result = await validatorFn(value, params);
      return {
        valid: result.valid === true,
        message: message || result.message || 'Validation failed'
      };
    } catch (error) {
      return {
        valid: false,
        message: message || error.message || 'Validation error'
      };
    }
  };
}

/**
 * Integer validation
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = integer('Must be a whole number');
 * rule(42) // { valid: true }
 * rule(42.5) // { valid: false, message: 'Must be a whole number' }
 */
export function integer(message) {
  return (value, params = {}) => {
    return {
      valid: Number.isInteger(Number(value)),
      message: message || params.message || 'Value must be an integer'
    };
  };
}

/**
 * Numeric validation
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = numeric('Must be a number');
 * rule(42) // { valid: true }
 * rule('not a number') // { valid: false, message: 'Must be a number' }
 */
export function numeric(message) {
  return (value, params = {}) => {
    return {
      valid: !isNaN(value) && value !== '',
      message: message || params.message || 'Value must be numeric'
    };
  };
}

/**
 * Array length validation
 * @param {number} minLen - Minimum array length
 * @param {number} maxLen - Maximum array length
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = arrayLength(1, 5, 'Select 1-5 items');
 * rule([1, 2, 3]) // { valid: true }
 * rule([]) // { valid: false }
 */
export function arrayLength(minLen = 1, maxLen = Infinity, message) {
  return (value, params = {}) => {
    const arr = Array.isArray(value) ? value : [];
    const min = params.min !== undefined ? params.min : minLen;
    const max = params.max !== undefined ? params.max : maxLen;
    const valid = arr.length >= min && arr.length <= max;
    return {
      valid,
      message: message || params.message || `Array must have ${min}-${max} items`
    };
  };
}

/**
 * Unique values validation (for arrays)
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = unique('Duplicate values not allowed');
 * rule([1, 2, 3]) // { valid: true }
 * rule([1, 2, 1]) // { valid: false }
 */
export function unique(message) {
  return (value, params = {}) => {
    if (!Array.isArray(value)) {
      return { valid: true };
    }
    const seen = new Set();
    for (const item of value) {
      if (seen.has(item)) {
        return {
          valid: false,
          message: message || params.message || 'All values must be unique'
        };
      }
      seen.add(item);
    }
    return { valid: true };
  };
}

/**
 * Equals validation (field equality)
 * Useful for password confirmation, etc.
 * @param {*} compareValue - Value to compare against
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = equals('password', 'Passwords must match');
 * rule('secret') // { valid: true } when password is 'secret'
 */
export function equals(compareValue, message) {
  return (value, params = {}) => {
    const compare = params.value !== undefined ? params.value : compareValue;
    return {
      valid: value === compare,
      message: message || params.message || 'Values must match'
    };
  };
}

/**
 * Create a rule that validates one of several values
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} message - Custom error message
 * @returns {Function} - Validation rule function
 *
 * @example
 * const rule = oneOf(['admin', 'user', 'guest'], 'Invalid role');
 * rule('admin') // { valid: true }
 * rule('superuser') // { valid: false }
 */
export function oneOf(allowedValues, message) {
  return (value, params = {}) => {
    const allowed = params.value || allowedValues;
    return {
      valid: allowed.includes(value),
      message: message || params.message || `Value must be one of: ${allowed.join(', ')}`
    };
  };
}
