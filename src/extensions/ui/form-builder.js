/**
 * Form Builder Extension for Settings UI
 * Provides advanced form generation with validation, dependencies, and async field support
 */

/**
 * FormBuilder class - Builds and manages dynamic settings forms
 * @class
 * @example
 * const builder = new FormBuilder();
 * const form = builder.generateForm('nodeSettings', {
 *   fields: [
 *     { name: 'title', type: 'text', label: 'Title', required: true },
 *     { name: 'enabled', type: 'switch', label: 'Enable', defaultValue: true }
 *   ]
 * });
 */
class FormBuilder {
  /**
   * Create a FormBuilder instance
   * @param {Object} options - Builder options
   * @param {Function} options.onSubmit - Form submission callback
   * @param {Function} options.onChange - Field change callback
   * @param {Function} options.onError - Error callback
   */
  constructor(options = {}) {
    this.options = options;
    this.forms = new Map();
    this.validators = new Map();
    this.dirtyFields = new Map();
    this.fieldErrors = new Map();
    this.asyncLoading = new Map();
  }

  /**
   * Generate a form from configuration
   * @param {string} nodeType - Node type identifier
   * @param {Object} config - Form configuration
   * @param {Array} config.fields - Array of field definitions
   * @param {Object} config.values - Initial field values
   * @param {Object} config.validation - Validation schema
   * @param {Object} config.dependencies - Field dependency rules
   * @returns {Object} Form instance with render method
   * @example
   * const form = formBuilder.generateForm('emailNode', {
   *   fields: [
   *     { name: 'to', type: 'email', label: 'Recipient', required: true },
   *     { name: 'subject', type: 'text', label: 'Subject' }
   *   ],
   *   validation: {
   *     to: ['required', 'email'],
   *     subject: 'required'
   *   }
   * });
   */
  generateForm(nodeType, config = {}) {
    if (!nodeType) {
      throw new Error('Node type is required');
    }

    const formId = `form-${nodeType}-${Date.now()}`;
    const fieldDefinitions = config.fields || [];
    const initialValues = config.values || {};
    const validationSchema = config.validation || {};
    const dependencies = config.dependencies || {};

    const form = {
      id: formId,
      nodeType,
      fieldDefinitions,
      values: { ...initialValues },
      validationSchema,
      dependencies,
      config,
      render: () => this._renderForm(formId, fieldDefinitions, initialValues, dependencies),
      submit: (formElement) => this._submitForm(formId, formElement),
      setValue: (fieldName, value) => this._setFieldValue(formId, fieldName, value),
      getValue: (fieldName) => this._getFieldValue(formId, fieldName),
      getValues: () => this._getFormValues(formId),
      setError: (fieldName, message) => this._setFieldError(formId, fieldName, message),
      clearError: (fieldName) => this._clearFieldError(formId, fieldName),
      getErrors: () => this._getFormErrors(formId),
      getDirtyFields: () => this._getDirtyFields(formId),
      reset: () => this._resetForm(formId),
      validate: () => this._validateForm(formId)
    };

    this.forms.set(formId, form);
    return form;
  }

  /**
   * Render a form to HTML string
   * @private
   * @param {string} formId - Form ID
   * @param {Array} fields - Field definitions
   * @param {Object} values - Field values
   * @param {Object} dependencies - Field dependencies
   * @returns {string} HTML string
   */
  _renderForm(formId, fields, values, dependencies) {
    let html = `<form class="df-form" data-form-id="${formId}">`;

    fields.forEach((fieldDef) => {
      const value = values[fieldDef.name] || fieldDef.defaultValue || '';
      const isDependentHidden = this._isFieldHidden(fieldDef, dependencies);
      const visibility = isDependentHidden ? 'style="display:none;"' : '';

      html += `<div class="df-form-field field-${fieldDef.type}" data-field-name="${fieldDef.name}" ${visibility}>`;
      html += this._renderField(fieldDef, value, formId);
      html += `<div class="df-field-error" data-field="${fieldDef.name}"></div>`;
      html += '</div>';
    });

    html += '</form>';
    return html;
  }

