/**
 * Field Renderers for Form Builder
 * Handles rendering and management of individual field types
 */

/**
 * Base FieldRenderer class
 * @class
 * @abstract
 */
class FieldRenderer {
  /**
   * Create a FieldRenderer instance
   * @param {Object} fieldDef - Field definition
   * @param {*} value - Current field value
   * @param {Object} options - Renderer options
   */
  constructor(fieldDef, value, options = {}) {
    this.fieldDef = fieldDef;
    this.value = value;
    this.options = options;
  }

  /**
   * Render the field to HTML
   * @abstract
   * @returns {string} HTML string
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Parse value from field
   * @abstract
   * @param {HTMLElement} element - Field DOM element
   * @returns {*} Parsed value
   */
  parseValue(element) {
    throw new Error('parseValue() must be implemented by subclass');
  }

  /**
   * Set field to disabled state
   * @param {HTMLElement} element - Field DOM element
   * @param {boolean} disabled - Disabled state
   */
  setDisabled(element, disabled = true) {
    if (element) {
      if (disabled) {
        element.setAttribute('disabled', '');
      } else {
        element.removeAttribute('disabled');
      }
    }
  }

  /**
   * Display validation error
   * @param {HTMLElement} container - Field container element
   * @param {string} message - Error message
   */
  displayError(container, message) {
    if (!container) return;

    container.classList.add('df-has-error');

    const errorEl = container.querySelector('.df-field-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Clear validation error
   * @param {HTMLElement} container - Field container element
   */
  clearError(container) {
    if (!container) return;

    container.classList.remove('df-has-error');

    const errorEl = container.querySelector('.df-field-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  /**
   * Escape HTML special characters
   * @protected
   * @param {*} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

/**
 * TextRenderer - Renders text input fields
 * @class
 * @extends FieldRenderer
 */
class TextRenderer extends FieldRenderer {
  /**
   * Render text input field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      maxLength,
      pattern,
      attributes = {}
    } = this.fieldDef;

    const requiredMark = required ? ' <span class="df-required">*</span>' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const maxLengthAttr = maxLength ? `maxlength="${maxLength}"` : '';
    const patternAttr = pattern ? `pattern="${pattern}"` : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = '';
    if (label) {
      html += `<label for="${name}" class="df-label">${label}${requiredMark}</label>`;
    }

    html += `<input type="text" class="df-input df-text-input" id="${name}" name="${name}" `;
    html += `placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(this.value)}" `;
    html += `${disabledAttr} ${readonlyAttr} ${maxLengthAttr} ${patternAttr} ${dataAttrs} />`;

    return html;
  }

  /**
   * Parse value from text input
   * @param {HTMLInputElement} element - Input element
   * @returns {string} Trimmed input value
   */
  parseValue(element) {
    return element ? String(element.value || '').trim() : '';
  }
}

/**
 * NumberRenderer - Renders number input fields
 * @class
 * @extends FieldRenderer
 */
class NumberRenderer extends FieldRenderer {
  /**
   * Render number input field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      required = false,
      disabled = false,
      readonly = false,
      min,
      max,
      step = 1,
      attributes = {}
    } = this.fieldDef;

    const requiredMark = required ? ' <span class="df-required">*</span>' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const minAttr = min !== undefined ? `min="${min}"` : '';
    const maxAttr = max !== undefined ? `max="${max}"` : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = '';
    if (label) {
      html += `<label for="${name}" class="df-label">${label}${requiredMark}</label>`;
    }

    html += `<input type="number" class="df-input df-number-input" id="${name}" name="${name}" `;
    html += `${minAttr} ${maxAttr} step="${step}" value="${this.escapeHtml(this.value)}" `;
    html += `${disabledAttr} ${readonlyAttr} ${dataAttrs} />`;

    return html;
  }

  /**
   * Parse value from number input
   * @param {HTMLInputElement} element - Input element
   * @returns {number} Parsed number or null
   */
  parseValue(element) {
    if (!element) return null;
    const val = element.value;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
}

/**
 * EmailRenderer - Renders email input fields
 * @class
 * @extends FieldRenderer
 */
class EmailRenderer extends FieldRenderer {
  /**
   * Render email input field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      attributes = {}
    } = this.fieldDef;

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

    html += `<input type="email" class="df-input df-email-input" id="${name}" name="${name}" `;
    html += `placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(this.value)}" `;
    html += `${disabledAttr} ${readonlyAttr} ${dataAttrs} />`;

    return html;
  }

  /**
   * Parse value from email input
   * @param {HTMLInputElement} element - Input element
   * @returns {string} Email value
   */
  parseValue(element) {
    return element ? String(element.value || '').trim().toLowerCase() : '';
  }
}

/**
 * SelectRenderer - Renders select/dropdown fields
 * @class
 * @extends FieldRenderer
 */
class SelectRenderer extends FieldRenderer {
  /**
   * Render select field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      required = false,
      disabled = false,
      placeholder = 'Select...',
      options = [],
      isAsync = false,
      attributes = {}
    } = this.fieldDef;

    const requiredMark = required ? ' <span class="df-required">*</span>' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = '';
    if (label) {
      html += `<label for="${name}" class="df-label">${label}${requiredMark}</label>`;
    }

    html += `<div class="df-select-wrapper">`;
    html += `<select class="df-input df-select-input" id="${name}" name="${name}" `;
    html += `${disabledAttr} ${dataAttrs}>`;

    html += `<option value="">-- ${this.escapeHtml(placeholder)} --</option>`;

    if (isAsync && options.length === 0) {
      html += `<option value="" disabled class="df-loading">Loading options...</option>`;
    } else {
      options.forEach((opt) => {
        const selected = opt.value === this.value ? 'selected' : '';
        html += `<option value="${opt.value}" ${selected}>${this.escapeHtml(opt.label)}</option>`;
      });
    }

    html += '</select>';
    if (isAsync) {
      html += `<span class="df-async-indicator"></span>`;
    }
    html += '</div>';

    return html;
  }

  /**
   * Parse value from select field
   * @param {HTMLSelectElement} element - Select element
   * @returns {*} Selected value
   */
  parseValue(element) {
    return element ? element.value : null;
  }

  /**
   * Update select options
   * @param {HTMLSelectElement} element - Select element
   * @param {Array} options - Option array
   */
  updateOptions(element, options) {
    if (!element) return;

    const currentValue = element.value;
    element.innerHTML = `<option value="">-- ${this.fieldDef.placeholder || 'Select...'} --</option>`;

    options.forEach((opt) => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      element.appendChild(optionEl);
    });

    element.value = currentValue;
  }

  /**
   * Show loading state
   * @param {HTMLSelectElement} element - Select element
   */
  showLoading(element) {
    if (!element) return;
    const wrapper = element.parentElement;
    if (wrapper) {
      wrapper.classList.add('df-loading');
    }
  }

  /**
   * Hide loading state
   * @param {HTMLSelectElement} element - Select element
   */
  hideLoading(element) {
    if (!element) return;
    const wrapper = element.parentElement;
    if (wrapper) {
      wrapper.classList.remove('df-loading');
    }
  }
}

/**
 * TextareaRenderer - Renders textarea fields
 * @class
 * @extends FieldRenderer
 */
class TextareaRenderer extends FieldRenderer {
  /**
   * Render textarea field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      rows = 4,
      maxLength,
      attributes = {}
    } = this.fieldDef;

    const requiredMark = required ? ' <span class="df-required">*</span>' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const maxLengthAttr = maxLength ? `maxlength="${maxLength}"` : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = '';
    if (label) {
      html += `<label for="${name}" class="df-label">${label}${requiredMark}</label>`;
    }

    html += `<textarea class="df-input df-textarea-input" id="${name}" name="${name}" `;
    html += `rows="${rows}" placeholder="${this.escapeHtml(placeholder)}" `;
    html += `${disabledAttr} ${readonlyAttr} ${maxLengthAttr} ${dataAttrs}>`;
    html += this.escapeHtml(this.value);
    html += '</textarea>';

    return html;
  }

  /**
   * Parse value from textarea
   * @param {HTMLTextAreaElement} element - Textarea element
   * @returns {string} Textarea value
   */
  parseValue(element) {
    return element ? String(element.value || '') : '';
  }
}

/**
 * SwitchRenderer - Renders switch/checkbox toggle fields
 * @class
 * @extends FieldRenderer
 */
class SwitchRenderer extends FieldRenderer {
  /**
   * Render switch field
   * @returns {string} HTML string
   */
  render() {
    const {
      name,
      label,
      disabled = false,
      attributes = {}
    } = this.fieldDef;

    const checked = this.value ? 'checked' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const dataAttrs = Object.entries(attributes)
      .map(([key, val]) => `data-${key}="${val}"`)
      .join(' ');

    let html = `<div class="df-switch-group">`;
    html += `<input type="checkbox" class="df-input df-switch-input" id="${name}" name="${name}" `;
    html += `${checked} ${disabledAttr} ${dataAttrs} />`;
    html += `<label for="${name}" class="df-switch-label"></label>`;

    if (label) {
      html += `<label for="${name}" class="df-switch-text">${label}</label>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Parse value from switch
   * @param {HTMLInputElement} element - Checkbox element
   * @returns {boolean} Checked state
   */
  parseValue(element) {
    return element ? element.checked : false;
  }
}

/**
 * CustomRenderer - Renders custom field types
 * @class
 * @extends FieldRenderer
 */
class CustomRenderer extends FieldRenderer {
  /**
   * Render custom field
   * @returns {string} HTML string
   */
  render() {
    const { renderer } = this.fieldDef;

    if (typeof renderer === 'function') {
      return renderer(this.fieldDef, this.value, this.options);
    }

    console.warn('Custom field renderer is not a function');
    return `<input type="text" class="df-input" value="${this.escapeHtml(this.value)}" />`;
  }

  /**
   * Parse value from custom field
   * @param {HTMLElement} element - Field element
   * @returns {*} Custom parsed value
   */
  parseValue(element) {
    const { parser } = this.fieldDef;

    if (typeof parser === 'function') {
      return parser(element);
    }

    return element ? element.value : null;
  }
}

/**
 * FieldRendererFactory - Creates appropriate renderer for field type
 * @class
 */
class FieldRendererFactory {
  /**
   * Get renderer for field type
   * @static
   * @param {string} fieldType - Field type identifier
   * @param {Object} fieldDef - Field definition
   * @param {*} value - Current field value
   * @param {Object} options - Renderer options
   * @returns {FieldRenderer} Appropriate renderer instance
   */
  static createRenderer(fieldType, fieldDef, value, options = {}) {
    switch (fieldType) {
      case 'text':
        return new TextRenderer(fieldDef, value, options);
      case 'number':
        return new NumberRenderer(fieldDef, value, options);
      case 'email':
        return new EmailRenderer(fieldDef, value, options);
      case 'select':
        return new SelectRenderer(fieldDef, value, options);
      case 'textarea':
        return new TextareaRenderer(fieldDef, value, options);
      case 'switch':
        return new SwitchRenderer(fieldDef, value, options);
      case 'custom':
        return new CustomRenderer(fieldDef, value, options);
      default:
        console.warn(`Unknown field type: ${fieldType}, using TextRenderer`);
        return new TextRenderer(fieldDef, value, options);
    }
  }
}

export {
  FieldRenderer,
  TextRenderer,
  NumberRenderer,
  EmailRenderer,
  SelectRenderer,
  TextareaRenderer,
  SwitchRenderer,
  CustomRenderer,
  FieldRendererFactory
};
