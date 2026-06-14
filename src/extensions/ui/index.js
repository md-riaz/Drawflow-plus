/**
 * UI Builder Extension
 * Provides utilities for building node settings UI
 */

class UIBuilder {
  constructor(options = {}) {
    this.builders = new Map();
    this.options = options;
  }

  /**
   * Install extension into DrawflowPlus
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   */
  install(drawflowPlus, options = {}) {
    this.drawflowPlus = drawflowPlus;
    this.options = { ...this.options, ...options };

    // Add methods to DrawflowPlus instance
    drawflowPlus.createUIBuilder = this.createBuilder.bind(this);
    drawflowPlus.getUIBuilder = this.getBuilder.bind(this);
  }

  /**
   * Create a new UI builder
   * @param {string} name - Builder name
   * @param {Object} config - Builder configuration
   * @returns {UIBuilder} - New UI builder instance
   */
  createBuilder(name, config = {}) {
    const builder = new SettingsUIBuilder(name, config);
    this.builders.set(name, builder);
    return builder;
  }

  /**
   * Get a UI builder by name
   * @param {string} name - Builder name
   * @returns {UIBuilder} - UI builder instance
   */
  getBuilder(name) {
    return this.builders.get(name);
  }

  /**
   * Get all UI builders
   * @returns {Array} - Array of builder names
   */
  getBuilderNames() {
    return Array.from(this.builders.keys());
  }
}

/**
 * Settings UI Builder class
 */
class SettingsUIBuilder {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.fields = [];
  }

  /**
   * Add a text field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addTextField(name, options = {}) {
    this.fields.push({
      type: 'text',
      name,
      label: options.label || name,
      placeholder: options.placeholder || '',
      required: options.required || false,
      defaultValue: options.defaultValue || '',
      validation: options.validation || null
    });
    return this;
  }

  /**
   * Add a number field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addNumberField(name, options = {}) {
    this.fields.push({
      type: 'number',
      name,
      label: options.label || name,
      min: options.min || 0,
      max: options.max || null,
      defaultValue: options.defaultValue || 0,
      required: options.required || false
    });
    return this;
  }

  /**
   * Add a select/dropdown field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addSelectField(name, options = {}) {
    this.fields.push({
      type: 'select',
      name,
      label: options.label || name,
      options: options.options || [],
      defaultValue: options.defaultValue || '',
      required: options.required || false
    });
    return this;
  }

  /**
   * Add a checkbox field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addCheckboxField(name, options = {}) {
    this.fields.push({
      type: 'checkbox',
      name,
      label: options.label || name,
      defaultValue: options.defaultValue || false
    });
    return this;
  }

  /**
   * Add a textarea field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addTextareaField(name, options = {}) {
    this.fields.push({
      type: 'textarea',
      name,
      label: options.label || name,
      placeholder: options.placeholder || '',
      rows: options.rows || 4,
      defaultValue: options.defaultValue || '',
      required: options.required || false
    });
    return this;
  }

  /**
   * Get all fields
   * @returns {Array} - Array of field definitions
   */
  getFields() {
    return this.fields;
  }

  /**
   * Render the UI as HTML
   * @returns {string} - HTML string
   */
  render() {
    let html = `<div class="settings-form" data-builder="${this.name}">`;

    this.fields.forEach(field => {
      html += this.renderField(field);
    });

    html += '</div>';
    return html;
  }

  /**
   * Render a single field
   * @private
   * @param {Object} field - Field definition
   * @returns {string} - HTML string
   */
  renderField(field) {
    const required = field.required ? 'required' : '';
    let html = `<div class="form-group field-${field.type}">`;
    html += `<label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>`;

    switch (field.type) {
      case 'text':
        html += `<input type="text" id="${field.name}" name="${field.name}" `;
        html += `placeholder="${field.placeholder}" value="${field.defaultValue}" ${required} />`;
        break;

      case 'number':
        html += `<input type="number" id="${field.name}" name="${field.name}" `;
        if (field.min !== null) html += `min="${field.min}" `;
        if (field.max !== null) html += `max="${field.max}" `;
        html += `value="${field.defaultValue}" ${required} />`;
        break;

      case 'select':
        html += `<select id="${field.name}" name="${field.name}" ${required}>`;
        html += `<option value="">-- Select --</option>`;
        field.options.forEach(opt => {
          const selected = opt.value === field.defaultValue ? 'selected' : '';
          html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        });
        html += '</select>';
        break;

      case 'checkbox':
        const checked = field.defaultValue ? 'checked' : '';
        html += `<input type="checkbox" id="${field.name}" name="${field.name}" ${checked} />`;
        break;

      case 'textarea':
        html += `<textarea id="${field.name}" name="${field.name}" `;
        html += `rows="${field.rows}" placeholder="${field.placeholder}" ${required}>`;
        html += `${field.defaultValue}</textarea>`;
        break;

      default:
        html += `<input type="text" id="${field.name}" name="${field.name}" />`;
    }

    html += '</div>';
    return html;
  }
}

export default UIBuilder;