  /**
   * Render individual field based on type
   * @private
   * @param {Object} fieldDef - Field definition
   * @param {*} value - Current field value
   * @param {string} formId - Parent form ID
   * @returns {string} HTML string
   */
  _renderField(fieldDef, value, formId) {
    const {
      type = 'text',
      name,
      label,
      required = false,
      placeholder = '',
      disabled = false,
      readonly = false,
      attributes = {}
    } = fieldDef;

    const requiredMark = required ? ' <span class="df-required">*</span>' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = '';

    if (label) {
      html += `<label for="${name}" class="df-label">${label}${requiredMark}</label>`;
    }

    switch (type) {
      case 'text':
        html += `<input type="text" class="df-input df-text-input" id="${name}" name="${name}" `;
        html += `placeholder="${placeholder}" value="${this._escapeHtml(value)}" `;
        html += `${disabledAttr} ${readonlyAttr} ${dataAttrs} />`;
        break;

      case 'email':
        html += `<input type="email" class="df-input df-email-input" id="${name}" name="${name}" `;
        html += `placeholder="${placeholder}" value="${this._escapeHtml(value)}" `;
        html += `${disabledAttr} ${readonlyAttr} ${dataAttrs} />`;
        break;

      case 'number':
        const min = fieldDef.min !== undefined ? `min="${fieldDef.min}"` : '';
        const max = fieldDef.max !== undefined ? `max="${fieldDef.max}"` : '';
        const step = fieldDef.step || '1';
        html += `<input type="number" class="df-input df-number-input" id="${name}" name="${name}" `;
        html += `${min} ${max} step="${step}" value="${value}" `;
        html += `${disabledAttr} ${readonlyAttr} ${dataAttrs} />`;
        break;

      case 'select':
        html += `<select class="df-input df-select-input" id="${name}" name="${name}" `;
        html += `${disabledAttr} ${dataAttrs}>`;

        if (fieldDef.placeholder) {
          html += `<option value="">-- ${fieldDef.placeholder} --</option>`;
        }

        if (fieldDef.isAsync) {
          html += `<option value="" disabled>${this._getLoadingState(formId, name)}</option>`;
        } else if (fieldDef.options) {
          fieldDef.options.forEach((opt) => {
            const selected = opt.value === value ? 'selected' : '';
            html += `<option value="${opt.value}" ${selected}>${this._escapeHtml(opt.label)}</option>`;
          });
        }
        html += '</select>';
        break;

      case 'textarea':
        const rows = fieldDef.rows || 4;
        html += `<textarea class="df-input df-textarea-input" id="${name}" name="${name}" `;
        html += `rows="${rows}" placeholder="${placeholder}" ${disabledAttr} ${readonlyAttr} ${dataAttrs}>`;
        html += this._escapeHtml(value);
        html += '</textarea>';
        break;

      case 'switch':
        const checked = value ? 'checked' : '';
        html += `<input type="checkbox" class="df-input df-switch-input" id="${name}" name="${name}" `;
        html += `${checked} ${disabledAttr} ${dataAttrs} />`;
        html += `<label for="${name}" class="df-switch-label"></label>`;
        break;

      case 'custom':
        if (fieldDef.renderer && typeof fieldDef.renderer === 'function') {
          html += fieldDef.renderer(fieldDef, value, formId);
        } else {
          console.warn(`No renderer provided for custom field: ${name}`);
          html += `<input type="text" class="df-input" id="${name}" name="${name}" value="${this._escapeHtml(value)}" />`;
        }
        break;

      default:
        console.warn(`Unknown field type: ${type}`);
        html += `<input type="text" class="df-input" id="${name}" name="${name}" value="${this._escapeHtml(value)}" />`;
    }

    return html;
  }

  /**
   * Check if a field should be hidden based on dependencies
   * @private
   * @param {Object} fieldDef - Field definition
   * @param {Object} dependencies - Dependency rules
   * @returns {boolean} True if field should be hidden
   */
  _isFieldHidden(fieldDef, dependencies) {
    if (!dependencies || !dependencies[fieldDef.name]) {
      return false;
    }

    const dep = dependencies[fieldDef.name];
    if (!dep.dependsOn) {
      return false;
    }

    // Simple dependency check - can be extended for complex logic
    return dep.hidden === true;
  }

  /**
   * Get loading state indicator
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @returns {string} Loading indicator text
   */
  _getLoadingState(formId, fieldName) {
    const key = `${formId}:${fieldName}`;
    return this.asyncLoading.get(key) ? 'Loading...' : 'Select...';
  }

