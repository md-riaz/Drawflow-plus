var A = Object.defineProperty;
var V = (c, t, e) => t in c ? A(c, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : c[t] = e;
var $ = (c, t, e) => V(c, typeof t != "symbol" ? t + "" : t, e);
class dt {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   * @param {boolean} options.strict - Enable strict mode (default: true)
   * @param {boolean} options.autoNormalize - Auto-normalize node schemas (default: true)
   * @param {Function} options.onTypeRegistered - Callback when type is registered
   * @param {Function} options.onNodeCreated - Callback when node is created
   */
  constructor(t = {}) {
    this.nodeTypes = /* @__PURE__ */ new Map(), this.templates = /* @__PURE__ */ new Map(), this.validators = /* @__PURE__ */ new Map(), this.nodeInstances = /* @__PURE__ */ new Map(), this.changeListeners = /* @__PURE__ */ new Map(), this.options = {
      strict: !0,
      autoNormalize: !0,
      onTypeRegistered: null,
      onNodeCreated: null,
      ...t
    };
  }
  /**
   * Install extension into DrawflowPlus instance
   * Adds methods to the DrawflowPlus instance
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Additional options
   */
  install(t, e = {}) {
    this.drawflowPlus = t, this.options = { ...this.options, ...e }, t.registerNodeType = this.register.bind(this), t.getNodeType = this.get.bind(this), t.getAllNodeTypes = this.getAll.bind(this), t.unregisterNodeType = this.unregister.bind(this), t.validateNodeConfig = this.validate.bind(this), t.createNode = this.createNode.bind(this), t.updateNodeConfig = this.updateNodeConfig.bind(this), t.getNodeInstance = this.getNodeInstance.bind(this);
  }
  /**
   * Register a new node type with optional normalization
   * @param {string} id - Unique node type identifier
   * @param {Object} definition - Node type definition
   * @param {string} definition.label - Human-readable label
   * @param {string} definition.description - Node type description
   * @param {Object} definition.inputs - Input configuration
   * @param {Object} definition.outputs - Output configuration (static or dynamic)
   * @param {Object} definition.fields - Configuration fields
   * @param {Function} definition.validator - Custom validation function
   * @param {Function} definition.computeOutputs - Function to dynamically compute outputs
   * @param {Function} definition.renderOutput - Custom output renderer
   * @returns {NodeTypeSystem} - Returns this for chaining
   * @throws {Error} - If id is invalid or definition is incomplete
   */
  register(t, e) {
    if (!t || typeof t != "string")
      throw new Error("Node type id must be a non-empty string");
    if (typeof e != "object" || e === null)
      throw new Error("Node type definition must be an object");
    if (!e.label)
      throw new Error(`Node type "${t}" must have a label`);
    const s = this._normalizeDefinition(t, e);
    return this.nodeTypes.set(t, s), e.validator && this.validators.set(t, e.validator), this.options.onTypeRegistered && this.options.onTypeRegistered(t, s), this;
  }
  /**
   * Get a registered node type definition
   * @param {string} id - Node type identifier
   * @returns {Object|null} - Node type definition or null if not found
   */
  get(t) {
    return this.nodeTypes.get(t) || null;
  }
  /**
   * Get all registered node types
   * @returns {Array<{id: string, definition: Object}>} - Array of all registered types
   */
  getAll() {
    const t = [];
    for (const [e, s] of this.nodeTypes.entries())
      t.push({ id: e, definition: s });
    return t;
  }
  /**
   * Unregister a node type
   * @param {string} id - Node type identifier
   * @returns {boolean} - True if deleted
   */
  unregister(t) {
    const e = this.nodeTypes.delete(t);
    return e && this.validators.delete(t), e;
  }
  /**
   * Validate a node configuration against its type definition
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Node configuration to validate
   * @returns {Object} - Validation result {valid: boolean, errors: Array}
   */
  validate(t, e) {
    const s = e || {}, n = [], i = this.get(t);
    if (!i)
      return {
        valid: !1,
        errors: [`Node type "${t}" not found`]
      };
    if (i.fields)
      for (const [r, a] of Object.entries(i.fields)) {
        if (a.required && !s[r] && n.push(`Field "${r}" is required`), s[r] !== void 0 && a.type) {
          const l = s[r];
          let d = !1;
          a.type === "array" ? Array.isArray(l) || (d = !0) : typeof l !== a.type && (d = !0), d && n.push(
            `Field "${r}" must be of type ${a.type}, got ${Array.isArray(l) ? "array" : typeof l}`
          );
        }
        if (s[r] !== void 0 && a.validate) {
          const l = a.validate(s[r]);
          l && n.push(`Field "${r}": ${l}`);
        }
        if (a.dependsOn) {
          const l = a.dependsOn;
          if (l.field) {
            const d = s[l.field], h = Array.isArray(l.value) ? l.value : [l.value];
            h.includes(d) || s[r] !== void 0 && a.required && n.push(
              `Field "${r}" requires "${l.field}" to be ${h.join(" or ")}`
            );
          }
        }
      }
    const o = this.validators.get(t);
    if (o) {
      const r = o(s, i);
      r.valid || n.push(...r.errors || []);
    }
    return {
      valid: n.length === 0,
      errors: n
    };
  }
  /**
   * Create a new node with full validation
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Node configuration
   * @param {Object} position - Node position {x: number, y: number}
   * @returns {Object} - Created node instance {id, typeId, config, outputs, position}
   * @throws {Error} - If validation fails and strict mode is enabled
   */
  createNode(t, e = {}, s = { x: 0, y: 0 }) {
    const n = this.get(t);
    if (!n) {
      const l = `Cannot create node: type "${t}" not found`;
      if (this.options.strict)
        throw new Error(l);
      return console.warn(l), null;
    }
    const i = this.validate(t, e);
    if (!i.valid) {
      const l = `Node validation failed: ${i.errors.join("; ")}`;
      if (this.options.strict)
        throw new Error(l);
      console.warn(l);
    }
    const o = this._generateNodeId(t);
    let r = { ...n.outputs };
    n.computeOutputs && typeof n.computeOutputs == "function" && (r = n.computeOutputs(e, n.outputs));
    const a = {
      id: o,
      typeId: t,
      config: e,
      outputs: r,
      position: s,
      metadata: {
        createdAt: Date.now(),
        version: n.version || "1.0.0"
      }
    };
    return this.nodeInstances.set(o, a), this.changeListeners.has(o) || this.changeListeners.set(o, /* @__PURE__ */ new Set()), this.options.onNodeCreated && this.options.onNodeCreated(a), a;
  }
  /**
   * Update node configuration with validation and change tracking
   * @param {string} nodeId - Node instance ID
   * @param {Object} newConfig - New configuration values
   * @param {Object} options - Update options
   * @param {boolean} options.validate - Whether to validate before updating (default: true)
   * @param {boolean} options.merge - Whether to merge with existing config (default: true)
   * @param {Function} options.onChange - Callback for config changes
   * @returns {Object} - Updated node instance or null if failed
   */
  updateNodeConfig(t, e, s = {}) {
    const {
      validate: n = !0,
      merge: i = !0,
      onChange: o = null
    } = s, r = this.nodeInstances.get(t);
    if (!r)
      throw new Error(`Node instance "${t}" not found`);
    const a = i ? { ...r.config, ...e } : e;
    if (n) {
      const u = this.validate(r.typeId, a);
      if (!u.valid && this.options.strict)
        throw new Error(`Config update validation failed: ${u.errors.join("; ")}`);
    }
    const l = { ...r.config };
    r.config = a;
    const d = this.get(r.typeId);
    d && d.computeOutputs && (r.outputs = d.computeOutputs(a, d.outputs));
    const h = this._getConfigChanges(l, a);
    o && typeof o == "function" && o({
      nodeId: t,
      oldConfig: l,
      newConfig: a,
      changes: h
    });
    const p = this.changeListeners.get(t);
    return p && p.size > 0 && p.forEach((u) => {
      u({
        nodeId: t,
        oldConfig: l,
        newConfig: a,
        changes: h
      });
    }), r;
  }
  /**
   * Get a node instance by ID
   * @param {string} nodeId - Node instance ID
   * @returns {Object|null} - Node instance or null
   */
  getNodeInstance(t) {
    return this.nodeInstances.get(t) || null;
  }
  /**
   * Register a change listener for a node
   * @param {string} nodeId - Node instance ID
   * @param {Function} callback - Callback function (receives change object)
   * @returns {Function} - Unsubscribe function
   */
  onNodeChange(t, e) {
    this.changeListeners.has(t) || this.changeListeners.set(t, /* @__PURE__ */ new Set());
    const s = this.changeListeners.get(t);
    return s.add(e), () => {
      s.delete(e);
    };
  }
  /**
   * Get field visibility state (considers conditional fields)
   * @param {string} typeId - Node type identifier
   * @param {Object} config - Current node configuration
   * @param {string} fieldName - Field name to check
   * @returns {Object} - Field state {visible: boolean, disabled: boolean}
   */
  getFieldState(t, e, s) {
    const n = this.get(t);
    if (!n || !n.fields || !n.fields[s])
      return { visible: !0, disabled: !1 };
    const i = n.fields[s];
    let o = !0, r = i.disabled || !1;
    if (i.hidden && (o = !1), i.dependsOn && i.dependsOn.field) {
      const a = i.dependsOn, l = e[a.field];
      (Array.isArray(a.value) ? a.value : [a.value]).includes(l) || (o = !1);
    }
    return { visible: o, disabled: r };
  }
  /**
   * Normalize node type definition (add defaults, etc.)
   * @private
   * @param {string} id - Node type ID
   * @param {Object} definition - Raw definition
   * @returns {Object} - Normalized definition
   */
  _normalizeDefinition(t, e) {
    return {
      id: t,
      label: e.label,
      description: e.description || "",
      inputs: e.inputs || {},
      outputs: e.outputs || {},
      fields: e.fields || {},
      version: e.version || "1.0.0",
      icon: e.icon || null,
      category: e.category || "general",
      computeOutputs: e.computeOutputs || null,
      renderOutput: e.renderOutput || null,
      validator: e.validator || null,
      color: e.color || "#3498db",
      ...e
    };
  }
  /**
   * Generate unique node ID
   * @private
   * @param {string} typeId - Node type ID
   * @returns {string} - Generated node ID
   */
  _generateNodeId(t) {
    const e = Date.now(), s = Math.random().toString(36).substr(2, 9);
    return `${t}_${e}_${s}`;
  }
  /**
   * Get differences between old and new config
   * @private
   * @param {Object} oldConfig - Old configuration
   * @param {Object} newConfig - New configuration
   * @returns {Object} - Changes object {added, removed, modified}
   */
  _getConfigChanges(t, e) {
    const s = {}, n = {}, i = {};
    for (const o in e)
      o in t ? this._isEqual(t[o], e[o]) || (i[o] = {
        old: t[o],
        new: e[o]
      }) : s[o] = e[o];
    for (const o in t)
      o in e || (n[o] = t[o]);
    return { added: s, removed: n, modified: i };
  }
  _isEqual(t, e) {
    if (t === e) return !0;
    if (t === null || e === null || typeof t != typeof e) return !1;
    if (typeof t == "object")
      try {
        return JSON.stringify(t) === JSON.stringify(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
class ht {
  constructor(t = {}) {
    this.builders = /* @__PURE__ */ new Map(), this.options = t;
  }
  /**
   * Install extension into DrawflowPlus
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   */
  install(t, e = {}) {
    this.drawflowPlus = t, this.options = { ...this.options, ...e }, t.createUIBuilder = this.createBuilder.bind(this), t.getUIBuilder = this.getBuilder.bind(this);
  }
  /**
   * Create a new UI builder
   * @param {string} name - Builder name
   * @param {Object} config - Builder configuration
   * @returns {UIBuilder} - New UI builder instance
   */
  createBuilder(t, e = {}) {
    const s = new L(t, e);
    return this.builders.set(t, s), s;
  }
  /**
   * Get a UI builder by name
   * @param {string} name - Builder name
   * @returns {UIBuilder} - UI builder instance
   */
  getBuilder(t) {
    return this.builders.get(t);
  }
  /**
   * Get all UI builders
   * @returns {Array} - Array of builder names
   */
  getBuilderNames() {
    return Array.from(this.builders.keys());
  }
}
class L {
  constructor(t, e = {}) {
    this.name = t, this.config = e, this.fields = [];
  }
  /**
   * Add a text field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addTextField(t, e = {}) {
    return this.fields.push({
      type: "text",
      name: t,
      label: e.label || t,
      placeholder: e.placeholder || "",
      required: e.required || !1,
      defaultValue: e.defaultValue || "",
      validation: e.validation || null
    }), this;
  }
  /**
   * Add a number field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addNumberField(t, e = {}) {
    return this.fields.push({
      type: "number",
      name: t,
      label: e.label || t,
      min: e.min || 0,
      max: e.max || null,
      defaultValue: e.defaultValue || 0,
      required: e.required || !1
    }), this;
  }
  /**
   * Add a select/dropdown field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addSelectField(t, e = {}) {
    return this.fields.push({
      type: "select",
      name: t,
      label: e.label || t,
      options: e.options || [],
      defaultValue: e.defaultValue || "",
      required: e.required || !1
    }), this;
  }
  /**
   * Add a checkbox field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addCheckboxField(t, e = {}) {
    return this.fields.push({
      type: "checkbox",
      name: t,
      label: e.label || t,
      defaultValue: e.defaultValue || !1
    }), this;
  }
  /**
   * Add a textarea field to the UI
   * @param {string} name - Field name
   * @param {Object} options - Field options
   * @returns {SettingsUIBuilder} - Returns this for chaining
   */
  addTextareaField(t, e = {}) {
    return this.fields.push({
      type: "textarea",
      name: t,
      label: e.label || t,
      placeholder: e.placeholder || "",
      rows: e.rows || 4,
      defaultValue: e.defaultValue || "",
      required: e.required || !1
    }), this;
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
    let t = `<div class="settings-form" data-builder="${this.name}">`;
    return this.fields.forEach((e) => {
      t += this.renderField(e);
    }), t += "</div>", t;
  }
  /**
   * Render a single field
   * @private
   * @param {Object} field - Field definition
   * @returns {string} - HTML string
   */
  renderField(t) {
    const e = t.required ? "required" : "";
    let s = `<div class="form-group field-${t.type}">`;
    switch (s += `<label for="${t.name}">${t.label}${t.required ? " *" : ""}</label>`, t.type) {
      case "text":
        s += `<input type="text" id="${t.name}" name="${t.name}" `, s += `placeholder="${t.placeholder}" value="${t.defaultValue}" ${e} />`;
        break;
      case "number":
        s += `<input type="number" id="${t.name}" name="${t.name}" `, t.min !== null && (s += `min="${t.min}" `), t.max !== null && (s += `max="${t.max}" `), s += `value="${t.defaultValue}" ${e} />`;
        break;
      case "select":
        s += `<select id="${t.name}" name="${t.name}" ${e}>`, s += '<option value="">-- Select --</option>', t.options.forEach((i) => {
          const o = i.value === t.defaultValue ? "selected" : "";
          s += `<option value="${i.value}" ${o}>${i.label}</option>`;
        }), s += "</select>";
        break;
      case "checkbox":
        const n = t.defaultValue ? "checked" : "";
        s += `<input type="checkbox" id="${t.name}" name="${t.name}" ${n} />`;
        break;
      case "textarea":
        s += `<textarea id="${t.name}" name="${t.name}" `, s += `rows="${t.rows}" placeholder="${t.placeholder}" ${e}>`, s += `${t.defaultValue}</textarea>`;
        break;
      default:
        s += `<input type="text" id="${t.name}" name="${t.name}" />`;
    }
    return s += "</div>", s;
  }
}
class ut {
  /**
   * Create a new ValidationFramework instance
   * @param {Object} options - Framework options
   * @param {boolean} options.stopOnFirstError - Stop validation on first error per field
   * @param {boolean} options.asyncValidation - Enable async validator support
   * @param {Function} options.onError - Global error callback
   */
  constructor(t = {}) {
    this.rules = /* @__PURE__ */ new Map(), this.nodeValidators = /* @__PURE__ */ new Map(), this.options = {
      stopOnFirstError: !1,
      asyncValidation: !0,
      onError: null,
      ...t
    }, this.context = null, this.initDefaultRules();
  }
  /**
   * Install extension into DrawflowPlus instance
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   * @returns {void}
   */
  install(t, e = {}) {
    this.drawflowPlus = t, this.options = { ...this.options, ...e }, t.createValidator = this.createValidator.bind(this), t.registerValidationRule = this.registerRule.bind(this), t.registerNodeValidator = this.registerNodeValidator.bind(this), t.validate = this.validate.bind(this), t.validateField = this.validateField.bind(this);
  }
  /**
   * Initialize default validation rules
   * @private
   * @returns {void}
   */
  initDefaultRules() {
    this.registerRule("required", (t, e = {}) => ({
      valid: !(t == null || t === ""),
      message: e.message || "This field is required"
    })), this.registerRule("email", (t, e = {}) => t ? {
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t),
      message: e.message || "Invalid email address"
    } : { valid: !0 }), this.registerRule("url", (t, e = {}) => {
      if (!t) return { valid: !0 };
      try {
        return new URL(t), { valid: !0 };
      } catch {
        return { valid: !1, message: e.message || "Invalid URL" };
      }
    }), this.registerRule("phoneNumber", (t, e = {}) => t ? {
      valid: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(t),
      message: e.message || "Invalid phone number"
    } : { valid: !0 }), this.registerRule("min", (t, e = {}) => {
      const s = e.value !== void 0 ? e.value : 0, n = parseFloat(t);
      return {
        valid: !isNaN(n) && n >= s,
        message: e.message || `Value must be at least ${s}`
      };
    }), this.registerRule("max", (t, e = {}) => {
      const s = e.value !== void 0 ? e.value : 1 / 0, n = parseFloat(t);
      return {
        valid: !isNaN(n) && n <= s,
        message: e.message || `Value must be at most ${s}`
      };
    }), this.registerRule("range", (t, e = {}) => {
      const s = e.min !== void 0 ? e.min : 0, n = e.max !== void 0 ? e.max : 1 / 0, i = parseFloat(t);
      return {
        valid: !isNaN(i) && i >= s && i <= n,
        message: e.message || `Value must be between ${s} and ${n}`
      };
    }), this.registerRule("minLength", (t, e = {}) => {
      const s = e.value !== void 0 ? e.value : 0;
      return {
        valid: String(t || "").length >= s,
        message: e.message || `Must be at least ${s} characters`
      };
    }), this.registerRule("maxLength", (t, e = {}) => {
      const s = e.value !== void 0 ? e.value : 1 / 0;
      return {
        valid: String(t || "").length <= s,
        message: e.message || `Must be at most ${s} characters`
      };
    }), this.registerRule("pattern", (t, e = {}) => t ? {
      valid: (e.value instanceof RegExp ? e.value : new RegExp(e.value)).test(String(t)),
      message: e.message || "Invalid format"
    } : { valid: !0 }), this.registerRule("numeric", (t, e = {}) => ({
      valid: !isNaN(t) && t !== "",
      message: e.message || "Value must be numeric"
    })), this.registerRule("integer", (t, e = {}) => ({
      valid: Number.isInteger(Number(t)),
      message: e.message || "Value must be an integer"
    })), this.registerRule("custom", (t, e = {}) => {
      if (typeof e.fn != "function")
        throw new Error("Custom rule requires a function in params.fn");
      return e.fn(t, e);
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
  registerRule(t, e) {
    if (typeof e != "function")
      throw new Error("Validation rule must be a function");
    return this.rules.set(t, e), this;
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
  registerNodeValidator(t, e) {
    if (typeof e != "function")
      throw new Error("Node validator must be a function");
    return this.nodeValidators.set(t, e), this;
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
  createValidator(t, e = {}) {
    return new B(t, this.rules, {
      ...this.options,
      ...e
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
  async validate(t, e, s = null) {
    this.context = s;
    const n = this.nodeValidators.get(t);
    if (!n)
      return { valid: !0, errors: [], fieldErrors: {} };
    try {
      const i = await n(e, s);
      return {
        valid: i.valid === !0,
        errors: i.errors || [],
        fieldErrors: i.fieldErrors || {}
      };
    } catch (i) {
      throw this.options.onError && this.options.onError(i, t, e), i;
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
  async validateField(t, e, s = null) {
    this.context = s;
    const i = this.createValidator({
      [t.name]: t.rules
    }).validate({
      [t.name]: e
    });
    return {
      valid: i.valid,
      errors: i.errors[t.name] || []
    };
  }
  /**
   * Get all validation rules for a node type
   * @param {string} nodeTypeId - Node type identifier
   * @returns {Object} - Rules configuration object
   */
  getValidationRules(t) {
    const e = this.nodeValidators.get(t);
    return e ? { nodeTypeId: t, rules: e } : null;
  }
  /**
   * Get a registered rule function
   * @param {string} name - Rule name
   * @returns {Function|undefined} - Rule function or undefined
   */
  getRule(t) {
    return this.rules.get(t);
  }
  /**
   * Get all registered rules
   * @returns {Object} - Object with all rule names as keys
   */
  getAllRules() {
    const t = {};
    return this.rules.forEach((e, s) => {
      t[s] = e;
    }), t;
  }
  /**
   * Clear all custom validators (keeps default rules)
   * @returns {void}
   */
  reset() {
    this.nodeValidators.clear(), this.context = null;
  }
}
class B {
  /**
   * Create a new Validator instance
   * @param {Object} schema - Validation schema
   * @param {Map} rules - Registered validation rules
   * @param {Object} options - Validator options
   */
  constructor(t, e, s = {}) {
    this.schema = t, this.rules = e, this.options = s, this.fieldErrors = {}, this.errors = [];
  }
  /**
   * Validate data against the schema
   * @param {Object} data - Data to validate
   * @returns {Object} - Result {valid, errors, fieldErrors}
   */
  validate(t) {
    this.fieldErrors = {}, this.errors = [];
    for (const e in this.schema)
      if (Object.prototype.hasOwnProperty.call(this.schema, e)) {
        const s = this.schema[e], n = t[e];
        if (this.validateField(e, n, s), this.options.stopOnFirstError && this.fieldErrors[e])
          break;
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
  validateField(t, e, s) {
    const n = Array.isArray(s) ? s : [s];
    for (const i of n) {
      const o = this.executeRule(i, e);
      if (!o.valid && (this.fieldErrors[t] || (this.fieldErrors[t] = []), this.fieldErrors[t].push(o.message), this.errors.push(`${t}: ${o.message}`), this.options.stopOnFirstError))
        break;
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
  executeRule(t, e) {
    if (typeof t == "string") {
      const s = this.rules.get(t);
      if (!s)
        throw new Error(`Unknown validation rule: ${t}`);
      return s(e);
    }
    if (typeof t == "object" && t.name) {
      const s = this.rules.get(t.name);
      if (!s)
        throw new Error(`Unknown validation rule: ${t.name}`);
      return s(e, t);
    }
    throw new Error("Invalid rule format");
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
  getFieldErrors(t) {
    return this.fieldErrors[t] || [];
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
    this.fieldErrors = {}, this.errors = [];
  }
}
class pt {
  /**
   * Create a StateManager instance
   * @param {Object} options - Configuration options
   * @param {string} [options.adapter='vanilla'] - Adapter type ('vanilla' or 'reef')
   * @param {boolean} [options.enableHistory=true] - Enable undo/redo support
   * @param {boolean} [options.trackDirty=true] - Track dirty state
   * @param {number} [options.snapshotSize=50] - Max snapshots to keep
   */
  constructor(t = {}) {
    this.stores = /* @__PURE__ */ new Map(), this.subscriptions = /* @__PURE__ */ new Map(), this.changeLog = [], this.batchMode = !1, this.batchChanges = [], this.options = {
      adapter: "vanilla",
      enableHistory: !0,
      trackDirty: !0,
      snapshotSize: 50,
      ...t
    };
  }
  /**
   * Install extension into DrawflowPlus
   * @param {Object} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   * @returns {void}
   */
  install(t, e = {}) {
    this.drawflowPlus = t, this.options = { ...this.options, ...e }, t.createReactiveState = this.createReactiveState.bind(this), t.getReactiveState = this.getReactiveState.bind(this), t.createStore = this.createStore.bind(this), t.getStore = this.getStore.bind(this);
  }
  /**
   * Create a new reactive state
   * @param {string} name - State name
   * @param {Object} config - Configuration
   * @param {Object} [config.initialState={}] - Initial state
   * @param {string} [config.adapter] - Adapter type override
   * @param {boolean} [config.trackDirty] - Enable dirty tracking override
   * @returns {ReactiveState} - New reactive state instance
   */
  createReactiveState(t, e = {}) {
    const s = new I(t, e, this.options);
    return this.stores.set(t, s), this.subscriptions.set(t, /* @__PURE__ */ new Map()), s;
  }
  /**
   * Get reactive state by name
   * @param {string} name - State name
   * @returns {ReactiveState|undefined} - State instance or undefined
   */
  getReactiveState(t) {
    return this.stores.get(t);
  }
  /**
   * Create a new store (alias for createReactiveState)
   * @param {string} name - Store name
   * @param {Object} initialState - Initial state
   * @returns {ReactiveState} - New store instance
   */
  createStore(t, e = {}) {
    return this.createReactiveState(t, { initialState: e });
  }
  /**
   * Get a store by name (alias for getReactiveState)
   * @param {string} name - Store name
   * @returns {ReactiveState|undefined} - Store instance
   */
  getStore(t) {
    return this.getReactiveState(t);
  }
  /**
   * Subscribe to state changes at a specific path
   * @param {string} storeName - Store name
   * @param {string} path - Path to subscribe to (e.g., 'user.name')
   * @param {Function} callback - Change callback(newValue, oldValue, fullState)
   * @returns {Function} - Unsubscribe function
   */
  subscribe(t, e, s) {
    if (!this.stores.get(t))
      throw new Error(`Store "${t}" not found`);
    const i = `${t}:${e}`;
    return this.subscriptions.has(i) || this.subscriptions.set(i, /* @__PURE__ */ new Set()), this.subscriptions.get(i).add(s), () => {
      this.subscriptions.get(i).delete(s);
    };
  }
  /**
   * Notify subscribers of changes
   * @private
   * @param {string} storeName - Store name
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @param {Object} fullState - Complete state
   * @returns {void}
   */
  notifySubscribers(t, e, s, n, i) {
    const o = `${t}:${e}`, r = this.subscriptions.get(o);
    r && r.forEach((d) => {
      d(s, n, i);
    });
    const a = `${t}:*`, l = this.subscriptions.get(a);
    l && l.forEach((d) => {
      d(s, n, i, e);
    });
  }
  /**
   * Begin batch mutations
   * @returns {void}
   */
  beginBatch() {
    this.batchMode = !0, this.batchChanges = [];
  }
  /**
   * End batch mutations and notify
   * @returns {Array<Object>} - Array of changes
   */
  endBatch() {
    this.batchMode = !1;
    const t = this.batchChanges;
    return this.batchChanges = [], t;
  }
  /**
   * Get change log
   * @returns {Array<Object>} - Array of change records
   */
  getChangeLog() {
    return [...this.changeLog];
  }
  /**
   * Clear change log
   * @returns {void}
   */
  clearChangeLog() {
    this.changeLog = [];
  }
}
class I {
  /**
   * Create a ReactiveState instance
   * @param {string} name - State name
   * @param {Object} config - Configuration
   * @param {Object} globalOptions - Global manager options
   */
  constructor(t, e = {}, s = {}) {
    this.name = t, this.config = {
      initialState: {},
      adapter: s.adapter || "vanilla",
      trackDirty: s.trackDirty !== !1,
      ...e
    }, this._state = structuredClone(this.config.initialState), this._baseline = structuredClone(this._state), this._snapshots = [], this._subscriptions = /* @__PURE__ */ new Map(), this._mutations = [], this._dirty = /* @__PURE__ */ new Map(), this._initializeDirtyTracking();
  }
  /**
   * Initialize dirty state tracking
   * @private
   * @returns {void}
   */
  _initializeDirtyTracking() {
    this.config.trackDirty && this._markClean();
  }
  /**
   * Mark all paths as clean
   * @private
   * @returns {void}
   */
  _markClean() {
    this._dirty.clear();
  }
  /**
   * Mark a path as dirty
   * @private
   * @param {string} path - Path to mark
   * @returns {void}
   */
  _markDirty(t) {
    this.config.trackDirty && this._dirty.set(t, !0);
  }
  /**
   * Get value at path
   * @param {string} [path] - Path to retrieve (dot-notation)
   * @returns {*} - Value at path or entire state
   */
  get(t) {
    if (!t)
      return structuredClone(this._state);
    const e = t.split(".");
    let s = this._state;
    for (const n of e)
      if (s && typeof s == "object" && n in s)
        s = s[n];
      else
        return;
    return s;
  }
  /**
   * Set value at path
   * @param {string} path - Path to set (dot-notation)
   * @param {*} value - New value
   * @returns {void}
   */
  set(t, e) {
    const s = this.get(t);
    if (Object.is(s, e))
      return;
    const n = t.split("."), i = n.pop();
    let o = this._state;
    for (const r of n)
      (!(r in o) || typeof o[r] != "object" || o[r] === null) && (o[r] = {}), o = o[r];
    o[i] = e, this._markDirty(t), this._notifySubscribers(t, e, s), this._mutations.push({
      path: t,
      oldValue: s,
      newValue: e,
      timestamp: Date.now()
    });
  }
  /**
   * Mutate state with callback
   * @param {string} path - Path to mutate
   * @param {Function} fn - Mutation function(currentValue) => newValue
   * @returns {void}
   */
  mutate(t, e) {
    const s = this.get(t), n = e(s);
    this.set(t, n);
  }
  /**
   * Batch multiple mutations
   * @param {Function} fn - Function to run mutations
   * @returns {void}
   */
  batch(t) {
    const e = this._mutations.length;
    t(this), this._mutations.length > e && this._mutations.slice(e);
  }
  /**
   * Subscribe to changes at a path
   * @param {string} path - Path to watch (supports '*' wildcard)
   * @param {Function} callback - Change callback
   * @returns {Function} - Unsubscribe function
   */
  subscribe(t, e) {
    return this._subscriptions.has(t) || this._subscriptions.set(t, /* @__PURE__ */ new Set()), this._subscriptions.get(t).add(e), () => {
      const s = this._subscriptions.get(t);
      s && (s.delete(e), s.size === 0 && this._subscriptions.delete(t));
    };
  }
  /**
   * Notify subscribers of change
   * @private
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @returns {void}
   */
  _notifySubscribers(t, e, s) {
    const n = this._subscriptions.get(t);
    n && n.forEach((o) => o(e, s));
    const i = this._subscriptions.get("*");
    i && i.forEach((o) => o({ path: t, newValue: e, oldValue: s }));
  }
  /**
   * Create immutable snapshot
   * @returns {Object} - Snapshot of current state
   */
  snapshot() {
    const t = {
      name: this.name,
      state: structuredClone(this._state),
      timestamp: Date.now()
    };
    return this._snapshots.push(t), this._snapshots.length > 100 && this._snapshots.shift(), t;
  }
  /**
   * Restore from snapshot
   * @param {Object} snapshot - Snapshot to restore
   * @returns {Object} - Previous state
   */
  restore(t) {
    const e = structuredClone(this._state);
    return this._state = structuredClone(t.state), this._markDirty("*"), e;
  }
  /**
   * Get all snapshots
   * @returns {Array<Object>} - Array of snapshots
   */
  getSnapshots() {
    return [...this._snapshots];
  }
  /**
   * Check if state is dirty
   * @param {string} [path] - Specific path to check
   * @returns {boolean} - True if dirty
   */
  isDirty(t) {
    return this.config.trackDirty ? t ? this._dirty.has(t) : this._dirty.size > 0 : !1;
  }
  /**
   * Get dirty paths
   * @returns {Array<string>} - Array of dirty paths
   */
  getDirtyPaths() {
    return Array.from(this._dirty.keys());
  }
  /**
   * Reset dirty state
   * @param {string} [path] - Specific path to reset
   * @returns {void}
   */
  resetDirty(t) {
    t ? this._dirty.delete(t) : this._markClean();
  }
  /**
   * Get mutation history
   * @returns {Array<Object>} - Array of mutations
   */
  getMutations() {
    return [...this._mutations];
  }
  /**
   * Clear mutation history
   * @returns {void}
   */
  clearMutations() {
    this._mutations = [];
  }
  /**
   * Update multiple values
   * @param {Object} updates - Updates object
   * @returns {void}
   */
  update(t) {
    Object.entries(t).forEach(([e, s]) => {
      this.set(e, s);
    });
  }
  /**
   * Get complete state
   * @returns {Object} - Full state copy
   */
  getState() {
    return structuredClone(this._state);
  }
  /**
   * Replace entire state
   * @param {Object} newState - New state
   * @returns {void}
   */
  setState(t) {
    this._state = structuredClone(t), this._markDirty("*");
  }
  /**
   * Clear all state
   * @returns {void}
   */
  clear() {
    this._state = {}, this._markDirty("*");
  }
  /**
   * Check if path exists
   * @param {string} path - Path to check
   * @returns {boolean} - True if exists
   */
  has(t) {
    return this.get(t) !== void 0;
  }
}
class ft {
  constructor(t = {}) {
    this.connections = /* @__PURE__ */ new Map(), this.styles = /* @__PURE__ */ new Map(), this.metadata = /* @__PURE__ */ new Map(), this.connectionStatus = /* @__PURE__ */ new Map(), this.validators = /* @__PURE__ */ new Map(), this.options = t, this.domElements = /* @__PURE__ */ new Map(), this._initializeDefaultStyles();
  }
  /**
   * Initialize default status-based styles
   * @private
   */
  _initializeDefaultStyles() {
    const t = {
      primary: "#3498db",
      success: "#2ecc71",
      danger: "#e74c3c",
      warning: "#f39c12"
    };
    this.defineStyle("primary", {
      stroke: t.primary,
      strokeWidth: 2,
      strokeDasharray: "none",
      color: t.primary,
      label: null
    }), this.defineStyle("success", {
      stroke: t.success,
      strokeWidth: 2,
      strokeDasharray: "none",
      color: t.success,
      label: null
    }), this.defineStyle("danger", {
      stroke: t.danger,
      strokeWidth: 2,
      strokeDasharray: "none",
      color: t.danger,
      label: null
    }), this.defineStyle("warning", {
      stroke: t.warning,
      strokeWidth: 2,
      strokeDasharray: "5,5",
      color: t.warning,
      label: null
    }), this.defineStyle("dashed", {
      stroke: "#95a5a6",
      strokeWidth: 2,
      strokeDasharray: "5,5",
      color: "#95a5a6",
      label: null
    }), this.defineStyle("dotted", {
      stroke: "#95a5a6",
      strokeWidth: 2,
      strokeDasharray: "2,2",
      color: "#95a5a6",
      label: null
    });
  }
  /**
   * Install extension into DrawflowPlus
   * @param {DrawflowPlus} drawflowPlus - DrawflowPlus instance
   * @param {Object} options - Extension options
   */
  install(t, e = {}) {
    this.drawflowPlus = t, this.options = { ...this.options, ...e }, t.addConnection = this.addConnection.bind(this), t.removeConnection = this.removeConnection.bind(this), t.getConnection = this.getConnection.bind(this), t.getConnectionsMeta = this.getConnectionsMeta.bind(this), t.styleConnection = this.styleConnection.bind(this), t.refreshConnectionStyles = this.refreshConnectionStyles.bind(this), t.paintConnections = this.paintConnections.bind(this), t.setConnectionStatus = this.setConnectionStatus.bind(this), t.defineConnectionStyle = this.defineStyle.bind(this), t.getConnectionStyle = this.getStyle.bind(this), t.setConnectionMetadata = this.setMetadata.bind(this), t.getConnectionMetadata = this.getMetadata.bind(this), t.createBuilder = this.createBuilder.bind(this);
  }
  /**
   * Add a new connection with metadata
   * @param {string|number} fromId - Source node ID
   * @param {string} fromOut - Output socket name
   * @param {string|number} toId - Target node ID
   * @param {string} toIn - Input socket name
   * @param {Object} metadata - Connection metadata
   * @returns {Object} - Connection object with ID
   * @throws {Error} If parameters are invalid
   */
  addConnection(t, e, s, n, i = {}) {
    if (!t || !e || !s || !n)
      throw new Error("Connection requires fromId, fromOut, toId, and toIn");
    const o = `${t}_${e}_${s}_${n}`, r = {
      id: o,
      fromId: t,
      fromOut: e,
      toId: s,
      toIn: n,
      metadata: this._validateMetadata(i),
      status: "primary",
      style: "primary",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.connections.set(o, r), this.metadata.set(o, r.metadata), this.connectionStatus.set(o, "primary"), r;
  }
  /**
   * Remove a connection by ID
   * @param {string} connectionId - Connection ID to remove
   * @returns {boolean} - True if connection was removed
   */
  removeConnection(t) {
    return this.connections.has(t) ? (this.connections.delete(t), this.metadata.delete(t), this.connectionStatus.delete(t), this.domElements.delete(t), !0) : !1;
  }
  /**
   * Retrieve a connection by ID
   * @param {string} connectionId - Connection ID
   * @returns {Object|null} - Connection object or null if not found
   */
  getConnection(t) {
    return this.connections.get(t) || null;
  }
  /**
   * Get all connections matching a predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} - Array of matching connections
   */
  getConnectionsMeta(t = () => !0) {
    const e = [];
    for (const s of this.connections.values())
      t(s) && e.push({
        ...s,
        metadata: this.metadata.get(s.id)
      });
    return e;
  }
  /**
   * Apply style to a connection
   * @param {string} connectionId - Connection ID
   * @param {string|Object} style - Style name or custom style object
   * @returns {boolean} - True if successful
   */
  styleConnection(t, e) {
    const s = this.connections.get(t);
    if (!s)
      return !1;
    if (typeof e == "string") {
      const n = this.styles.get(e);
      if (!n)
        throw new Error(`Style "${e}" not found`);
      s.style = e, s.styleConfig = n;
    } else typeof e == "object" && (s.styleConfig = e);
    return this._applyDOMStyle(t, s.styleConfig), !0;
  }
  /**
   * Set connection status with corresponding styling
   * @param {string} connectionId - Connection ID
   * @param {string} status - Status: 'primary', 'success', 'danger', 'warning'
   * @returns {boolean} - True if successful
   * @throws {Error} If status is invalid
   */
  setConnectionStatus(t, e) {
    const s = ["primary", "success", "danger", "warning"];
    if (!s.includes(e))
      throw new Error(`Invalid status: ${e}. Must be one of: ${s.join(", ")}`);
    const n = this.connections.get(t);
    return n ? (n.status = e, this.connectionStatus.set(t, e), this.styleConnection(t, e), !0) : !1;
  }
  /**
   * Refresh all connection styles from current configuration
   * @returns {number} - Number of connections refreshed
   */
  refreshConnectionStyles() {
    let t = 0;
    for (const [e, s] of this.connections.entries())
      s.style && (this.styleConnection(e, s.style), t++);
    return t;
  }
  /**
   * Paint multiple connections with style based on predicate
   * @param {Function} predicate - Filter function to select connections
   * @param {string|Object} style - Style to apply
   * @returns {number} - Number of connections painted
   */
  paintConnections(t, e) {
    let s = 0;
    for (const [n, i] of this.connections.entries())
      t(i) && this.styleConnection(n, e) && s++;
    return s;
  }
  /**
   * Define a reusable connection style
   * @param {string} name - Style name
   * @param {Object} styleConfig - Style configuration with stroke, strokeWidth, strokeDasharray, color, label
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If config is invalid
   */
  defineStyle(t, e) {
    if (typeof e != "object")
      throw new Error("Style config must be an object");
    return this.styles.set(t, {
      stroke: e.stroke || e.strokeColor || "#000",
      strokeWidth: e.strokeWidth || 2,
      strokeDasharray: e.strokeDasharray || "none",
      color: e.color || e.strokeColor || "#000",
      label: e.label || null
    }), this;
  }
  /**
   * Get a defined style by name
   * @param {string} name - Style name
   * @returns {Object|null} - Style configuration or null if not found
   */
  getStyle(t) {
    return this.styles.get(t) || null;
  }
  /**
   * Get all defined style names
   * @returns {Array} - Array of style names
   */
  getStyleNames() {
    return Array.from(this.styles.keys());
  }
  /**
   * Set metadata for a connection
   * @param {string|number} connectionId - Connection ID
   * @param {Object} meta - Metadata object
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If metadata is invalid
   */
  setMetadata(t, e) {
    if (!this.connections.has(t))
      throw new Error(`Connection "${t}" not found`);
    const s = this._validateMetadata(e);
    this.metadata.set(t, s);
    const n = this.connections.get(t);
    return n && (n.metadata = s), this;
  }
  /**
   * Get metadata for a connection
   * @param {string|number} connectionId - Connection ID
   * @returns {Object|null} - Metadata object or null if not found
   */
  getMetadata(t) {
    return this.metadata.get(t) || null;
  }
  /**
   * Get all metadata with optional filter
   * @param {Function} filter - Optional filter function
   * @returns {Array} - Array of metadata objects
   */
  getAllMetadata(t = null) {
    const e = Array.from(this.metadata.values());
    return t ? e.filter(t) : e;
  }
  /**
   * Register a connection validator
   * @param {string} type - Connection type
   * @param {Function} validator - Validator function
   * @returns {ConnectionManager} - Returns this for chaining
   * @throws {Error} If validator is not a function
   */
  registerValidator(t, e) {
    if (typeof e != "function")
      throw new Error("Validator must be a function");
    return this.validators.set(t, e), this;
  }
  /**
   * Validate a connection
   * @param {string} type - Connection type
   * @param {Object} connection - Connection object
   * @returns {Object} - Validation result with valid flag and errors array
   */
  validateConnection(t, e) {
    const s = this.validators.get(t);
    if (!s)
      return { valid: !0, errors: [] };
    try {
      return s(e);
    } catch (n) {
      return { valid: !1, errors: [n.message] };
    }
  }
  /**
   * Create a connection builder for fluent API
   * @param {string|number} fromNodeId - Source node ID
   * @param {string} fromOutput - Output key
   * @returns {ConnectionBuilder} - Connection builder instance
   */
  createBuilder(t, e) {
    return new j(t, e, this);
  }
  /**
   * Validate connection metadata against schema
   * @private
   * @param {Object} meta - Metadata to validate
   * @returns {Object} - Validated metadata
   */
  _validateMetadata(t) {
    const e = t || {};
    return {
      type: e.type || "default",
      label: e.label || "",
      description: e.description || "",
      dataType: e.dataType || "any",
      required: e.required || !1,
      custom: e.custom || {},
      tags: e.tags || []
    };
  }
  /**
   * Apply DOM styles to a connection element
   * @private
   * @param {string} connectionId - Connection ID
   * @param {Object} styleConfig - Style configuration
   */
  _applyDOMStyle(t, e) {
    if (!e) return;
    if (!this.domElements.get(t) && typeof document < "u") {
      const i = document.querySelector(`[data-connection-id="${t}"]`);
      i && this.domElements.set(t, i);
    }
    const n = this.domElements.get(t);
    n && (e.stroke && (n.style.stroke = e.stroke), e.strokeWidth && (n.style.strokeWidth = e.strokeWidth), e.strokeDasharray && e.strokeDasharray !== "none" && (n.style.strokeDasharray = e.strokeDasharray), e.label && n.setAttribute("data-label", e.label));
  }
}
class j {
  /**
   * Create a new connection builder
   * @param {string|number} fromNodeId - Source node ID
   * @param {string} fromOutput - Output key
   * @param {ConnectionManager} manager - Parent manager instance
   */
  constructor(t, e, s = null) {
    this.manager = s, this.connection = {
      fromNodeId: t,
      fromOutput: e,
      toNodeId: null,
      toInput: null,
      style: "primary",
      metadata: {}
    };
  }
  /**
   * Set target node and input
   * @param {string|number} nodeId - Target node ID
   * @param {string} input - Input key
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  to(t, e) {
    return this.connection.toNodeId = t, this.connection.toInput = e, this;
  }
  /**
   * Set connection style
   * @param {string} styleName - Style name
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withStyle(t) {
    return this.connection.style = t, this;
  }
  /**
   * Set connection type
   * @param {string} type - Connection type
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  ofType(t) {
    return this.connection.metadata.type = t, this;
  }
  /**
   * Set connection label
   * @param {string} label - Label text
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withLabel(t) {
    return this.connection.metadata.label = t, this;
  }
  /**
   * Set data type for the connection
   * @param {string} dataType - Data type (string, number, boolean, object, etc.)
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withDataType(t) {
    return this.connection.metadata.dataType = t, this;
  }
  /**
   * Mark connection as required
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  required() {
    return this.connection.metadata.required = !0, this;
  }
  /**
   * Set connection status
   * @param {string} status - Status: 'primary', 'success', 'danger', 'warning'
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withStatus(t) {
    return this.connection.status = t, this;
  }
  /**
   * Add custom metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withMetadata(t, e) {
    return this.connection.metadata[t] = e, this;
  }
  /**
   * Add tags to the connection
   * @param {...string} tags - Tag values
   * @returns {ConnectionBuilder} - Returns this for chaining
   */
  withTags(...t) {
    return this.connection.metadata.tags = t, this;
  }
  /**
   * Build the connection
   * @returns {Object} - Connection object
   * @throws {Error} If target node and input are not set
   */
  build() {
    if (!this.connection.toNodeId || !this.connection.toInput)
      throw new Error("Target node and input are required. Use .to(nodeId, inputKey)");
    return this.connection;
  }
}
function W() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function b(c) {
  if (c === null || typeof c != "object")
    return c;
  if (c instanceof Date)
    return new Date(c.getTime());
  if (c instanceof Array)
    return c.map((t) => b(t));
  if (c instanceof Object) {
    const t = {};
    for (const e in c)
      Object.prototype.hasOwnProperty.call(c, e) && (t[e] = b(c[e]));
    return t;
  }
}
function T(c, t) {
  const e = b(c);
  for (const s in t)
    Object.prototype.hasOwnProperty.call(t, s) && (t[s] && typeof t[s] == "object" && !Array.isArray(t[s]) ? e[s] = T(e[s] || {}, t[s]) : e[s] = t[s]);
  return e;
}
function Y(c) {
  return c == null ? !0 : typeof c == "string" ? c.trim().length === 0 : Array.isArray(c) ? c.length === 0 : typeof c == "object" ? Object.keys(c).length === 0 : !1;
}
function X(c, t) {
  let e;
  return function(...n) {
    clearTimeout(e), e = setTimeout(() => {
      c.apply(this, n);
    }, t);
  };
}
function U(c, t) {
  let e = 0;
  return function(...n) {
    const i = Date.now();
    i - e >= t && (c.apply(this, n), e = i);
  };
}
function q(c) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}
function K(c) {
  try {
    return new URL(c), !0;
  } catch {
    return !1;
  }
}
const _t = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  debounce: X,
  deepClone: b,
  deepMerge: T,
  generateId: W,
  isEmpty: Y,
  isValidEmail: q,
  isValidUrl: K,
  throttle: U
}, Symbol.toStringTag, { value: "Module" })), H = {
  zoomMin: 0.1,
  zoomMax: 2.5,
  zoomStep: 0.1,
  fitPadding: 80,
  enableGrid: !0,
  gridSize: 16
}, G = `
.dfp-canvas-grid {
  background-image: radial-gradient(circle, #c8c8c8 1px, transparent 1px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}
`;
class mt {
  constructor(t = {}) {
    this._subscribers = /* @__PURE__ */ new Set(), this._styleEl = null, this.options = { ...H, ...t };
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e };
    const s = t.drawflow;
    if (s && (s.zoom_min = this.options.zoomMin, s.zoom_max = this.options.zoomMax, typeof s.on == "function" && (s.on("translate", () => this._applyTransform("translate")), s.on("zoom", () => this._applyTransform("zoom")))), this.options.enableGrid) {
      this._injectGridStyles();
      const n = this._getWrapper();
      n && n.classList.add("dfp-canvas-grid");
    }
    t.fitToScreen = () => this.fitToScreen(), t.fitToNodes = (n) => this.fitToNodes(n), t.zoomIn = () => this.zoomIn(), t.zoomOut = () => this.zoomOut(), t.zoomTo = (n) => this.zoomTo(n), t.zoomAtPoint = (n, i, o) => this.zoomAtPoint(n, i, o), t.panTo = (n, i) => this.panTo(n, i), t.centerCanvas = () => this.centerCanvas(), t.getViewport = () => this.getViewport(), t.setViewport = (n) => this.setViewport(n), t.onViewportChange = (n) => this.onViewportChange(n);
  }
  fitToScreen() {
    const t = this._computeNodeBounds(null), e = this.dfp.drawflow;
    if (!e) return;
    if (!t) {
      e.zoom = 1, e.canvas_x = 0, e.canvas_y = 0, this._applyTransform("fit");
      return;
    }
    const { width: s, height: n } = this._getViewportSize(), i = this.options.fitPadding, o = t.maxX - t.minX || 1, r = t.maxY - t.minY || 1, a = (s - i * 2) / o, l = (n - i * 2) / r, d = Math.min(a, l, this.options.zoomMax), h = Math.max(d, this.options.zoomMin);
    e.zoom = h, e.canvas_x = s / 2 - (t.minX + o / 2) * h, e.canvas_y = n / 2 - (t.minY + r / 2) * h, this._applyTransform("fit");
  }
  fitToNodes(t) {
    const e = this._computeNodeBounds(t), s = this.dfp.drawflow;
    if (!s || !e) return;
    const { width: n, height: i } = this._getViewportSize(), o = this.options.fitPadding, r = e.maxX - e.minX || 1, a = e.maxY - e.minY || 1, l = (n - o * 2) / r, d = (i - o * 2) / a, h = Math.min(l, d, this.options.zoomMax);
    s.zoom = Math.max(h, this.options.zoomMin), s.canvas_x = n / 2 - (e.minX + r / 2) * s.zoom, s.canvas_y = i / 2 - (e.minY + a / 2) * s.zoom, this._applyTransform("fitNodes");
  }
  zoomIn() {
    const t = this.dfp.drawflow;
    t && this.zoomTo(t.zoom + this.options.zoomStep);
  }
  zoomOut() {
    const t = this.dfp.drawflow;
    t && this.zoomTo(t.zoom - this.options.zoomStep);
  }
  zoomTo(t) {
    const e = this.dfp.drawflow;
    e && (e.zoom = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, t)), this._applyTransform("zoom"));
  }
  zoomAtPoint(t, e, s) {
    const n = this.dfp.drawflow;
    if (!n) return;
    const i = n.zoom, o = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, t)), r = (e - n.canvas_x) / i, a = (s - n.canvas_y) / i;
    n.zoom = o, n.canvas_x = e - r * o, n.canvas_y = s - a * o, this._applyTransform("zoomAtPoint");
  }
  panTo(t, e) {
    const s = this.dfp.drawflow;
    if (!s) return;
    const { width: n, height: i } = this._getViewportSize();
    s.canvas_x = n / 2 - t * s.zoom, s.canvas_y = i / 2 - e * s.zoom, this._applyTransform("pan");
  }
  centerCanvas() {
    const t = this.dfp.drawflow;
    t && (t.canvas_x = 0, t.canvas_y = 0, this._applyTransform("center"));
  }
  getViewport() {
    const t = this.dfp.drawflow;
    return t ? { zoom: t.zoom || 1, x: t.canvas_x || 0, y: t.canvas_y || 0 } : { zoom: 1, x: 0, y: 0 };
  }
  setViewport({ zoom: t, x: e, y: s }) {
    const n = this.dfp.drawflow;
    n && (t !== void 0 && (n.zoom = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, t))), e !== void 0 && (n.canvas_x = e), s !== void 0 && (n.canvas_y = s), this._applyTransform("restore"));
  }
  onViewportChange(t) {
    return this._subscribers.add(t), () => this._subscribers.delete(t);
  }
  // --- private ---
  _applyTransform(t) {
    const e = this.dfp.drawflow;
    if (!e || !e.precanvas) return;
    const s = e.zoom || 1, n = e.canvas_x || 0, i = e.canvas_y || 0;
    e.precanvas.style.transformOrigin = "0 0", e.precanvas.style.transform = `translate(${n}px, ${i}px) scale(${s})`, this.options.enableGrid && this._updateGridCSS(n, i, s);
    const o = { reason: t, zoom: s, x: n, y: i };
    this._subscribers.forEach((r) => r(o));
  }
  _updateGridCSS(t, e, s) {
    const n = this._getWrapper();
    if (!n) return;
    const i = this.options.gridSize * Math.max(0.45, Math.min(s, 2.4)), o = (t % i + i) % i, r = (e % i + i) % i;
    n.style.setProperty("--dfp-grid-step", `${i.toFixed(2)}px`), n.style.setProperty("--dfp-grid-offset-x", `${o.toFixed(2)}px`), n.style.setProperty("--dfp-grid-offset-y", `${r.toFixed(2)}px`);
  }
  _getWrapper() {
    const t = this.dfp.drawflow;
    return t && t.precanvas ? t.precanvas.parentElement : null;
  }
  _getViewportSize() {
    const t = this._getWrapper();
    if (t) {
      const e = t.getBoundingClientRect();
      return {
        width: e.width || t.offsetWidth || 800,
        height: e.height || t.offsetHeight || 600
      };
    }
    return { width: 800, height: 600 };
  }
  _computeNodeBounds(t) {
    if (!this.dfp.drawflow) return null;
    const s = this._getNodes(), n = Object.entries(s);
    if (!n.length) return null;
    let i = 1 / 0, o = 1 / 0, r = -1 / 0, a = -1 / 0;
    for (const [l, d] of n) {
      if (t && !t.includes(l) && !t.includes(Number(l))) continue;
      const h = d.pos_x || 0, p = d.pos_y || 0;
      let u = 240, f = 140;
      if (typeof document < "u") {
        const _ = document.getElementById(`node-${l}`);
        _ && (u = _.offsetWidth || u, f = _.offsetHeight || f);
      }
      i = Math.min(i, h), o = Math.min(o, p), r = Math.max(r, h + u), a = Math.max(a, p + f);
    }
    return isFinite(i) ? { minX: i, minY: o, maxX: r, maxY: a } : null;
  }
  _getNodes() {
    try {
      const t = this.dfp.drawflow, e = t.module || "Home";
      return t.drawflow.drawflow[e].data || {};
    } catch {
      return {};
    }
  }
  _injectGridStyles() {
    typeof document > "u" || this._styleEl || (this._styleEl = document.createElement("style"), this._styleEl.textContent = G, document.head.appendChild(this._styleEl));
  }
}
const Z = {
  strict: !0,
  onViolation: null
};
class gt {
  constructor(t = {}) {
    this._outputMaxByType = /* @__PURE__ */ new Map(), this._inputMaxByType = /* @__PURE__ */ new Map(), this._outputMaxByNode = /* @__PURE__ */ new Map(), this._inputMaxByNode = /* @__PURE__ */ new Map(), this._typeRules = /* @__PURE__ */ new Map(), this._canConnectFns = [], this._violations = [], this.options = { ...Z, ...t };
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, t.setOutputMaxConnections = (s, n, i) => this.setOutputMaxConnections(s, n, i), t.setInputMaxConnections = (s, n, i) => this.setInputMaxConnections(s, n, i), t.setOutputMaxConnectionsForNode = (s, n, i) => this.setOutputMaxConnectionsForNode(s, n, i), t.setInputMaxConnectionsForNode = (s, n, i) => this.setInputMaxConnectionsForNode(s, n, i), t.addTypeRule = (s, n, i) => this.addTypeRule(s, n, i), t.setTypeMatrix = (s) => this.setTypeMatrix(s), t.setCanConnect = (s) => this.setCanConnect(s), t.clearConnectionRules = () => this.clearRules(), t.canConnect = (s, n, i, o) => this.canConnect(s, n, i, o), t.validateFlow = () => this.validateFlow(), t.getConnectionViolations = () => this.getViolations(), this._hookDrawflow();
  }
  setOutputMaxConnections(t, e, s) {
    const n = e ? `${t}::${e}` : t;
    return this._outputMaxByType.set(n, s), this;
  }
  setInputMaxConnections(t, e, s) {
    const n = e ? `${t}::${e}` : t;
    return this._inputMaxByType.set(n, s), this;
  }
  setOutputMaxConnectionsForNode(t, e, s) {
    const n = `${t}::${e}`;
    return this._outputMaxByNode.set(n, s), this;
  }
  setInputMaxConnectionsForNode(t, e, s) {
    const n = `${t}::${e}`;
    return this._inputMaxByNode.set(n, s), this;
  }
  addTypeRule(t, e, s) {
    return this._typeRules.set(`${t}->${e}`, s), this;
  }
  setTypeMatrix(t) {
    for (const [e, s] of Object.entries(t)) {
      const n = s.allowOutputTo || [];
      this.addTypeRule(e, "*", !1);
      for (const i of n)
        this.addTypeRule(e, i, !0);
    }
    return this;
  }
  setCanConnect(t) {
    return this._canConnectFns.push(t), this;
  }
  clearRules() {
    return this._outputMaxByType.clear(), this._inputMaxByType.clear(), this._outputMaxByNode.clear(), this._inputMaxByNode.clear(), this._typeRules.clear(), this._canConnectFns = [], this;
  }
  canConnect(t, e, s, n) {
    const i = this._checkOutputMax(t, e);
    if (!i.allowed) return i;
    const o = this._checkInputMax(s, n);
    if (!o.allowed) return o;
    const r = this._checkTypeRule(t, s);
    if (!r.allowed) return r;
    for (const a of this._canConnectFns) {
      const l = { nodeId: t, portKey: e, nodeType: this._getNodeType(t) }, d = { nodeId: s, portKey: n, nodeType: this._getNodeType(s) }, h = a(l, d);
      if (h === !1) return { allowed: !1, reason: "Connection denied by rule" };
      if (typeof h == "string") return { allowed: !1, reason: h };
      if (h && h.allowed === !1) return { allowed: !1, reason: h.reason || "Connection denied" };
    }
    return { allowed: !0, reason: null };
  }
  validateFlow() {
    const t = this._getNodes(), e = [];
    for (const [s, n] of Object.entries(t)) {
      const i = n.outputs || {};
      for (const [o, r] of Object.entries(i)) {
        const a = r.connections || [], l = this._resolveOutputMax(s, o);
        l !== null && a.length > l && e.push({
          nodeId: s,
          port: o,
          type: "outputMax",
          count: a.length,
          max: l
        });
      }
    }
    return this._violations = e, e;
  }
  getViolations() {
    return [...this._violations];
  }
  // --- private ---
  _hookDrawflow() {
    const t = this.dfp.drawflow;
    !t || typeof t.on != "function" || t.on("connectionCreated", (e) => {
      const s = this.canConnect(
        e.output_id,
        e.output_class,
        e.input_id,
        e.input_class
      );
      if (!s.allowed && this.options.strict) {
        this._removeConnection(e);
        const n = { ...e, reason: s.reason };
        this._violations.push(n), typeof this.options.onViolation == "function" && this.options.onViolation(n);
      }
    });
  }
  _removeConnection(t) {
    const e = this.dfp.drawflow;
    if (e)
      try {
        if (typeof e.removeSingleConnection == "function")
          e.removeSingleConnection(t.output_id, t.input_id, t.output_class, t.input_class);
        else if (typeof document < "u") {
          const s = document.querySelectorAll(".connection");
          for (const n of s)
            if (n.classList.contains(`node_in_node-${t.input_id}`) && n.classList.contains(`node_out_node-${t.output_id}`) && n.classList.contains(t.output_class)) {
              n.remove();
              break;
            }
          this._removeFromData(t.output_id, t.output_class, t.input_id, t.input_class);
        }
      } catch {
      }
  }
  _removeFromData(t, e, s, n) {
    try {
      const i = this._getNodes(), o = i[t];
      o && o.outputs && o.outputs[e] && (o.outputs[e].connections = o.outputs[e].connections.filter(
        (a) => !(String(a.node) === String(s) && a.output === n)
      ));
      const r = i[s];
      r && r.inputs && r.inputs[n] && (r.inputs[n].connections = r.inputs[n].connections.filter(
        (a) => !(String(a.node) === String(t) && a.input === e)
      ));
    } catch {
    }
  }
  _checkOutputMax(t, e) {
    const s = this._resolveOutputMax(t, e);
    if (s === null) return { allowed: !0, reason: null };
    const n = this._countOutputConnections(t, e);
    return n >= s ? {
      allowed: !1,
      reason: `Output "${e}" on node ${t} already has ${n}/${s} connections`
    } : { allowed: !0, reason: null };
  }
  _checkInputMax(t, e) {
    const s = this._resolveInputMax(t, e);
    if (s === null) return { allowed: !0, reason: null };
    const n = this._countInputConnections(t, e);
    return n >= s ? {
      allowed: !1,
      reason: `Input "${e}" on node ${t} already has ${n}/${s} connections`
    } : { allowed: !0, reason: null };
  }
  _resolveOutputMax(t, e) {
    const s = `${t}::${e}`;
    if (this._outputMaxByNode.has(s)) return this._outputMaxByNode.get(s);
    const n = this._getNodeType(t);
    if (n) {
      const i = `${n}::${e}`;
      if (this._outputMaxByType.has(i)) return this._outputMaxByType.get(i);
      if (this._outputMaxByType.has(n)) return this._outputMaxByType.get(n);
    }
    return null;
  }
  _resolveInputMax(t, e) {
    const s = `${t}::${e}`;
    if (this._inputMaxByNode.has(s)) return this._inputMaxByNode.get(s);
    const n = this._getNodeType(t);
    if (n) {
      const i = `${n}::${e}`;
      if (this._inputMaxByType.has(i)) return this._inputMaxByType.get(i);
      if (this._inputMaxByType.has(n)) return this._inputMaxByType.get(n);
    }
    return null;
  }
  _checkTypeRule(t, e) {
    const s = this._getNodeType(t), n = this._getNodeType(e);
    if (!s || !n) return { allowed: !0, reason: null };
    const i = this._typeRules.get(`${s}->${n}`);
    if (i !== void 0)
      return i ? { allowed: !0, reason: null } : { allowed: !1, reason: `Connections from "${s}" to "${n}" are not allowed` };
    const o = this._typeRules.get(`${s}->*`);
    return o !== void 0 ? o ? { allowed: !0, reason: null } : { allowed: !1, reason: `Connections from "${s}" to "${n}" are not allowed` } : { allowed: !0, reason: null };
  }
  _countOutputConnections(t, e) {
    try {
      const s = this._getNodes(), n = s[t] || s[String(t)];
      return n && n.outputs && n.outputs[e] ? (n.outputs[e].connections || []).length : 0;
    } catch {
      return 0;
    }
  }
  _countInputConnections(t, e) {
    try {
      const s = this._getNodes(), n = s[t] || s[String(t)];
      return n && n.inputs && n.inputs[e] ? (n.inputs[e].connections || []).length : 0;
    } catch {
      return 0;
    }
  }
  _getNodeType(t) {
    const e = this.dfp.getExtension("nodeTypes");
    if (e && typeof e.getNodeInstance == "function") {
      const s = e.getNodeInstance(t);
      if (s) return s.typeId;
    }
    try {
      const s = this._getNodes(), n = s[t] || s[String(t)];
      return n ? n.name : null;
    } catch {
      return null;
    }
  }
  _getNodes() {
    try {
      const t = this.dfp.drawflow, e = t.module || "Home";
      return t.drawflow.drawflow[e].data || {};
    } catch {
      return {};
    }
  }
}
const N = ["edit", "readonly", "preview", "locked"], J = {
  edit: "edit",
  readonly: "view",
  preview: "view",
  locked: "fixed"
}, Q = {
  initialMode: "edit",
  onModeChange: null
};
class yt {
  constructor(t = {}) {
    this._mode = "edit", this._listeners = /* @__PURE__ */ new Set(), this.options = { ...Q, ...t };
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, t.setMode = (s) => this.setMode(s), t.getMode = () => this.getMode(), t.isEditable = () => this.isEditable(), t.isPanEnabled = () => this.isPanEnabled(), t.isZoomEnabled = () => this.isZoomEnabled(), t.isMode = (s) => this.is(s), t.onModeChange = (s) => this.onModeChange(s), t.guardMode = (s, n) => this.guard(s, n), t.withMode = (s, n) => this.withMode(s, n), this.setMode(this.options.initialMode || "edit");
  }
  setMode(t) {
    if (!N.includes(t)) return !1;
    if (t === this._mode) return !0;
    const e = this._mode;
    this._mode = t;
    const s = this.dfp.drawflow;
    return s && (s.editor_mode = J[t] || "edit"), this._updateContainerClass(t), this._notifyAutoSave(t, e), this._listeners.forEach((n) => n(t, e)), typeof this.options.onModeChange == "function" && this.options.onModeChange(t, e), !0;
  }
  getMode() {
    return this._mode;
  }
  is(t) {
    return this._mode === t;
  }
  isEditable() {
    return this._mode === "edit";
  }
  isPanEnabled() {
    return this._mode !== "locked";
  }
  isZoomEnabled() {
    return this._mode === "edit" || this._mode === "readonly";
  }
  guard(t, e) {
    if (this._mode === t) return e();
  }
  withMode(t, e) {
    const s = this._mode;
    this.setMode(t);
    try {
      const n = e();
      return n && typeof n.then == "function" ? n.finally(() => this.setMode(s)) : (this.setMode(s), n);
    } catch (n) {
      throw this.setMode(s), n;
    }
  }
  onModeChange(t) {
    return this._listeners.add(t), () => this._listeners.delete(t);
  }
  // --- private ---
  _updateContainerClass(t) {
    const e = this.dfp.drawflow, s = e && e.precanvas ? e.precanvas.parentElement : null;
    s && (N.forEach((n) => s.classList.remove(`dfp-mode-${n}`)), s.classList.add(`dfp-mode-${t}`));
  }
  _notifyAutoSave(t, e) {
    const s = this.dfp.getExtension("autoSave");
    s && (t === "locked" ? typeof s.hold == "function" && s.hold() : e === "locked" && t !== "locked" && typeof s.release == "function" && s.release());
  }
}
const P = {
  boxSelectKey: null,
  // null=no modifier, 'shift', 'ctrl', 'meta'
  groupDragEnabled: !0,
  keyDelete: !0,
  keyCopy: !0
}, tt = `
.dfp-select-box {
  position: absolute;
  border: 2px dashed #3498db;
  background: rgba(52, 152, 219, 0.08);
  pointer-events: none;
  z-index: 9999;
  box-sizing: border-box;
}
.dfp-node-selected > .drawflow_content_node,
.dfp-node-selected {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}
`;
class vt {
  constructor(t = {}) {
    $(this, "_isBoxSelecting", !1);
    this._selected = /* @__PURE__ */ new Set(), this._subscribers = /* @__PURE__ */ new Set(), this._boxEl = null, this._boxStart = null, this._isDraggingBox = !1, this._groupDragData = null, this._styleEl = null, this.options = { ...P, ...t }, this._onPointerDown = this._onPointerDown.bind(this), this._onPointerMove = this._onPointerMove.bind(this), this._onPointerUp = this._onPointerUp.bind(this), this._onKeyDown = this._onKeyDown.bind(this), this._onNodeMoved = this._onNodeMoved.bind(this);
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, t.selectNode = (s) => this.select(s), t.deselectNode = (s) => this.deselect(s), t.selectAllNodes = () => this.selectAll(), t.deselectAllNodes = () => this.deselectAll(), t.getSelectedNodes = () => this.getSelected(), t.deleteSelectedNodes = () => this.deleteSelected(), t.duplicateSelectedNodes = () => this.duplicateSelected(), t.moveSelectedNodes = (s, n) => this.moveSelected(s, n), t.onSelectionChange = (s) => this.onSelectionChange(s), this._injectStyles(), this._attachListeners(), this._hookDrawflow();
  }
  select(t) {
    const e = String(t);
    this._selected.add(e), this._markNodeSelected(e, !0), this._notifySubscribers();
  }
  deselect(t) {
    const e = String(t);
    this._selected.delete(e), this._markNodeSelected(e, !1), this._notifySubscribers();
  }
  selectAll() {
    const t = this._getNodes();
    Object.keys(t).forEach((e) => this.select(e));
  }
  deselectAll() {
    new Set(this._selected).forEach((e) => this._markNodeSelected(e, !1)), this._selected.clear(), this._notifySubscribers();
  }
  getSelected() {
    return Array.from(this._selected);
  }
  deleteSelected() {
    if (!this._canEdit()) return;
    const t = this.dfp.drawflow;
    if (!t) return;
    const e = [...this._selected];
    this.deselectAll(), e.forEach((s) => {
      try {
        t.removeNodeId(`node-${s}`);
      } catch {
      }
    });
  }
  duplicateSelected() {
    if (!this._canEdit()) return;
    const t = this.dfp.drawflow;
    if (!t) return;
    const e = this._getNodes(), s = 30;
    this._selected.forEach((n) => {
      const i = e[n];
      if (i)
        try {
          t.addNode(
            i.name,
            Object.keys(i.inputs || {}).length,
            Object.keys(i.outputs || {}).length,
            i.pos_x + s,
            i.pos_y + s,
            i.class || i.name,
            Object.assign({}, i.data),
            i.html || ""
          );
        } catch {
        }
    });
  }
  moveSelected(t, e) {
    if (!this._canEdit()) return;
    const s = this.dfp.drawflow;
    if (!s) return;
    const n = this._getNodes();
    this._selected.forEach((i) => {
      const o = n[i];
      if (!o) return;
      o.pos_x += t, o.pos_y += e;
      const r = typeof document < "u" ? document.getElementById(`node-${i}`) : null;
      r && (r.style.left = `${o.pos_x}px`, r.style.top = `${o.pos_y}px`);
    }), s && typeof s.updateConnectionNodes == "function" && this._selected.forEach((i) => {
      try {
        s.updateConnectionNodes(`node-${i}`);
      } catch {
      }
    });
  }
  onSelectionChange(t) {
    return this._subscribers.add(t), () => this._subscribers.delete(t);
  }
  // --- private ---
  _hookDrawflow() {
    const t = this.dfp.drawflow;
    !t || typeof t.on != "function" || (t.on("nodeSelected", (e) => {
      const s = String(e);
      if (this._selected.has(s)) {
        const n = this._getNodes(), i = n[s];
        if (i) {
          const o = [];
          this._selected.forEach((r) => {
            if (r !== s) {
              const a = n[r];
              a && o.push({ id: r, origX: a.pos_x, origY: a.pos_y });
            }
          }), this._groupDragData = { startX: i.pos_x, startY: i.pos_y, followers: o };
        }
        return;
      }
      this.deselectAll();
    }), this.options.groupDragEnabled && t.on("nodeMoved", this._onNodeMoved));
  }
  _onNodeMoved(t) {
    if (this._selected.size < 2 || !this._selected.has(String(t)) || !this._groupDragData) return;
    const { startX: e, startY: s, followers: n } = this._groupDragData, i = this._getNodes(), o = i[t];
    if (!o) return;
    const r = o.pos_x - e, a = o.pos_y - s, l = this.dfp.drawflow;
    n.forEach(({ id: d, origX: h, origY: p }) => {
      const u = i[d];
      if (!u) return;
      u.pos_x = h + r, u.pos_y = p + a;
      const f = typeof document < "u" ? document.getElementById(`node-${d}`) : null;
      f && (f.style.left = `${u.pos_x}px`, f.style.top = `${u.pos_y}px`);
      try {
        l.updateConnectionNodes(`node-${d}`);
      } catch {
      }
    });
  }
  _attachListeners() {
    if (typeof document > "u") return;
    const t = this._getWrapper();
    t && t.addEventListener("pointerdown", this._onPointerDown), document.addEventListener("keydown", this._onKeyDown);
  }
  _onPointerDown(t) {
    var o;
    if (!this._canEdit()) return;
    const e = this._checkModifier(t);
    if (!(t.target === this._getWrapper() || t.target === ((o = this.dfp.drawflow) == null ? void 0 : o.precanvas)) || !e) return;
    this._isDraggingBox = !0;
    const n = this._getWrapper(), i = n.getBoundingClientRect();
    this._boxStart = { x: t.clientX - i.left, y: t.clientY - i.top }, this._boxEl = document.createElement("div"), this._boxEl.className = "dfp-select-box", this._boxEl.style.left = `${this._boxStart.x}px`, this._boxEl.style.top = `${this._boxStart.y}px`, this._boxEl.style.width = "0px", this._boxEl.style.height = "0px", n.appendChild(this._boxEl), window.addEventListener("pointermove", this._onPointerMove), window.addEventListener("pointerup", this._onPointerUp), t.preventDefault();
  }
  _onPointerMove(t) {
    if (!this._isDraggingBox || !this._boxEl) return;
    const s = this._getWrapper().getBoundingClientRect(), n = t.clientX - s.left, i = t.clientY - s.top, o = Math.min(n, this._boxStart.x), r = Math.min(i, this._boxStart.y), a = Math.abs(n - this._boxStart.x), l = Math.abs(i - this._boxStart.y);
    this._boxEl.style.left = `${o}px`, this._boxEl.style.top = `${r}px`, this._boxEl.style.width = `${a}px`, this._boxEl.style.height = `${l}px`;
  }
  _onPointerUp(t) {
    if (window.removeEventListener("pointermove", this._onPointerMove), window.removeEventListener("pointerup", this._onPointerUp), !!this._isDraggingBox) {
      if (this._isDraggingBox = !1, this._boxEl) {
        const e = this._boxEl.getBoundingClientRect();
        this._selectNodesInRect(e), this._boxEl.remove(), this._boxEl = null;
      }
      this._boxStart = null;
    }
  }
  _onKeyDown(t) {
    const e = document.activeElement && document.activeElement.tagName;
    e === "INPUT" || e === "TEXTAREA" || e === "SELECT" || ((t.key === "Delete" || t.key === "Backspace") && this.options.keyDelete && this._selected.size > 0 && (t.preventDefault(), this.deleteSelected()), (t.ctrlKey || t.metaKey) && t.key === "a" && this._canEdit() && (t.preventDefault(), this.selectAll()), t.key === "Escape" && this.deselectAll());
  }
  _selectNodesInRect(t) {
    if (typeof document > "u") return;
    this.deselectAll();
    const e = this._getNodes();
    Object.keys(e).forEach((s) => {
      const n = document.getElementById(`node-${s}`);
      if (!n) return;
      const i = n.getBoundingClientRect();
      this._rectsOverlap(t, i) && this.select(s);
    });
  }
  _rectsOverlap(t, e) {
    return !(t.right < e.left || t.left > e.right || t.bottom < e.top || t.top > e.bottom);
  }
  _markNodeSelected(t, e) {
    if (typeof document > "u") return;
    const s = document.getElementById(`node-${t}`);
    s && s.classList.toggle("dfp-node-selected", e);
  }
  _canEdit() {
    const t = this.dfp.getExtension("canvasMode");
    return !t || t.isEditable();
  }
  _checkModifier(t) {
    return this.options.boxSelectKey === null ? !0 : this.options.boxSelectKey === "shift" ? t.shiftKey : this.options.boxSelectKey === "ctrl" ? t.ctrlKey : this.options.boxSelectKey === "meta" ? t.metaKey : !0;
  }
  _notifySubscribers() {
    const t = this.getSelected();
    this._subscribers.forEach((e) => e({ selected: t }));
  }
  _getWrapper() {
    const t = this.dfp.drawflow;
    return t && t.precanvas ? t.precanvas.parentElement : null;
  }
  _getNodes() {
    try {
      const t = this.dfp.drawflow, e = t.module || "Home";
      return t.drawflow.drawflow[e].data || {};
    } catch {
      return {};
    }
  }
  _injectStyles() {
    typeof document > "u" || this._styleEl || (this._styleEl = document.createElement("style"), this._styleEl.textContent = tt, document.head.appendChild(this._styleEl));
  }
}
const et = {
  delay: 800,
  positionDelay: 1200,
  saveFn: null,
  buildPayload: null,
  maxRetries: 3,
  retryBaseDelay: 1e3,
  checkMode: !0,
  onSaveStart: null,
  onSaveEnd: null
};
class bt {
  constructor(t = {}) {
    this._fullTimer = null, this._positionTimer = null, this._pendingFull = !1, this._pendingPosition = !1, this._holdUntil = 0, this._holdIndefinite = !1, this._gates = /* @__PURE__ */ new Map(), this._status = "idle", this._listeners = /* @__PURE__ */ new Set(), this.options = { ...et, ...t };
  }
  install(t, e = {}) {
    if (this.dfp = t, this.options = { ...this.options, ...e }, !this.options.saveFn)
      throw new Error("AutoSave requires a saveFn option");
    t.scheduleSave = (s) => this.schedule(s), t.flushSave = () => this.flush(), t.holdSave = (s) => this.hold(s), t.releaseSave = () => this.release(), t.cancelSave = () => this.cancel(), t.openSaveGate = (s) => this.openGate(s), t.isSaveHeld = () => this.isHeld(), t.isSavePending = () => this.isPending(), t.getSaveStatus = () => this.getStatus(), t.onSave = (s) => this.onSave(s), this._hookDrawflow();
  }
  schedule(t = "full") {
    if (this._isBlocked()) {
      t === "position" ? this._pendingPosition = !0 : this._pendingFull = !0;
      return;
    }
    t === "position" ? (clearTimeout(this._positionTimer), this._positionTimer = setTimeout(() => {
      this._positionTimer = null, this._runSave("position");
    }, this.options.positionDelay)) : (clearTimeout(this._fullTimer), clearTimeout(this._positionTimer), this._positionTimer = null, this._pendingPosition = !1, this._fullTimer = setTimeout(() => {
      this._fullTimer = null, this._runSave("full");
    }, this.options.delay));
  }
  flush() {
    if (clearTimeout(this._fullTimer), clearTimeout(this._positionTimer), this._fullTimer = null, this._positionTimer = null, this._pendingFull || this._pendingPosition) {
      const t = this._pendingFull ? "full" : "position";
      this._pendingFull = !1, this._pendingPosition = !1, this._runSave(t);
    }
  }
  hold(t) {
    t === void 0 || t === 0 ? this._holdIndefinite = !0 : this._holdUntil = Math.max(this._holdUntil, Date.now() + t);
  }
  release() {
    if (this._holdIndefinite = !1, this._holdUntil = 0, this._pendingFull || this._pendingPosition) {
      const t = this._pendingFull ? "full" : "position";
      this._pendingFull = !1, this._pendingPosition = !1, this._runSave(t);
    }
  }
  cancel() {
    clearTimeout(this._fullTimer), clearTimeout(this._positionTimer), this._fullTimer = null, this._positionTimer = null, this._pendingFull = !1, this._pendingPosition = !1;
  }
  openGate(t) {
    const e = t || Symbol("gate");
    return this._gates.set(e, !0), () => {
      if (this._gates.delete(e), this._gates.size === 0 && (this._pendingFull || this._pendingPosition)) {
        const s = this._pendingFull ? "full" : "position";
        this._pendingFull = !1, this._pendingPosition = !1, this._runSave(s);
      }
    };
  }
  isHeld() {
    return this._holdIndefinite || Date.now() < this._holdUntil;
  }
  isPending() {
    return !!(this._fullTimer || this._positionTimer || this._pendingFull || this._pendingPosition);
  }
  getStatus() {
    return this._status;
  }
  onSave(t) {
    return this._listeners.add(t), () => this._listeners.delete(t);
  }
  // --- private ---
  _isBlocked() {
    if (this._gates.size > 0 || this.isHeld()) return !0;
    if (this.options.checkMode) {
      const t = this.dfp.getExtension("canvasMode");
      if (t && !t.isEditable()) return !0;
    }
    return !1;
  }
  _shouldSave() {
    const t = this.dfp.getExtension("state");
    if (!t) return !0;
    const e = t.getStore ? t.getStore("flow") : null;
    return e && typeof e.isDirty == "function" ? e.isDirty() : !0;
  }
  _buildPayload() {
    if (typeof this.options.buildPayload == "function")
      return this.options.buildPayload();
    const t = this.dfp.drawflow;
    return t && typeof t.export == "function" ? t.export() : {};
  }
  async _runSave(t) {
    if (this._isBlocked()) {
      t === "full" ? this._pendingFull = !0 : this._pendingPosition = !0;
      return;
    }
    if (!this._shouldSave()) return;
    if (this._status === "saving") {
      t === "full" ? this._pendingFull = !0 : this._pendingPosition = !0;
      return;
    }
    this._status = "saving", typeof this.options.onSaveStart == "function" && this.options.onSaveStart(t);
    let e = 0, s = !1, n = null;
    for (; e <= this.options.maxRetries; )
      try {
        const i = this._buildPayload();
        await this.options.saveFn(i), s = !0;
        break;
      } catch (i) {
        e++, n = i, e <= this.options.maxRetries && await this._sleep(this.options.retryBaseDelay * Math.pow(2, e - 1));
      }
    if (this._status = s ? "idle" : "error", s && this._onSaveSuccess(), this._notifyListeners(t, s, s ? null : n), typeof this.options.onSaveEnd == "function" && this.options.onSaveEnd(t, s, s ? null : n), this._pendingFull || this._pendingPosition) {
      const i = this._pendingFull ? "full" : "position";
      this._pendingFull = !1, this._pendingPosition = !1, this._runSave(i);
    }
  }
  _onSaveSuccess() {
    const t = this.dfp.getExtension("state");
    if (!t) return;
    const e = t.getStore ? t.getStore("flow") : null;
    e && typeof e.resetDirty == "function" && e.resetDirty();
  }
  _notifyListeners(t, e, s) {
    this._listeners.forEach((n) => n(t, e, s));
  }
  _sleep(t) {
    return new Promise((e) => setTimeout(e, t));
  }
  _hookDrawflow() {
    const t = this.dfp.drawflow;
    if (!t || typeof t.on != "function") return;
    const e = () => this.schedule("full"), s = () => this.schedule("position");
    t.on("nodeCreated", e), t.on("nodeRemoved", e), t.on("connectionCreated", e), t.on("connectionRemoved", e), t.on("nodeMoved", s);
  }
}
const st = {
  gridSize: 16,
  dotColor: "#c8c8c8",
  dotRadius: 1,
  style: "dots"
  // 'dots' | 'lines'
};
class xt {
  constructor(t = {}) {
    this._styleEl = null, this._observer = null, this.options = { ...st, ...t };
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, this._injectStyles(), this._attachToWrapper(), t.getExtension("viewport") && typeof t.onViewportChange == "function" ? t.onViewportChange(({ x: n, y: i, zoom: o }) => this._update(n, i, o)) : this._observeTransform(), t.setGridStyle = (n) => this.setStyle(n), t.setGridSize = (n) => this.setSize(n), t.toggleGrid = (n) => this.toggle(n);
  }
  setStyle(t) {
    this.options.style = t, this._rebuildStyles();
  }
  setSize(t) {
    this.options.gridSize = t, this._rebuildStyles();
    const e = this.dfp.drawflow;
    e && this._update(e.canvas_x || 0, e.canvas_y || 0, e.zoom || 1);
  }
  toggle(t) {
    const e = this._getWrapper();
    e && e.classList.toggle("dfp-canvas-grid", t !== !1);
  }
  // --- private ---
  _update(t, e, s) {
    const n = this._getWrapper();
    if (!n) return;
    const i = this.options.gridSize * Math.max(0.45, Math.min(s, 2.4)), o = (t % i + i) % i, r = (e % i + i) % i;
    n.style.setProperty("--dfp-grid-step", `${i.toFixed(2)}px`), n.style.setProperty("--dfp-grid-offset-x", `${o.toFixed(2)}px`), n.style.setProperty("--dfp-grid-offset-y", `${r.toFixed(2)}px`);
  }
  _attachToWrapper() {
    const t = this._getWrapper();
    t && t.classList.add("dfp-canvas-grid");
  }
  _observeTransform() {
    if (typeof MutationObserver > "u") return;
    const t = this.dfp.drawflow;
    !t || !t.precanvas || (this._observer = new MutationObserver(() => {
      const s = (t.precanvas.style.transform || "").match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);
      s && this._update(parseFloat(s[1]), parseFloat(s[2]), parseFloat(s[3]));
    }), this._observer.observe(t.precanvas, { attributes: !0, attributeFilter: ["style"] }));
  }
  _injectStyles() {
    if (!(typeof document > "u")) {
      if (this._styleEl) {
        this._styleEl.textContent = this._buildCSS();
        return;
      }
      this._styleEl = document.createElement("style"), this._styleEl.textContent = this._buildCSS(), document.head.appendChild(this._styleEl);
    }
  }
  _rebuildStyles() {
    this._styleEl && (this._styleEl.textContent = this._buildCSS());
  }
  _buildCSS() {
    const { dotColor: t, dotRadius: e, style: s } = this.options;
    return s === "lines" ? `
.dfp-canvas-grid {
  background-image:
    linear-gradient(to right, ${t} 1px, transparent 1px),
    linear-gradient(to bottom, ${t} 1px, transparent 1px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}` : `
.dfp-canvas-grid {
  background-image: radial-gradient(circle, ${t} ${e}px, transparent ${e}px);
  background-size: var(--dfp-grid-step, 16px) var(--dfp-grid-step, 16px);
  background-position: var(--dfp-grid-offset-x, 0px) var(--dfp-grid-offset-y, 0px);
}`;
  }
  _getWrapper() {
    const t = this.dfp.drawflow;
    return t && t.precanvas ? t.precanvas.parentElement : null;
  }
}
const nt = {
  defaultItems: ["settings", "duplicate", "delete"],
  onSettings: null,
  onDuplicate: null,
  onDelete: null
}, it = `
.dfp-context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  padding: 4px 0;
  z-index: 99999;
  min-width: 160px;
  font-size: 13px;
  font-family: inherit;
  user-select: none;
}
.dfp-context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  transition: background 0.1s;
}
.dfp-context-menu-item:hover {
  background: #f5f5f5;
}
.dfp-context-menu-item.danger {
  color: #e74c3c;
}
.dfp-context-menu-separator {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}
`;
class St {
  constructor(t = {}) {
    this._menuEl = null, this._styleEl = null, this._currentNodeId = null, this._typeOverrides = /* @__PURE__ */ new Map(), this._customItems = [], this.options = { ...nt, ...t }, this._onContextMenu = this._onContextMenu.bind(this), this._onDocumentClick = this._onDocumentClick.bind(this), this._onKeyDown = this._onKeyDown.bind(this);
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, t.registerContextMenuItems = (s, n) => this.registerMenuItems(s, n), t.addContextMenuItem = (s) => this.addMenuItem(s), t.closeContextMenu = () => this._close(), this._injectStyles(), this._attachListeners();
  }
  registerMenuItems(t, e) {
    return this._typeOverrides.set(t, e), this;
  }
  addMenuItem(t) {
    return this._customItems.push(t), this;
  }
  // --- private ---
  _attachListeners() {
    if (typeof document > "u") return;
    const t = this._getWrapper();
    t && t.addEventListener("contextmenu", this._onContextMenu), document.addEventListener("click", this._onDocumentClick), document.addEventListener("keydown", this._onKeyDown);
  }
  _onContextMenu(t) {
    const e = t.target.closest('[id^="node-"]');
    if (!e) return;
    t.preventDefault();
    const s = e.id.replace("node-", "");
    this._currentNodeId = s, this._show(t.clientX, t.clientY, s);
  }
  _show(t, e, s) {
    this._close();
    const n = this._buildItems(s);
    if (!n.length) return;
    this._menuEl = document.createElement("div"), this._menuEl.className = "dfp-context-menu";
    for (const d of n) {
      if (d.separator) {
        const u = document.createElement("div");
        u.className = "dfp-context-menu-separator", this._menuEl.appendChild(u);
        continue;
      }
      const h = document.createElement("div");
      h.className = `dfp-context-menu-item${d.danger ? " danger" : ""}`, d.icon && (h.innerHTML = `<span>${d.icon}</span>`);
      const p = document.createElement("span");
      p.textContent = d.label, h.appendChild(p), h.addEventListener("click", (u) => {
        u.stopPropagation(), this._close(), d.action(s, this.dfp);
      }), this._menuEl.appendChild(h);
    }
    document.body.appendChild(this._menuEl);
    const i = window.innerWidth, o = window.innerHeight, r = this._menuEl.getBoundingClientRect(), a = t + r.width > i ? t - r.width : t, l = e + r.height > o ? e - r.height : e;
    this._menuEl.style.left = `${a}px`, this._menuEl.style.top = `${l}px`;
  }
  _buildItems(t) {
    const e = this._getNodeType(t), s = e ? this._typeOverrides.get(e) : null, n = this.options.defaultItems, i = s || n, o = [];
    for (const r of i)
      r === "settings" ? o.push({
        label: "Settings",
        icon: "⚙",
        action: (a, l) => {
          typeof this.options.onSettings == "function" && this.options.onSettings(a, l);
        }
      }) : r === "duplicate" ? o.push({
        label: "Duplicate",
        icon: "⧉",
        action: (a, l) => {
          typeof this.options.onDuplicate == "function" ? this.options.onDuplicate(a, l) : typeof l.duplicateSelectedNodes == "function" && (l.selectNode(a), l.duplicateSelectedNodes(), l.deselectAllNodes());
        }
      }) : r === "delete" ? o.push({
        label: "Delete",
        icon: "✕",
        danger: !0,
        action: (a, l) => {
          if (typeof this.options.onDelete == "function")
            this.options.onDelete(a, l);
          else {
            const d = l.drawflow;
            if (d) try {
              d.removeNodeId(`node-${a}`);
            } catch {
            }
          }
        }
      }) : typeof r == "object" && o.push(r);
    return this._customItems.length && (o.length && o.push({ separator: !0 }), o.push(...this._customItems)), o;
  }
  _close() {
    this._menuEl && (this._menuEl.remove(), this._menuEl = null), this._currentNodeId = null;
  }
  _onDocumentClick() {
    this._close();
  }
  _onKeyDown(t) {
    t.key === "Escape" && this._close();
  }
  _getNodeType(t) {
    const e = this.dfp.getExtension("nodeTypes");
    if (e && typeof e.getNodeInstance == "function") {
      const s = e.getNodeInstance(t);
      if (s) return s.typeId;
    }
    try {
      const s = this.dfp.drawflow, n = s.module || "Home", o = (s.drawflow.drawflow[n].data || {})[t];
      return o ? o.name : null;
    } catch {
      return null;
    }
  }
  _getWrapper() {
    const t = this.dfp.drawflow;
    return t && t.precanvas ? t.precanvas.parentElement : null;
  }
  _injectStyles() {
    typeof document > "u" || this._styleEl || (this._styleEl = document.createElement("style"), this._styleEl.textContent = it, document.head.appendChild(this._styleEl));
  }
}
const ot = {
  "ctrl+z": "undo",
  "ctrl+y": "redo",
  "ctrl+shift+z": "redo",
  delete: "delete",
  backspace: "delete",
  "ctrl+a": "selectAll",
  "ctrl+d": "duplicate",
  escape: "deselect",
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  0: "fitToScreen"
}, rt = /* @__PURE__ */ new Set(["delete", "duplicate", "undo", "redo"]);
class Et {
  constructor(t = {}) {
    this._bindings = /* @__PURE__ */ new Map(), this._customActions = /* @__PURE__ */ new Map(), this._styleEl = null, this.options = t, this._onKeyDown = this._onKeyDown.bind(this);
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e };
    const s = this.options.bindings || ot;
    for (const [n, i] of Object.entries(s))
      this._bindings.set(n.toLowerCase(), i);
    t.bindKey = (n, i) => this.bind(n, i), t.unbindKey = (n) => this.unbind(n), t.registerKeyAction = (n, i) => this.registerAction(n, i), typeof document < "u" && document.addEventListener("keydown", this._onKeyDown);
  }
  bind(t, e) {
    return this._bindings.set(t.toLowerCase(), e), this;
  }
  unbind(t) {
    return this._bindings.delete(t.toLowerCase()), this;
  }
  registerAction(t, e) {
    return this._customActions.set(t, e), this;
  }
  // --- private ---
  _onKeyDown(t) {
    const e = document.activeElement && document.activeElement.tagName;
    if (e === "INPUT" || e === "TEXTAREA" || e === "SELECT" || document.activeElement.isContentEditable)
      return;
    const s = this._normalizeKey(t), n = this._bindings.get(s);
    if (!n) return;
    if (rt.has(n)) {
      const o = this.dfp.getExtension("canvasMode");
      if (o && !o.isEditable()) return;
    }
    this._executeAction(n, t) && t.preventDefault();
  }
  _executeAction(t, e) {
    if (this._customActions.has(t))
      return this._customActions.get(t)(this.dfp, e), !0;
    const s = this.dfp;
    switch (t) {
      case "undo": {
        const n = s.getExtension("state");
        if (n) {
          const i = n.getStore ? n.getStore("flow") : null;
          if (i && typeof i.undo == "function")
            return i.undo(), !0;
        }
        return !1;
      }
      case "redo": {
        const n = s.getExtension("state");
        if (n) {
          const i = n.getStore ? n.getStore("flow") : null;
          if (i && typeof i.redo == "function")
            return i.redo(), !0;
        }
        return !1;
      }
      case "delete": {
        if (s.getExtension("multiSelect") && typeof s.deleteSelectedNodes == "function")
          return s.deleteSelectedNodes(), !0;
        const i = s.drawflow;
        if (i && i.node_selected) {
          try {
            i.removeNodeId(i.node_selected.id);
          } catch {
          }
          return !0;
        }
        return !1;
      }
      case "selectAll":
        return typeof s.selectAllNodes == "function" ? (s.selectAllNodes(), !0) : !1;
      case "duplicate":
        return typeof s.duplicateSelectedNodes == "function" ? (s.duplicateSelectedNodes(), !0) : !1;
      case "deselect":
        return typeof s.deselectAllNodes == "function" ? (s.deselectAllNodes(), !0) : !1;
      case "zoomIn":
        return typeof s.zoomIn == "function" ? (s.zoomIn(), !0) : !1;
      case "zoomOut":
        return typeof s.zoomOut == "function" ? (s.zoomOut(), !0) : !1;
      case "fitToScreen":
        return typeof s.fitToScreen == "function" ? (s.fitToScreen(), !0) : !1;
      default:
        return !1;
    }
  }
  _normalizeKey(t) {
    const e = [];
    (t.ctrlKey || t.metaKey) && e.push("ctrl"), t.shiftKey && e.push("shift"), t.altKey && e.push("alt");
    const s = t.key.toLowerCase();
    return s !== "control" && s !== "shift" && s !== "alt" && s !== "meta" && e.push(s), e.join("+");
  }
}
const at = {
  width: 180,
  height: 120,
  position: "bottom-right",
  // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  margin: 12,
  nodeColor: "#3498db",
  viewportColor: "rgba(52, 152, 219, 0.2)",
  viewportBorderColor: "#3498db",
  collapsible: !0
}, lt = `
.dfp-minimap {
  position: absolute;
  background: rgba(255,255,255,0.92);
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  z-index: 1000;
}
.dfp-minimap canvas {
  display: block;
}
.dfp-minimap-toggle {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0,0,0,0.2);
  border: none;
  border-radius: 3px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  font-size: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 1001;
}
.dfp-minimap.collapsed {
  height: 24px !important;
  overflow: hidden;
}
`;
class wt {
  constructor(t = {}) {
    this._containerEl = null, this._canvasEl = null, this._styleEl = null, this._visible = !0, this._renderScheduled = !1, this._navigateListeners = /* @__PURE__ */ new Set(), this.options = { ...at, ...t }, this._onClick = this._onClick.bind(this);
  }
  install(t, e = {}) {
    this.dfp = t, this.options = { ...this.options, ...e }, t.renderMinimap = () => this.render(), t.toggleMinimap = (s) => this.toggle(s), t.isMinimapVisible = () => this._visible, t.onMinimapNavigate = (s) => this.onNavigate(s), this._injectStyles(), this._createContainer(), this._hookDrawflow(), this._scheduleRender();
  }
  render() {
    if (!this._canvasEl || !this._visible) return;
    const t = this._canvasEl.getContext("2d");
    if (!t) return;
    const { width: e, height: s } = this.options;
    t.clearRect(0, 0, e, s);
    const n = this._computeBounds();
    if (!n) return;
    const { minX: i, minY: o, maxX: r, maxY: a } = n, l = r - i || 1, d = a - o || 1, h = (e - 16) / l, p = (s - 16) / d, u = Math.min(h, p), f = 8 + (e - 16 - l * u) / 2, _ = 8 + (s - 16 - d * u) / 2, D = this._getNodes();
    t.fillStyle = this.options.nodeColor;
    for (const [y, v] of Object.entries(D)) {
      const x = f + (v.pos_x - i) * u, g = _ + (v.pos_y - o) * u, S = Math.max(4, 240 * u), E = Math.max(3, 80 * u);
      t.fillRect(x, g, S, E);
    }
    const m = this.dfp.drawflow;
    if (m) {
      const y = m.precanvas ? m.precanvas.parentElement : null;
      if (y) {
        const v = y.offsetWidth || 800, x = y.offsetHeight || 600, g = m.zoom || 1, S = m.canvas_x || 0, E = m.canvas_y || 0, z = -S / g, R = -E / g, F = v / g, O = x / g, w = f + (z - i) * u, M = _ + (R - o) * u, C = F * u, k = O * u;
        t.strokeStyle = this.options.viewportBorderColor, t.lineWidth = 1.5, t.fillStyle = this.options.viewportColor, t.fillRect(w, M, C, k), t.strokeRect(w, M, C, k);
      }
    }
    this._renderBounds = { minX: i, minY: o, scale: u, offsetX: f, offsetY: _ };
  }
  toggle(t) {
    this._visible = t !== !1, this._containerEl && (this._containerEl.style.display = this._visible ? "" : "none"), this._visible && this._scheduleRender();
  }
  isVisible() {
    return this._visible;
  }
  onNavigate(t) {
    return this._navigateListeners.add(t), () => this._navigateListeners.delete(t);
  }
  // --- private ---
  _createContainer() {
    if (typeof document > "u") return;
    const t = this._getWrapper();
    if (!t) return;
    if (window.getComputedStyle(t).position === "static" && (t.style.position = "relative"), this._containerEl = document.createElement("div"), this._containerEl.className = "dfp-minimap", this._containerEl.style.width = `${this.options.width}px`, this._containerEl.style.height = `${this.options.height}px`, this._positionContainer(), this._canvasEl = document.createElement("canvas"), this._canvasEl.width = this.options.width, this._canvasEl.height = this.options.height, this._containerEl.appendChild(this._canvasEl), this.options.collapsible) {
      const s = document.createElement("button");
      s.className = "dfp-minimap-toggle", s.textContent = "−", s.title = "Toggle minimap", s.addEventListener("click", (n) => {
        n.stopPropagation(), this._containerEl.classList.toggle("collapsed"), s.textContent = this._containerEl.classList.contains("collapsed") ? "+" : "−";
      }), this._containerEl.appendChild(s);
    }
    this._containerEl.addEventListener("click", this._onClick), t.appendChild(this._containerEl);
  }
  _positionContainer() {
    if (!this._containerEl) return;
    const { position: t, margin: e, width: s, height: n } = this.options, i = this._containerEl.style;
    i.top = i.bottom = i.left = i.right = "", t === "top-left" ? (i.top = `${e}px`, i.left = `${e}px`) : t === "top-right" ? (i.top = `${e}px`, i.right = `${e}px`) : t === "bottom-left" ? (i.bottom = `${e}px`, i.left = `${e}px`) : (i.bottom = `${e}px`, i.right = `${e}px`);
  }
  _onClick(t) {
    if (this._containerEl && this._containerEl.classList.contains("collapsed") || !this._renderBounds) return;
    const e = this._containerEl.getBoundingClientRect(), s = t.clientX - e.left, n = t.clientY - e.top, { minX: i, minY: o, scale: r, offsetX: a, offsetY: l } = this._renderBounds, d = (s - a) / r + i, h = (n - l) / r + o;
    this._navigateListeners.forEach((p) => p({ worldX: d, worldY: h })), typeof this.dfp.panTo == "function" && this.dfp.panTo(d, h);
  }
  _hookDrawflow() {
    const t = this.dfp.drawflow;
    if (!t || typeof t.on != "function") return;
    const e = () => this._scheduleRender();
    t.on("nodeCreated", e), t.on("nodeRemoved", e), t.on("nodeMoved", e), t.on("connectionCreated", e), t.on("connectionRemoved", e), typeof this.dfp.onViewportChange == "function" && this.dfp.onViewportChange(() => this._scheduleRender());
  }
  _scheduleRender() {
    this._renderScheduled || (this._renderScheduled = !0, typeof requestAnimationFrame < "u" ? requestAnimationFrame(() => {
      this._renderScheduled = !1, this.render();
    }) : setTimeout(() => {
      this._renderScheduled = !1, this.render();
    }, 16));
  }
  _computeBounds() {
    const t = this._getNodes(), e = Object.entries(t);
    if (!e.length) return null;
    let s = 1 / 0, n = 1 / 0, i = -1 / 0, o = -1 / 0;
    for (const [, r] of e) {
      const a = r.pos_x || 0, l = r.pos_y || 0;
      s = Math.min(s, a), n = Math.min(n, l), i = Math.max(i, a + 240), o = Math.max(o, l + 80);
    }
    return isFinite(s) ? { minX: s, minY: n, maxX: i, maxY: o } : null;
  }
  _getNodes() {
    try {
      const t = this.dfp.drawflow, e = t.module || "Home";
      return t.drawflow.drawflow[e].data || {};
    } catch {
      return {};
    }
  }
  _getWrapper() {
    const t = this.dfp.drawflow;
    return t && t.precanvas ? t.precanvas.parentElement : null;
  }
  _injectStyles() {
    typeof document > "u" || this._styleEl || (this._styleEl = document.createElement("style"), this._styleEl.textContent = lt, document.head.appendChild(this._styleEl));
  }
}
class Mt {
  constructor(t = {}) {
    this.options = t, this.extensions = {}, this.initialized = !1;
  }
  /**
   * Initialize the plugin with Drawflow instance
   * @param {Object} drawflowInstance - The Drawflow instance
   * @returns {DrawflowPlus} - Returns this for chaining
   */
  init(t) {
    if (!t)
      throw new Error("Drawflow instance is required");
    return this.drawflow = t, this.initialized = !0, this;
  }
  /**
   * Register an extension
   * @param {string} name - Extension name
   * @param {Object} extension - Extension module
   * @returns {DrawflowPlus} - Returns this for chaining
   */
  use(t, e) {
    if (typeof e != "object" || !e.install)
      throw new Error(`Extension "${t}" must have an install method`);
    return this.extensions[t] = e, e.install(this, this.options[t] || {}), this;
  }
  /**
   * Get an extension by name
   * @param {string} name - Extension name
   * @returns {Object} - The extension module
   */
  getExtension(t) {
    return this.extensions[t];
  }
  /**
   * Check if extension is registered
   * @param {string} name - Extension name
   * @returns {boolean} - True if extension is registered
   */
  hasExtension(t) {
    return Object.prototype.hasOwnProperty.call(this.extensions, t);
  }
  /**
   * Get all registered extensions
   * @returns {Object} - All extensions
   */
  getExtensions() {
    return this.extensions;
  }
  /**
   * Get version
   * @returns {string} - Version number
   */
  getVersion() {
    return "0.2.0";
  }
}
export {
  bt as AutoSave,
  yt as CanvasMode,
  ft as ConnectionManager,
  gt as ConnectionRules,
  xt as GridBackground,
  Et as KeyboardShortcuts,
  wt as Minimap,
  vt as MultiSelect,
  St as NodeContextMenu,
  dt as NodeTypeSystem,
  pt as StateManager,
  ht as UIBuilder,
  _t as Utils,
  ut as ValidationFramework,
  mt as ViewportManager,
  Mt as default
};
//# sourceMappingURL=drawflow-plus.esm.js.map
