/**
 * Validation Framework Extension
 * Provides comprehensive validation rules, async support, and contextual validation
 * for Drawflow-plus nodes
 *
 * @module extensions/validation
 */

/**
 * ValidationFramework class
 * Central framework for managing validation rules and validators
 *
 * @class ValidationFramework
 * @example
 * const validation = new ValidationFramework();
 * const validator = validation.createValidator({
 *   name: 'required',
 *   email: ['required', 'email']
 * });
 * const result = await validator.validate({ name: 'John', email: 'john@example.com' });
 */
class ValidationFramework {
  /**
   * Create a new ValidationFramework instance
   * @param {Object} options - Framework options
   * @param {boolean} options.stopOnFirstError - Stop validation on first error per field
   * @param {boolean} options.asyncValidation - Enable async validator support
   * @param {Function} options.onError - Global error callback
   */
  constructor(options = {}) {
    this.rules = new Map();
    this.nodeValidators = new Map();
    this.options = {
      stopOnFirstError: false,
      asyncValidation: true,
      onError: null,
      ...options
    };
    this.context = null;
    this.initDefaultRules();
  }

  /**
   * Install extension into DrawflowPlus instance
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   * @returns {void}
   */
  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };

    // Add methods to DrawflowPlus instance
    drawflowPlus.createValidator = this.createValidator.bind(this);
    drawflowPlus.registerValidationRule = this.registerRule.bind(this);
    drawflowPlus.registerNodeValidator = this.registerNodeValidator.bind(this);
    drawflowPlus.validate = this.validate.bind(this);
    drawflowPlus.validateField = this.validateField.bind(this);
  }

  /**
   * Initialize default validation rules
   * @private
   * @returns {void}
   */
  initDefaultRules() {
    // Required field validation
    this.registerRule('required', (value, params = {}) => {
      const isEmpty = value === null || value === undefined || value === '';
      return {
        valid: !isEmpty,
        message: params.message || 'This field is required'
      };
    });

    // Email validation
    this.registerRule('email', (value, params = {}) => {
      if (!value) return { valid: true }; // Required rule handles emptiness
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(value),
        message: params.message || 'Invalid email address'
      };
    });

    // URL validation
    this.registerRule('url', (value, params = {}) => {
      if (!value) return { valid: true };
      try {
        new URL(value);
        return { valid: true };
      } catch (e) {
        return { valid: false, message: params.message || 'Invalid URL' };
      }
    });

    // Phone number validation
    this.registerRule('phoneNumber', (value, params = {}) => {
      if (!value) return { valid: true };
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      return {
        valid: phoneRegex.test(value),
        message: params.message || 'Invalid phone number'
      };
    });

    // Minimum numeric value
    this.registerRule('min', (value, params = {}) => {
      const min = params.value !== undefined ? params.value : 0;
      const numValue = parseFloat(value);
      return {
        valid: !isNaN(numValue) && numValue >= min,
        message: params.message || `Value must be at least ${min}`
      };
    });

    // Maximum numeric value
    this.registerRule('max', (value, params = {}) => {
      const max = params.value !== undefined ? params.value : Infinity;
      const numValue = parseFloat(value);
      return {
        valid: !isNaN(numValue) && numValue <= max,
        message: params.message || `Value must be at most ${max}`
      };
    });

    // Range validation
    this.registerRule('range', (value, params = {}) => {
      const min = params.min !== undefined ? params.min : 0;
      const max = params.max !== undefined ? params.max : Infinity;
      const numValue = parseFloat(value);
      return {
        valid: !isNaN(numValue) && numValue >= min && numValue <= max,
        message: params.message || `Value must be between ${min} and ${max}`
      };
    });

    // Minimum string length
    this.registerRule('minLength', (value, params = {}) => {
      const minLen = params.value !== undefined ? params.value : 0;
      const strValue = String(value || '');
      return {
        valid: strValue.length >= minLen,
        message: params.message || `Must be at least ${minLen} characters`
      };
    });

    // Maximum string length
    this.registerRule('maxLength', (value, params = {}) => {
      const maxLen = params.value !== undefined ? params.value : Infinity;
      const strValue = String(value || '');
      return {
        valid: strValue.length <= maxLen,
        message: params.message || `Must be at most ${maxLen} characters`
      };
    });

    // Regex pattern matching
    this.registerRule('pattern', (value, params = {}) => {
      if (!value) return { valid: true };
      const regex = params.value instanceof RegExp ? params.value : new RegExp(params.value);
      return {
        valid: regex.test(String(value)),
        message: params.message || 'Invalid format'
      };
    });

    // Numeric value validation
    this.registerRule('numeric', (value, params = {}) => {
      return {
        valid: !isNaN(value) && value !== '',
        message: params.message || 'Value must be numeric'
      };
    });

    // Integer validation
    this.registerRule('integer', (value, params = {}) => {
      return {
        valid: Number.isInteger(Number(value)),
        message: params.message || 'Value must be an integer'
      };
    });

    // Custom validation function
    this.registerRule('custom', (value, params = {}) => {
      if (typeof params.fn !== 'function') {
        throw new Error('Custom rule requires a function in params.fn');
      }
      return params.fn(value, params);
    });
  }

  /**
   * Register a custom validation rule
   * @param {string} name - Rule name (e.g., 'required', 'email')
   * @param {Function} rule - Validation function that returns {valid, message}
   * @returns {ValidationFramework} - Returns this for method chaining
   * @throws {Error} If rule is not a function
   *
   * @example
   * framework.registerRule('sku', (value) => ({
   *   valid: /^[A-Z]{3}-\d{4}$/.test(value),
   *   message: 'Invalid SKU format'
   * }));
   */
  registerRule(name, rule) {
    if (typeof rule !== 'function') {
      throw new Error('Validation rule must be a function');
    }
    this.rules.set(name, rule);
    return this;
  }

  /**
   * Register a validator for a specific node type
   * @param {string} nodeTypeId - Node type identifier
   * @param {Function} validatorFn - Validator function
   * @returns {ValidationFramework} - Returns this for method chaining
   *
   * @example
   * framework.registerNodeValidator('incomingCall', (config, context) => {
   *   const errors = [];
   *   if (!config.phoneNumber) errors.push('Phone number required');
   *   return { valid: errors.length === 0, errors };
   * });
   */
  registerNodeValidator(nodeTypeId, validatorFn) {
    if (typeof validatorFn !== 'function') {
      throw new Error('Node validator must be a function');
    }
    this.nodeValidators.set(nodeTypeId, validatorFn);
    return this;
  }

  /**
   * Create a new validator with a specific schema
   * @param {Object} schema - Validation schema mapping fields to rules
   * @param {Object} options - Validator options
   * @returns {Validator} - New Validator instance
   *
   * @example
   * const validator = framework.createValidator({
   *   name: 'required',
   *   email: ['required', 'email'],
   *   age: { name: 'range', min: 18, max: 100 }
   * });
   */
  createValidator(schema, options = {}) {
    return new Validator(schema, this.rules, {
      ...this.options,
      ...options
    });
  }

  /**
   * Validate a node's configuration
   * @param {string} nodeTypeId - Node type identifier
   * @param {Object} config - Node configuration object
   * @param {Object} context - Context object with other nodes (optional)
   * @returns {Promise<Object>} - Validation result {valid, errors, fieldErrors}
   *
   * @example
   * const result = await validation.validate('incomingCall', {
   *   phoneNumber: '+1234567890',
   *   extension: 101
   * });
   */
  async validate(nodeTypeId, config, context = null) {
    this.context = context;
    const validator = this.nodeValidators.get(nodeTypeId);

    if (!validator) {
      return { valid: true, errors: [], fieldErrors: {} };
    }

    try {
      const result = await validator(config, context);
      return {
        valid: result.valid === true,
        errors: result.errors || [],
        fieldErrors: result.fieldErrors || {}
      };
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error, nodeTypeId, config);
      }
      throw error;
    }
  }

  /**
   * Validate a single field value
   * @param {Object} fieldDef - Field definition {name, rules}
   * @param {*} value - Value to validate
   * @param {Object} context - Context object (optional)
   * @returns {Promise<Object>} - Validation result {valid, errors}
   *
   * @example
   * const result = await validation.validateField(
   *   { name: 'email', rules: ['required', 'email'] },
   *   'user@example.com'
   * );
   */
  async validateField(fieldDef, value, context = null) {
    this.context = context;
    const validator = this.createValidator({
      [fieldDef.name]: fieldDef.rules
    });

    const result = validator.validate({
      [fieldDef.name]: value
    });

    return {
      valid: result.valid,
      errors: result.errors[fieldDef.name] || []
    };
  }

  /**
   * Get all validation rules for a node type
   * @param {string} nodeTypeId - Node type identifier
   * @returns {Object} - Rules configuration object
   */
  getValidationRules(nodeTypeId) {
    const validator = this.nodeValidators.get(nodeTypeId);
    return validator ? { nodeTypeId, rules: validator } : null;
  }

  /**
   * Get a registered rule function
   * @param {string} name - Rule name
   * @returns {Function|undefined} - Rule function or undefined
   */
  getRule(name) {
    return this.rules.get(name);
  }

  /**
   * Get all registered rules
   * @returns {Object} - Object with all rule names as keys
   */
  getAllRules() {
    const rules = {};
    this.rules.forEach((fn, name) => {
      rules[name] = fn;
    });
    return rules;
  }

  /**
   * Clear all custom validators (keeps default rules)
   * @returns {void}
   */
  reset() {
    this.nodeValidators.clear();
    this.context = null;
  }
}

