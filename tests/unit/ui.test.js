/**
 * Unit Tests for Form Builder and Field Renderers
 */

import FormBuilder from '../../src/extensions/ui/form-builder.js';
import {
  FieldRenderer,
  TextRenderer,
  NumberRenderer,
  EmailRenderer,
  SelectRenderer,
  TextareaRenderer,
  SwitchRenderer,
  CustomRenderer,
  FieldRendererFactory
} from '../../src/extensions/ui/field-renderers.js';

describe('FormBuilder', () => {
  let formBuilder;

  beforeEach(() => {
    formBuilder = new FormBuilder();
  });

  describe('constructor', () => {
    test('should create FormBuilder with default options', () => {
      expect(formBuilder).toBeDefined();
      expect(formBuilder.forms).toEqual(new Map());
      expect(formBuilder.options).toEqual({});
    });

    test('should create FormBuilder with custom options', () => {
      const onSubmit = jest.fn();
      const builder = new FormBuilder({ onSubmit });
      expect(builder.options.onSubmit).toBe(onSubmit);
    });
  });

  describe('generateForm', () => {
    test('should throw error if nodeType is missing', () => {
      expect(() => formBuilder.generateForm('')).toThrow('Node type is required');
    });

    test('should generate form with basic config', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text', label: 'Title', required: true }
        ]
      });

      expect(form).toBeDefined();
      expect(form.nodeType).toBe('testNode');
      expect(form.fieldDefinitions).toHaveLength(1);
    });

    test('should set initial values', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'title', type: 'text' }],
        values: { title: 'Initial Value' }
      });

      expect(form.values.title).toBe('Initial Value');
    });

    test('should include validation schema', () => {
      const validationSchema = {
        title: 'required',
        email: 'email'
      };

      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text' },
          { name: 'email', type: 'email' }
        ],
        validation: validationSchema
      });

      expect(form.validationSchema).toEqual(validationSchema);
    });

    test('should include dependencies', () => {
      const dependencies = {
        addressField: { dependsOn: 'country' }
      };

      const form = formBuilder.generateForm('testNode', {
        fields: [],
        dependencies
      });

      expect(form.dependencies).toEqual(dependencies);
    });

    test('should return form with all methods', () => {
      const form = formBuilder.generateForm('testNode', { fields: [] });

      expect(typeof form.render).toBe('function');
      expect(typeof form.submit).toBe('function');
      expect(typeof form.setValue).toBe('function');
      expect(typeof form.getValue).toBe('function');
      expect(typeof form.getValues).toBe('function');
      expect(typeof form.setError).toBe('function');
      expect(typeof form.clearError).toBe('function');
      expect(typeof form.getErrors).toBe('function');
      expect(typeof form.getDirtyFields).toBe('function');
      expect(typeof form.reset).toBe('function');
      expect(typeof form.validate).toBe('function');
    });
  });

  describe('Form Rendering', () => {
    test('should render form HTML', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text', label: 'Title' }
        ]
      });

      const html = form.render();
      expect(html).toContain('class="df-form"');
      expect(html).toContain('data-form-id');
      expect(html).toContain('class="df-form-field');
    });

    test('should render text input field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'username', type: 'text', label: 'Username', placeholder: 'Enter username' }
        ]
      });

      const html = form.render();
      expect(html).toContain('type="text"');
      expect(html).toContain('id="username"');
      expect(html).toContain('placeholder="Enter username"');
    });

    test('should render email input field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'email', type: 'email', label: 'Email' }
        ]
      });

      const html = form.render();
      expect(html).toContain('type="email"');
    });

    test('should render number input field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'age', type: 'number', label: 'Age', min: 0, max: 100 }
        ]
      });

      const html = form.render();
      expect(html).toContain('type="number"');
      expect(html).toContain('min="0"');
      expect(html).toContain('max="100"');
    });

    test('should render select field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          {
            name: 'status',
            type: 'select',
            label: 'Status',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]
          }
        ]
      });

      const html = form.render();
      expect(html).toContain('<select');
      expect(html).toContain('value="active"');
      expect(html).toContain('value="inactive"');
    });

    test('should render textarea field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'description', type: 'textarea', label: 'Description', rows: 5 }
        ]
      });

      const html = form.render();
      expect(html).toContain('<textarea');
      expect(html).toContain('rows="5"');
    });

    test('should render switch field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'enabled', type: 'switch', label: 'Enabled' }
        ]
      });

      const html = form.render();
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('class="df-switch-input"');
    });

    test('should render required field indicator', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'required_field', type: 'text', required: true }
        ]
      });

      const html = form.render();
      expect(html).toContain('class="df-required"');
    });
  });

  describe('Field Value Management', () => {
    test('should set and get field value', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'title', type: 'text' }]
      });

      form.setValue('title', 'New Title');
      expect(form.getValue('title')).toBe('New Title');
    });

    test('should get all form values', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text' },
          { name: 'enabled', type: 'switch' }
        ],
        values: { title: 'Test', enabled: true }
      });

      const values = form.getValues();
      expect(values).toEqual({ title: 'Test', enabled: true });
    });

    test('should mark fields as dirty', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'title', type: 'text' }]
      });

      form.setValue('title', 'Changed');
      const dirty = form.getDirtyFields();
      expect(dirty).toContain('title');
    });
  });

  describe('Error Management', () => {
    test('should set field error', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'email', type: 'email' }]
      });

      form.setError('email', 'Invalid email');
      const errors = form.getErrors();
      expect(errors.email).toBe('Invalid email');
    });

    test('should clear field error', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'email', type: 'email' }]
      });

      form.setError('email', 'Invalid email');
      form.clearError('email');
      const errors = form.getErrors();
      expect(errors.email).toBeUndefined();
    });

    test('should get all form errors', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'email', type: 'email' },
          { name: 'username', type: 'text' }
        ]
      });

      form.setError('email', 'Invalid email');
      form.setError('username', 'Username too short');
      const errors = form.getErrors();
      expect(Object.keys(errors)).toHaveLength(2);
    });
  });

  describe('Form Validation', () => {
    test('should validate required field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text', label: 'Title', required: true }
        ],
        validation: {
          title: 'required'
        }
      });

      form.setValue('title', '');
      const result = form.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    test('should validate email field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'email', type: 'email' }
        ],
        validation: {
          email: 'email'
        }
      });

      form.setValue('email', 'invalid-email');
      const result = form.validate();
      expect(result.valid).toBe(false);

      form.setValue('email', 'test@example.com');
      const result2 = form.validate();
      expect(result2.valid).toBe(true);
    });

    test('should validate number min/max', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'age', type: 'number' }
        ],
        validation: {
          age: [
            { name: 'min', value: 18 },
            { name: 'max', value: 100 }
          ]
        }
      });

      form.setValue('age', 15);
      const result = form.validate();
      expect(result.valid).toBe(false);

      form.setValue('age', 25);
      const result2 = form.validate();
      expect(result2.valid).toBe(true);
    });

    test('should validate minLength and maxLength', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'password', type: 'text' }
        ],
        validation: {
          password: [
            { name: 'minLength', value: 8 },
            { name: 'maxLength', value: 20 }
          ]
        }
      });

      form.setValue('password', 'short');
      let result = form.validate();
      expect(result.valid).toBe(false);

      form.setValue('password', 'validpassword123');
      result = form.validate();
      expect(result.valid).toBe(true);
    });

    test('should validate pattern', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'code', type: 'text' }
        ],
        validation: {
          code: { name: 'pattern', value: '^[A-Z]{3}$', message: 'Code must be 3 uppercase letters' }
        }
      });

      form.setValue('code', 'abc');
      let result = form.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.code).toContain('uppercase');

      form.setValue('code', 'ABC');
      result = form.validate();
      expect(result.valid).toBe(true);
    });

    test('should validate multiple rules for single field', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'username', type: 'text', label: 'Username' }
        ],
        validation: {
          username: [
            'required',
            { name: 'minLength', value: 3 }
          ]
        }
      });

      form.setValue('username', 'ab');
      const result = form.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.username).toBeDefined();
    });
  });

  describe('Form Reset', () => {
    test('should reset form to initial values', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text' },
          { name: 'enabled', type: 'switch' }
        ],
        values: { title: 'Initial', enabled: false }
      });

      form.setValue('title', 'Changed');
      form.setValue('enabled', true);
      form.reset();

      expect(form.getValue('title')).toBe('Initial');
      expect(form.getValue('enabled')).toBe(false);
    });

    test('should clear dirty fields on reset', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'title', type: 'text' }]
      });

      form.setValue('title', 'Changed');
      expect(form.getDirtyFields()).toHaveLength(1);

      form.reset();
      expect(form.getDirtyFields()).toHaveLength(0);
    });

    test('should clear errors on reset', () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [{ name: 'email', type: 'email' }]
      });

      form.setError('email', 'Invalid');
      expect(form.getErrors().email).toBeDefined();

      form.reset();
      expect(form.getErrors().email).toBeUndefined();
    });
  });

  describe('Async Options Loading', () => {
    test('should load async dropdown options', async () => {
      const form = formBuilder.generateForm('testNode', {
        fields: [
          { name: 'category', type: 'select', isAsync: true }
        ]
      });

      const mockLoader = jest.fn(() =>
        Promise.resolve([
          { value: 'cat1', label: 'Category 1' },
          { value: 'cat2', label: 'Category 2' }
        ])
      );

      const options = await formBuilder.loadAsyncOptions(form.id, 'category', mockLoader);
      expect(mockLoader).toHaveBeenCalled();
      expect(options).toHaveLength(2);
    });

    test('should reject if loader is not a function', async () => {
      const form = formBuilder.generateForm('testNode', { fields: [] });

      await expect(
        formBuilder.loadAsyncOptions(form.id, 'field', 'not-a-function')
      ).rejects.toThrow('Loader must be a function');
    });

    test('should handle async loader errors', async () => {
      const form = formBuilder.generateForm('testNode', { fields: [] });

      const mockLoader = jest.fn(() =>
        Promise.reject(new Error('API Error'))
      );

      await expect(
        formBuilder.loadAsyncOptions(form.id, 'category', mockLoader)
      ).rejects.toThrow('API Error');
    });
  });

  describe('Form Submission', () => {
    test('should submit form with valid data', () => {
      const onSubmit = jest.fn().mockReturnValue({ success: true });
      const builder = new FormBuilder({ onSubmit });

      const form = builder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text', required: true }
        ],
        validation: {
          title: 'required'
        }
      });

      form.setValue('title', 'Test Title');
      const result = form.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Title' }),
        expect.any(Object)
      );
    });

    test('should reject form submission on validation error', () => {
      const onError = jest.fn();
      const builder = new FormBuilder({ onError });

      const form = builder.generateForm('testNode', {
        fields: [
          { name: 'title', type: 'text', required: true }
        ],
        validation: {
          title: 'required'
        }
      });

      form.setValue('title', '');
      const result = form.submit();

      expect(result.success).toBe(false);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Form Cleanup', () => {
    test('should delete form', () => {
      const form = formBuilder.generateForm('testNode', { fields: [] });
      expect(formBuilder.getForm(form.id)).toBeDefined();

      formBuilder.deleteForm(form.id);
      expect(formBuilder.getForm(form.id)).toBeUndefined();
    });

    test('should retrieve form by ID', () => {
      const form = formBuilder.generateForm('testNode', { fields: [] });
      const retrieved = formBuilder.getForm(form.id);
      expect(retrieved).toBe(form);
    });
  });
});