  /**
   * Set field value
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @param {*} value - New value
   */
  _setFieldValue(formId, fieldName, value) {
    const form = this.forms.get(formId);
    if (!form) return;

    form.values[fieldName] = value;
    this._markFieldDirty(formId, fieldName);

    if (this.options.onChange) {
      this.options.onChange(fieldName, value, form.values);
    }
  }

  /**
   * Get field value
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @returns {*} Field value
   */
  _getFieldValue(formId, fieldName) {
    const form = this.forms.get(formId);
    return form ? form.values[fieldName] : undefined;
  }

  /**
   * Get all form values
   * @private
   * @param {string} formId - Form ID
   * @returns {Object} All field values
   */
  _getFormValues(formId) {
    const form = this.forms.get(formId);
    return form ? { ...form.values } : {};
  }

  /**
   * Set validation error for field
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @param {string} message - Error message
   */
  _setFieldError(formId, fieldName, message) {
    const key = `${formId}:${fieldName}`;
    this.fieldErrors.set(key, message);
  }

  /**
   * Clear validation error for field
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   */
  _clearFieldError(formId, fieldName) {
    const key = `${formId}:${fieldName}`;
    this.fieldErrors.delete(key);
  }

  /**
   * Get all form errors
   * @private
   * @param {string} formId - Form ID
   * @returns {Object} Error map
   */
  _getFormErrors(formId) {
    const errors = {};
    this.fieldErrors.forEach((message, key) => {
      if (key.startsWith(formId)) {
        const fieldName = key.split(':')[1];
        errors[fieldName] = message;
      }
    });
    return errors;
  }

  /**
   * Get dirty fields
   * @private
   * @param {string} formId - Form ID
   * @returns {Array} Array of dirty field names
   */
  _getDirtyFields(formId) {
    const key = `dirty:${formId}`;
    return this.dirtyFields.get(key) || [];
  }

  /**
   * Mark field as dirty
   * @private
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   */
  _markFieldDirty(formId, fieldName) {
    const key = `dirty:${formId}`;
    const dirty = this.dirtyFields.get(key) || [];
    if (!dirty.includes(fieldName)) {
      dirty.push(fieldName);
      this.dirtyFields.set(key, dirty);
    }
  }

  /**
   * Reset form to initial state
   * @private
   * @param {string} formId - Form ID
   */
  _resetForm(formId) {
    const form = this.forms.get(formId);
    if (!form) return;

    const initialValues = form.config.values || {};
    form.values = { ...initialValues };
    this.dirtyFields.delete(`dirty:${formId}`);
    this._clearAllFormErrors(formId);
  }

