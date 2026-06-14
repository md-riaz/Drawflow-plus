/**
 * Built-in Node Type Validators
 * Provides pre-configured validators for common call flow node types
 *
 * @module extensions/validation/validators
 * @example
 * import { incomingCallValidator, ivrValidator } from './validators.js';
 *
 * const result = await incomingCallValidator({
 *   phoneNumber: '+1234567890',
 *   extension: 101
 * });
 */

/**
 * Incoming Call Node Validator
 * Validates phone numbers, extensions, and related settings
 *
 * @param {Object} config - Node configuration
 * @param {string} config.phoneNumber - Phone number (required)
 * @param {number} config.extension - Target extension (optional)
 * @param {string} config.ringTimeout - Ring timeout in seconds (optional)
 * @param {Object} context - Validation context with other nodes
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await incomingCallValidator({
 *   phoneNumber: '+1-234-567-8901',
 *   extension: 101,
 *   ringTimeout: 30
 * });
 */
export async function incomingCallValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate phone number
  if (!config.phoneNumber) {
    errors.push('Phone number is required');
    fieldErrors.phoneNumber = ['Phone number is required'];
  } else if (!/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(String(config.phoneNumber).trim())) {
    errors.push('Invalid phone number format');
    fieldErrors.phoneNumber = ['Invalid phone number format'];
  }

  // Validate extension if provided
  if (config.extension !== undefined) {
    if (!Number.isInteger(config.extension) || config.extension < 0 || config.extension > 9999) {
      errors.push('Extension must be a number between 0 and 9999');
      fieldErrors.extension = ['Extension must be a number between 0 and 9999'];
    }
  }

  // Validate ring timeout if provided
  if (config.ringTimeout !== undefined) {
    const timeout = parseInt(config.ringTimeout);
    if (isNaN(timeout) || timeout < 5 || timeout > 300) {
      errors.push('Ring timeout must be between 5 and 300 seconds');
      fieldErrors.ringTimeout = ['Ring timeout must be between 5 and 300 seconds'];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * IVR (Interactive Voice Response) Node Validator
 * Validates menu options, digit routing, and playback settings
 *
 * @param {Object} config - Node configuration
 * @param {string} config.prompt - Voice prompt/message (required)
 * @param {Array} config.menuOptions - Menu options array (required)
 * @param {string} config.recordingUrl - URL to recording (optional)
 * @param {number} config.timeout - Input timeout in seconds (optional)
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await ivrValidator({
 *   prompt: 'Press 1 for sales, 2 for support',
 *   menuOptions: [
 *     { digit: '1', label: 'Sales', target: 'node-123' },
 *     { digit: '2', label: 'Support', target: 'node-456' }
 *   ],
 *   timeout: 10
 * });
 */
export async function ivrValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate prompt
  if (!config.prompt || String(config.prompt).trim().length === 0) {
    errors.push('Prompt message is required');
    fieldErrors.prompt = ['Prompt message is required'];
  } else if (String(config.prompt).length > 500) {
    errors.push('Prompt message too long (max 500 characters)');
    fieldErrors.prompt = ['Prompt message too long (max 500 characters)'];
  }

  // Validate menu options
  if (!Array.isArray(config.menuOptions) || config.menuOptions.length === 0) {
    errors.push('At least one menu option is required');
    fieldErrors.menuOptions = ['At least one menu option is required'];
  } else {
    const digits = new Set();
    const optionErrors = [];

    for (let i = 0; i < config.menuOptions.length; i++) {
      const option = config.menuOptions[i];

      if (!option.digit) {
        optionErrors.push(`Option ${i + 1}: Digit is required`);
      } else if (digits.has(option.digit)) {
        optionErrors.push(`Option ${i + 1}: Duplicate digit '${option.digit}'`);
      } else {
        digits.add(option.digit);
      }

      if (!option.label || String(option.label).trim().length === 0) {
        optionErrors.push(`Option ${i + 1}: Label is required`);
      }

      if (!option.target) {
        optionErrors.push(`Option ${i + 1}: Target node is required`);
      }
    }

    if (optionErrors.length > 0) {
      errors.push(...optionErrors);
      fieldErrors.menuOptions = optionErrors;
    }
  }

  // Validate timeout if provided
  if (config.timeout !== undefined) {
    const timeout = parseInt(config.timeout);
    if (isNaN(timeout) || timeout < 1 || timeout > 60) {
      errors.push('Timeout must be between 1 and 60 seconds');
      fieldErrors.timeout = ['Timeout must be between 1 and 60 seconds'];
    }
  }

  // Validate recording URL if provided
  if (config.recordingUrl) {
    try {
      new URL(config.recordingUrl);
    } catch (e) {
      errors.push('Invalid recording URL');
      fieldErrors.recordingUrl = ['Invalid recording URL'];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Ring Group Node Validator
 * Validates member list, timeout, and routing strategy
 *
 * @param {Object} config - Node configuration
 * @param {Array} config.members - Array of member objects (required)
 * @param {number} config.timeout - Ring timeout in seconds (required)
 * @param {string} config.strategy - Routing strategy: 'simultaneous', 'sequential' (required)
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await ringGroupValidator({
 *   members: [
 *     { id: 'ext-101', type: 'extension', weight: 1 },
 *     { id: 'ext-102', type: 'extension', weight: 1 }
 *   ],
 *   timeout: 30,
 *   strategy: 'simultaneous'
 * });
 */
export async function ringGroupValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate members
  if (!Array.isArray(config.members) || config.members.length === 0) {
    errors.push('At least one member is required');
    fieldErrors.members = ['At least one member is required'];
  } else {
    const memberErrors = [];

    for (let i = 0; i < config.members.length; i++) {
      const member = config.members[i];

      if (!member.id || String(member.id).trim().length === 0) {
        memberErrors.push(`Member ${i + 1}: ID is required`);
      }

      if (!member.type || !['extension', 'queue', 'external'].includes(member.type)) {
        memberErrors.push(`Member ${i + 1}: Valid type required (extension, queue, external)`);
      }

      if (member.weight !== undefined) {
        if (!Number.isInteger(member.weight) || member.weight < 0 || member.weight > 100) {
          memberErrors.push(`Member ${i + 1}: Weight must be 0-100`);
        }
      }
    }

    if (memberErrors.length > 0) {
      errors.push(...memberErrors);
      fieldErrors.members = memberErrors;
    }
  }

  // Validate timeout
  if (config.timeout === undefined) {
    errors.push('Timeout is required');
    fieldErrors.timeout = ['Timeout is required'];
  } else {
    const timeout = parseInt(config.timeout);
    if (isNaN(timeout) || timeout < 5 || timeout > 300) {
      errors.push('Timeout must be between 5 and 300 seconds');
      fieldErrors.timeout = ['Timeout must be between 5 and 300 seconds'];
    }
  }

  // Validate strategy
  if (!config.strategy) {
    errors.push('Routing strategy is required');
    fieldErrors.strategy = ['Routing strategy is required'];
  } else if (!['simultaneous', 'sequential', 'round-robin'].includes(config.strategy)) {
    errors.push('Invalid strategy. Must be: simultaneous, sequential, or round-robin');
    fieldErrors.strategy = ['Invalid strategy. Must be: simultaneous, sequential, or round-robin'];
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Business Hours Node Validator
 * Validates timezone, schedule, and holiday settings
 *
 * @param {Object} config - Node configuration
 * @param {string} config.timezone - Timezone identifier (required)
 * @param {Object} config.schedule - Weekly schedule object (required)
 * @param {Array} config.holidays - Holiday dates array (optional)
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await businessHoursValidator({
 *   timezone: 'America/New_York',
 *   schedule: {
 *     monday: { start: '09:00', end: '17:00', enabled: true },
 *     tuesday: { start: '09:00', end: '17:00', enabled: true }
 *   }
 * });
 */
export async function businessHoursValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate timezone
  if (!config.timezone) {
    errors.push('Timezone is required');
    fieldErrors.timezone = ['Timezone is required'];
  }

  // Validate schedule
  if (!config.schedule || typeof config.schedule !== 'object') {
    errors.push('Schedule object is required');
    fieldErrors.schedule = ['Schedule object is required'];
  } else {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const scheduleErrors = [];

    for (const day of days) {
      if (config.schedule[day]) {
        const dayConfig = config.schedule[day];

        if (dayConfig.enabled && dayConfig.start && dayConfig.end) {
          // Validate time format HH:MM
          if (!/^\d{2}:\d{2}$/.test(dayConfig.start)) {
            scheduleErrors.push(`${day}: Invalid start time format (use HH:MM)`);
          }
          if (!/^\d{2}:\d{2}$/.test(dayConfig.end)) {
            scheduleErrors.push(`${day}: Invalid end time format (use HH:MM)`);
          }

          // Validate start < end
          if (dayConfig.start && dayConfig.end && dayConfig.start >= dayConfig.end) {
            scheduleErrors.push(`${day}: Start time must be before end time`);
          }
        }
      }
    }

    if (scheduleErrors.length > 0) {
      errors.push(...scheduleErrors);
      fieldErrors.schedule = scheduleErrors;
    }
  }

  // Validate holidays if provided
  if (config.holidays && Array.isArray(config.holidays)) {
    const holidayErrors = [];

    for (let i = 0; i < config.holidays.length; i++) {
      const holiday = config.holidays[i];

      if (!holiday.date) {
        holidayErrors.push(`Holiday ${i + 1}: Date is required`);
      } else {
        const date = new Date(holiday.date);
        if (isNaN(date.getTime())) {
          holidayErrors.push(`Holiday ${i + 1}: Invalid date format`);
        }
      }

      if (!holiday.name) {
        holidayErrors.push(`Holiday ${i + 1}: Name is required`);
      }
    }

    if (holidayErrors.length > 0) {
      errors.push(...holidayErrors);
      fieldErrors.holidays = holidayErrors;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Extension Node Validator
 * Validates extension configuration, including directory lookup
 *
 * @param {Object} config - Node configuration
 * @param {string} config.extensionNumber - Extension number (required)
 * @param {string} config.label - Display name (optional)
 * @param {Object} context - Validation context with directory
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await extensionValidator({
 *   extensionNumber: '101',
 *   label: 'Front Desk'
 * }, { directory: extensionDirectory });
 */
export async function extensionValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate extension number
  if (!config.extensionNumber) {
    errors.push('Extension number is required');
    fieldErrors.extensionNumber = ['Extension number is required'];
  } else if (!/^\d{1,4}$/.test(String(config.extensionNumber).trim())) {
    errors.push('Extension must be 1-4 digits');
    fieldErrors.extensionNumber = ['Extension must be 1-4 digits'];
  }

  // Validate label if provided
  if (config.label) {
    if (String(config.label).length > 100) {
      errors.push('Label too long (max 100 characters)');
      fieldErrors.label = ['Label too long (max 100 characters)'];
    }
  }

  // Check if extension exists in directory (if context provided)
  if (context && context.directory && config.extensionNumber) {
    const extensionStr = String(config.extensionNumber).trim();
    const exists = await checkExtensionExists(extensionStr, context.directory);

    if (!exists) {
      errors.push(`Extension ${extensionStr} not found in directory`);
      fieldErrors.extensionNumber = [`Extension ${extensionStr} not found in directory`];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Queue Node Validator
 * Validates queue configuration, members, and routing
 *
 * @param {Object} config - Node configuration
 * @param {string} config.queueId - Queue identifier (required)
 * @param {string} config.queueName - Queue display name (required)
 * @param {Array} config.agents - Agent list (required)
 * @param {number} config.maxWait - Max wait time in seconds (optional)
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 *
 * @example
 * const result = await queueValidator({
 *   queueId: 'sales-queue',
 *   queueName: 'Sales Queue',
 *   agents: [{ id: 'ext-101' }, { id: 'ext-102' }],
 *   maxWait: 300
 * });
 */
export async function queueValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate queue ID
  if (!config.queueId) {
    errors.push('Queue ID is required');
    fieldErrors.queueId = ['Queue ID is required'];
  } else if (!/^[a-z0-9-_]+$/i.test(config.queueId)) {
    errors.push('Queue ID must contain only letters, numbers, hyphens, and underscores');
    fieldErrors.queueId = ['Queue ID must contain only letters, numbers, hyphens, and underscores'];
  }

  // Validate queue name
  if (!config.queueName) {
    errors.push('Queue name is required');
    fieldErrors.queueName = ['Queue name is required'];
  } else if (String(config.queueName).length > 100) {
    errors.push('Queue name too long (max 100 characters)');
    fieldErrors.queueName = ['Queue name too long (max 100 characters)'];
  }

  // Validate agents
  if (!Array.isArray(config.agents) || config.agents.length === 0) {
    errors.push('At least one agent is required');
    fieldErrors.agents = ['At least one agent is required'];
  } else {
    const agentErrors = [];

    for (let i = 0; i < config.agents.length; i++) {
      const agent = config.agents[i];

      if (!agent.id) {
        agentErrors.push(`Agent ${i + 1}: ID is required`);
      }
    }

    if (agentErrors.length > 0) {
      errors.push(...agentErrors);
      fieldErrors.agents = agentErrors;
    }
  }

  // Validate max wait if provided
  if (config.maxWait !== undefined) {
    const maxWait = parseInt(config.maxWait);
    if (isNaN(maxWait) || maxWait < 0 || maxWait > 3600) {
      errors.push('Max wait must be between 0 and 3600 seconds');
      fieldErrors.maxWait = ['Max wait must be between 0 and 3600 seconds'];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Conference Node Validator
 * Validates conference settings and participant rules
 *
 * @param {Object} config - Node configuration
 * @param {string} config.conferenceId - Conference identifier (required)
 * @param {number} config.maxParticipants - Max participants (optional)
 * @param {boolean} config.recordingEnabled - Enable recording (optional)
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 */
export async function conferenceValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate conference ID
  if (!config.conferenceId) {
    errors.push('Conference ID is required');
    fieldErrors.conferenceId = ['Conference ID is required'];
  } else if (!/^[a-z0-9-_]+$/i.test(config.conferenceId)) {
    errors.push('Conference ID must contain only letters, numbers, hyphens, and underscores');
    fieldErrors.conferenceId = ['Conference ID must contain only letters, numbers, hyphens, and underscores'];
  }

  // Validate max participants if provided
  if (config.maxParticipants !== undefined) {
    const max = parseInt(config.maxParticipants);
    if (isNaN(max) || max < 2 || max > 1000) {
      errors.push('Max participants must be between 2 and 1000');
      fieldErrors.maxParticipants = ['Max participants must be between 2 and 1000'];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Check if extension exists in directory (async helper)
 * @private
 * @param {string} extensionNumber - Extension to check
 * @param {Object} directory - Directory object
 * @returns {Promise<boolean>} - True if extension exists
 */
async function checkExtensionExists(extensionNumber, directory) {
  return new Promise((resolve) => {
    // If directory is a function, call it
    if (typeof directory === 'function') {
      try {
        const result = directory(extensionNumber);
        if (result instanceof Promise) {
          result.then(exists => resolve(exists)).catch(() => resolve(false));
        } else {
          resolve(result === true);
        }
      } catch (e) {
        resolve(false);
      }
    } else if (typeof directory === 'object') {
      // If directory is an object, check if extension exists as key
      resolve(extensionNumber in directory);
    } else {
      resolve(false);
    }
  });
}

/**
 * Voice Mail Node Validator
 * @param {Object} config - Node configuration
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 */
export async function voiceMailValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate mailbox extension
  if (!config.mailboxExtension) {
    errors.push('Mailbox extension is required');
    fieldErrors.mailboxExtension = ['Mailbox extension is required'];
  } else if (!/^\d{1,4}$/.test(String(config.mailboxExtension).trim())) {
    errors.push('Mailbox extension must be 1-4 digits');
    fieldErrors.mailboxExtension = ['Mailbox extension must be 1-4 digits'];
  }

  // Validate greeting if provided
  if (config.greetingUrl) {
    try {
      new URL(config.greetingUrl);
    } catch (e) {
      errors.push('Invalid greeting URL');
      fieldErrors.greetingUrl = ['Invalid greeting URL'];
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}

/**
 * Script/Action Node Validator
 * Validates JavaScript/action configuration
 * @param {Object} config - Node configuration
 * @param {Object} context - Validation context
 * @returns {Promise<Object>} - Result {valid, errors, fieldErrors}
 */
export async function actionValidator(config, context = null) {
  const errors = [];
  const fieldErrors = {};

  // Validate action type
  if (!config.actionType) {
    errors.push('Action type is required');
    fieldErrors.actionType = ['Action type is required'];
  }

  // Validate action code/script
  if (config.code) {
    if (String(config.code).length > 5000) {
      errors.push('Code too long (max 5000 characters)');
      fieldErrors.code = ['Code too long (max 5000 characters)'];
    }

    // Basic syntax check for JavaScript
    if (config.actionType === 'javascript') {
      try {
        // Try to parse as function body
        new Function(config.code);
      } catch (e) {
        errors.push(`Invalid JavaScript: ${e.message}`);
        fieldErrors.code = [`Invalid JavaScript: ${e.message}`];
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors
  };
}