describe('Field Renderers', () => {
  describe('TextRenderer', () => {
    test('should render text input', () => {
      const renderer = new TextRenderer(
        { name: 'username', type: 'text', label: 'Username' },
        'test-value'
      );

      const html = renderer.render();
      expect(html).toContain('type="text"');
      expect(html).toContain('id="username"');
      expect(html).toContain('test-value');
    });

    test('should parse text value', () => {
      const renderer = new TextRenderer({ name: 'title' }, '');
      const input = document.createElement('input');
      input.value = '  test  ';

      const value = renderer.parseValue(input);
      expect(value).toBe('test');
    });
  });

  describe('NumberRenderer', () => {
    test('should render number input with min/max', () => {
      const renderer = new NumberRenderer(
        { name: 'age', type: 'number', min: 0, max: 100 },
        '25'
      );

      const html = renderer.render();
      expect(html).toContain('type="number"');
      expect(html).toContain('min="0"');
      expect(html).toContain('max="100"');
    });

    test('should parse number value', () => {
      const renderer = new NumberRenderer({ name: 'age' }, '');
      const input = document.createElement('input');
      input.type = 'number';
      input.value = '42';

      const value = renderer.parseValue(input);
      expect(value).toBe(42);
    });
  });

  describe('EmailRenderer', () => {
    test('should render email input', () => {
      const renderer = new EmailRenderer(
        { name: 'email', type: 'email' },
        'test@example.com'
      );

      const html = renderer.render();
      expect(html).toContain('type="email"');
      expect(html).toContain('test@example.com');
    });

    test('should parse and lowercase email', () => {
      const renderer = new EmailRenderer({ name: 'email' }, '');
      const input = document.createElement('input');
      input.value = 'Test@Example.COM';

      const value = renderer.parseValue(input);
      expect(value).toBe('test@example.com');
    });
  });

  describe('SelectRenderer', () => {
    test('should render select with options', () => {
      const renderer = new SelectRenderer(
        {
          name: 'status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]
        },
        'active'
      );

      const html = renderer.render();
      expect(html).toContain('<select');
      expect(html).toContain('value="active"');
      expect(html).toContain('value="inactive"');
    });

    test('should parse select value', () => {
      const renderer = new SelectRenderer({ name: 'status' }, '');
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'active';
      option.selected = true;
      select.appendChild(option);

      const value = renderer.parseValue(select);
      expect(value).toBe('active');
    });

    test('should update options', () => {
      const renderer = new SelectRenderer({ name: 'status' }, '');
      const select = document.createElement('select');

      const newOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' }
      ];

      renderer.updateOptions(select, newOptions);
      expect(select.options).toHaveLength(3); // 1 placeholder + 2 options
    });
  });

  describe('TextareaRenderer', () => {
    test('should render textarea', () => {
      const renderer = new TextareaRenderer(
        { name: 'description', type: 'textarea', rows: 5 },
        'test content'
      );

      const html = renderer.render();
      expect(html).toContain('<textarea');
      expect(html).toContain('rows="5"');
      expect(html).toContain('test content');
    });

    test('should parse textarea value', () => {
      const renderer = new TextareaRenderer({ name: 'description' }, '');
      const textarea = document.createElement('textarea');
      textarea.value = 'multi\nline\ntext';

      const value = renderer.parseValue(textarea);
      expect(value).toBe('multi\nline\ntext');
    });
  });

  describe('SwitchRenderer', () => {
    test('should render switch when true', () => {
      const renderer = new SwitchRenderer(
        { name: 'enabled', type: 'switch', label: 'Enable' },
        true
      );

      const html = renderer.render();
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('checked');
    });

    test('should not show checked when false', () => {
      const renderer = new SwitchRenderer(
        { name: 'enabled', type: 'switch' },
        false
      );

      const html = renderer.render();
      expect(html).not.toContain('checked');
    });

    test('should parse switch value', () => {
      const renderer = new SwitchRenderer({ name: 'enabled' }, false);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;

      const value = renderer.parseValue(checkbox);
      expect(value).toBe(true);
    });
  });

  describe('CustomRenderer', () => {
    test('should render custom field with renderer function', () => {
      const customRenderer = () => '<input type="custom" />';
      const renderer = new CustomRenderer(
        { name: 'custom', renderer: customRenderer },
        ''
      );

      const html = renderer.render();
      expect(html).toContain('type="custom"');
    });

    test('should parse custom field with parser function', () => {
      const parser = (el) => el.value.toUpperCase();
      const renderer = new CustomRenderer(
        { name: 'custom', parser },
        ''
      );

      const input = document.createElement('input');
      input.value = 'test';

      const value = renderer.parseValue(input);
      expect(value).toBe('TEST');
    });
  });

  describe('FieldRendererFactory', () => {
    test('should create TextRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('text', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(TextRenderer);
    });

    test('should create NumberRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('number', { name: 'field' }, 0);
      expect(renderer).toBeInstanceOf(NumberRenderer);
    });

    test('should create EmailRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('email', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(EmailRenderer);
    });

    test('should create SelectRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('select', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(SelectRenderer);
    });

    test('should create TextareaRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('textarea', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(TextareaRenderer);
    });

    test('should create SwitchRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('switch', { name: 'field' }, false);
      expect(renderer).toBeInstanceOf(SwitchRenderer);
    });

    test('should create CustomRenderer', () => {
      const renderer = FieldRendererFactory.createRenderer('custom', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(CustomRenderer);
    });

    test('should default to TextRenderer for unknown type', () => {
      const renderer = FieldRendererFactory.createRenderer('unknown', { name: 'field' }, '');
      expect(renderer).toBeInstanceOf(TextRenderer);
    });
  });

  describe('Error Display', () => {
    test('should display error message', () => {
      const renderer = new TextRenderer({ name: 'email' }, '');
      const container = document.createElement('div');
      container.innerHTML = '<div class="df-field-error"></div>';

      renderer.displayError(container, 'Invalid email');

      expect(container.classList.contains('df-has-error')).toBe(true);
      const errorEl = container.querySelector('.df-field-error');
      expect(errorEl.textContent).toBe('Invalid email');
    });

    test('should clear error message', () => {
      const renderer = new TextRenderer({ name: 'email' }, '');
      const container = document.createElement('div');
      container.classList.add('df-has-error');
      container.innerHTML = '<div class="df-field-error">Error</div>';

      renderer.clearError(container);

      expect(container.classList.contains('df-has-error')).toBe(false);
      const errorEl = container.querySelector('.df-field-error');
      expect(errorEl.textContent).toBe('');
    });
  });

  describe('Disabled State', () => {
    test('should set field disabled', () => {
      const renderer = new TextRenderer({ name: 'field' }, '');
      const input = document.createElement('input');

      renderer.setDisabled(input, true);
      expect(input.hasAttribute('disabled')).toBe(true);
    });

    test('should remove disabled attribute', () => {
      const renderer = new TextRenderer({ name: 'field' }, '');
      const input = document.createElement('input');
      input.setAttribute('disabled', '');

      renderer.setDisabled(input, false);
      expect(input.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('HTML Escaping', () => {
    test('should escape HTML special characters', () => {
      const renderer = new TextRenderer({ name: 'field' }, '');
      const escaped = renderer.escapeHtml('<script>alert("xss")</script>');
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
    });

    test('should handle null and undefined', () => {
      const renderer = new TextRenderer({ name: 'field' }, '');
      expect(renderer.escapeHtml(null)).toBe('');
      expect(renderer.escapeHtml(undefined)).toBe('');
    });
  });
});