  /**
   * Clear all form errors
   * @private
   * @param {string} formId - Form ID
   */
  _clearAllFormErrors(formId) {
    const keysToDelete = [];
    this.fieldErrors.forEach((_, key) => {
      if (key.startsWith(formId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.fieldErrors.delete(key));
  }

  /**
   * Validate form
   * @private
   * @param {string} formId - Form ID
   * @returns {Object} Validation result
   */
  _validateForm(formId) {
    const form = this.forms.get(formId);
    if (!form) {
      return { valid: false, errors: {} };
    }

    this._clearAllFormErrors(formId);
    const errors = {};

    const validationSchema = form.validationSchema || {};
    form.fieldDefinitions.forEach((fieldDef) => {
      const fieldName = fieldDef.name;
      const value = form.values[fieldName];
      const rules = validationSchema[fieldName];

      if (rules) {
        const fieldErrors = this._validateField(value, fieldDef, rules);
        if (fieldErrors.length > 0) {
          errors[fieldName] = fieldErrors[0];
          this._setFieldError(formId, fieldName, fieldErrors[0]);
        }
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate a single field
   * @private
   * @param {*} value - Field value
   * @param {Object} fieldDef - Field definition
   * @param {Array|string} rules - Validation rules
   * @returns {Array} Array of error messages
   */
  _validateField(value, fieldDef, rules) {
    const errors = [];
    const ruleArray = Array.isArray(rules) ? rules : [rules];

    ruleArray.forEach((rule) => {
      let isValid = true;
      let message = '';

      if (rule === 'required') {
        isValid = value !== null && value !== undefined && value !== '';
        message = `${fieldDef.label || fieldDef.name} is required`;
      } else if (rule === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
        message = 'Invalid email address';
      } else if (typeof rule === 'object' && rule.name === 'min') {
        isValid = value >= rule.value;
        message = `Must be at least ${rule.value}`;
      } else if (typeof rule === 'object' && rule.name === 'max') {
        isValid = value <= rule.value;
        message = `Must be at most ${rule.value}`;
      } else if (typeof rule === 'object' && rule.name === 'minLength') {
        isValid = String(value).length >= rule.value;
        message = `Must be at least ${rule.value} characters`;
      } else if (typeof rule === 'object' && rule.name === 'maxLength') {
        isValid = String(value).length <= rule.value;
        message = `Must be at most ${rule.value} characters`;
      } else if (typeof rule === 'object' && rule.name === 'pattern') {
        const regex = new RegExp(rule.value);
        isValid = regex.test(value);
        message = rule.message || 'Invalid format';
      } else if (typeof rule === 'function') {
        const result = rule(value);
        isValid = result.valid !== false;
        message = result.message || 'Validation failed';
      }

      if (!isValid) {
        errors.push(message);
      }
    });

    return errors;
  }

  /**
   * Submit form
   * @private
   * @param {string} formId - Form ID
   * @param {HTMLFormElement} formElement - Form DOM element
   * @returns {Object} Submit result
   */
  _submitForm(formId, formElement) {
    const form = this.forms.get(formId);
    if (!form) {
      return { success: false, errors: { _form: 'Form not found' } };
    }

    // Validate form
    const validation = this._validateForm(formId);
    if (!validation.valid) {
      if (this.options.onError) {
        this.options.onError(validation.errors);
      }
      return { success: false, errors: validation.errors };
    }

    // Call submit handler
    if (this.options.onSubmit) {
      const result = this.options.onSubmit(form.values, form);
      if (result && typeof result.then === 'function') {
        return result.then(() => ({ success: true, values: form.values }));
      }
      return { success: true, values: form.values };
    }

    return { success: true, values: form.values };
  }

  /**
   * Escape HTML special characters
   * @private
   * @param {*} str - String to escape
   * @returns {string} Escaped string
   */
  _escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Load async dropdown options
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @param {Function} loader - Async loader function
   * @returns {Promise} Loading promise
   * @example
   * formBuilder.loadAsyncOptions(formId, 'category', async () => {
   *   const res = await fetch('/api/categories');
   *   return res.json();
   * });
   */
  loadAsyncOptions(formId, fieldName, loader) {
    if (typeof loader !== 'function') {
      return Promise.reject(new Error('Loader must be a function'));
    }

    const key = `${formId}:${fieldName}`;
    this.asyncLoading.set(key, true);

    return loader()
      .then((options) => {
        const form = this.forms.get(formId);
        if (!form) return;

        const fieldDef = form.fieldDefinitions.find(f => f.name === fieldName);
        if (fieldDef) {
          fieldDef.options = options;
          fieldDef.isAsync = false;
        }

        this.asyncLoading.delete(key);
        return options;
      })
      .catch((error) => {
        console.error(`Error loading options for ${fieldName}:`, error);
        this.asyncLoading.delete(key);
        throw error;
      });
  }

  /**
   * Update field dependencies
   * @param {string} formId - Form ID
   * @param {string} fieldName - Field name
   * @param {Object} dependencyRules - Dependency configuration
   * @example
   * formBuilder.updateDependencies(formId, 'addressField', {
   *   dependsOn: 'countryField',
   *   show: (countryValue) => countryValue === 'US'
   * });
   */
  updateDependencies(formId, fieldName, dependencyRules) {
    const form = this.forms.get(formId);
    if (!form) return;

    form.dependencies[fieldName] = dependencyRules;
  }

  /**
   * Get form by ID
   * @param {string} formId - Form ID
   * @returns {Object} Form object or undefined
   */
  getForm(formId) {
    return this.forms.get(formId);
  }

  /**
   * Delete form
   * @param {string} formId - Form ID
   * @returns {boolean} True if deleted
   */
  deleteForm(formId) {
    return this.forms.delete(formId);
  }
}

export default FormBuilder;