/**
 * Validator class
 * Validates data against a defined schema
 *
 * @class Validator
 * @private
 */
class Validator {
  /**
   * Create a new Validator instance
   * @param {Object} schema - Validation schema
   * @param {Map} rules - Registered validation rules
   * @param {Object} options - Validator options
   */
  constructor(schema, rules, options = {}) {
    this.schema = schema;
    this.rules = rules;
    this.options = options;
    this.fieldErrors = {};
    this.errors = [];
  }

  /**
   * Validate data against the schema
   * @param {Object} data - Data to validate
   * @returns {Object} - Result {valid, errors, fieldErrors}
   */
  validate(data) {
    this.fieldErrors = {};
    this.errors = [];

    for (const field in this.schema) {
      if (Object.prototype.hasOwnProperty.call(this.schema, field)) {
        const fieldRules = this.schema[field];
        const value = data[field];
        this.validateField(field, value, fieldRules);

        if (this.options.stopOnFirstError && this.fieldErrors[field]) {
          break;
        }
      }
    }

    return {
      valid: Object.keys(this.fieldErrors).length === 0,
      errors: this.errors,
      fieldErrors: this.fieldErrors
    };
  }

  /**
   * Validate a single field
   * @private
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Array|Object|string} rules - Field rules
   * @returns {void}
   */
  validateField(field, value, rules) {
    const ruleArray = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleArray) {
      const result = this.executeRule(rule, value);

      if (!result.valid) {
        if (!this.fieldErrors[field]) {
          this.fieldErrors[field] = [];
        }
        this.fieldErrors[field].push(result.message);
        this.errors.push(`${field}: ${result.message}`);

        if (this.options.stopOnFirstError) {
          break;
        }
      }
    }
  }

  /**
   * Execute a single validation rule
   * @private
   * @param {string|Object} rule - Rule name or rule object
   * @param {*} value - Value to validate
   * @returns {Object} - Rule result {valid, message}
   * @throws {Error} If rule is unknown
   */
  executeRule(rule, value) {
    if (typeof rule === 'string') {
      const ruleFn = this.rules.get(rule);
      if (!ruleFn) {
        throw new Error(`Unknown validation rule: ${rule}`);
      }
      return ruleFn(value);
    }

    if (typeof rule === 'object' && rule.name) {
      const ruleFn = this.rules.get(rule.name);
      if (!ruleFn) {
        throw new Error(`Unknown validation rule: ${rule.name}`);
      }
      return ruleFn(value, rule);
    }

    throw new Error('Invalid rule format');
  }

  /**
   * Get all validation errors
   * @returns {Object} - Error object {fieldName: [errors]}
   */
  getErrors() {
    return this.fieldErrors;
  }

  /**
   * Get errors for a specific field
   * @param {string} field - Field name
   * @returns {Array} - Array of error messages
   */
  getFieldErrors(field) {
    return this.fieldErrors[field] || [];
  }

  /**
   * Check if validation passed
   * @returns {boolean} - True if no errors
   */
  isValid() {
    return Object.keys(this.fieldErrors).length === 0;
  }

  /**
   * Get first error message
   * @returns {string|null} - First error message or null
   */
  getFirstError() {
    return this.errors[0] || null;
  }

  /**
   * Clear all errors
   * @returns {void}
   */
  clearErrors() {
    this.fieldErrors = {};
    this.errors = [];
  }
}

export default ValidationFramework;
export { Validator };
