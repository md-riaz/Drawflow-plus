/**
 * Call Flow Editor - Mock Data and Definitions
 * Phase 6: Complete Example Data
 *
 * Provides realistic mock data for the call flow editor including:
 * - IVR menu configurations
 * - Extension directories
 * - Ring group templates
 * - Business hours definitions
 * - Holiday schedules
 * - Audio files library
 * - Sample call flow configurations
 */

// ============================================================================
// IVR MENU DEFINITIONS
// ============================================================================

const IVR_MENUS = {
    'main-menu': {
        name: 'Main Menu',
        description: 'Company main IVR menu',
        prompt: 'Thank you for calling. Press 1 for sales, 2 for support, 3 for billing, or 0 for operator',
        timeout: 5,
        maxAttempts: 3,
        menuOptions: {
            '1': 'Sales Department',
            '2': 'Technical Support',
            '3': 'Billing Department',
            '4': 'Human Resources',
            '5': 'Executive Office',
            '0': 'Operator',
            '*': 'Repeat Menu',
            '#': 'Main Menu',
        },
    },
    'sales-menu': {
        name: 'Sales Menu',
        description: 'Sales department routing menu',
        prompt: 'Press 1 for new customers, 2 for existing customers, 3 for product information',
        timeout: 5,
        maxAttempts: 3,
        menuOptions: {
            '1': 'New Customers',
            '2': 'Existing Customers',
            '3': 'Product Information',
            '0': 'Back to Main Menu',
        },
    },
    'support-menu': {
        name: 'Support Menu',
        description: 'Technical support routing menu',
        prompt: 'Press 1 for account issues, 2 for technical issues, 3 for billing inquiries',
        timeout: 5,
        maxAttempts: 3,
        menuOptions: {
            '1': 'Account Issues',
            '2': 'Technical Issues',
            '3': 'Billing Inquiries',
            '0': 'Back to Main Menu',
        },
    },
};

// ============================================================================
// EXTENSION DIRECTORY
// ============================================================================

const EXTENSIONS = {
    '100': { name: 'Main Reception', department: 'Reception', email: 'reception@company.com' },
    '101': { name: 'Sales Lead', department: 'Sales', email: 'sales@company.com' },
    '102': { name: 'Sales Associate 1', department: 'Sales', email: 'sales1@company.com' },
    '103': { name: 'Sales Associate 2', department: 'Sales', email: 'sales2@company.com' },
    '201': { name: 'Technical Support Lead', department: 'Support', email: 'support@company.com' },
    '202': { name: 'Support Engineer 1', department: 'Support', email: 'engineer1@company.com' },
    '203': { name: 'Support Engineer 2', department: 'Support', email: 'engineer2@company.com' },
    '204': { name: 'Support Engineer 3', department: 'Support', email: 'engineer3@company.com' },
    '301': { name: 'Billing Manager', department: 'Billing', email: 'billing@company.com' },
    '302': { name: 'Billing Specialist', department: 'Billing', email: 'billing.specialist@company.com' },
    '401': { name: 'HR Manager', department: 'HR', email: 'hr@company.com' },
    '500': { name: 'Executive Assistant', department: 'Executive', email: 'executive@company.com' },
};

// ============================================================================
// RING GROUP TEMPLATES
// ============================================================================

const RING_GROUPS = {
    'sales-team': {
        name: 'Sales Team',
        description: 'All available sales representatives',
        extensions: ['101', '102', '103'],
        ringStrategy: 'simultaneous',
        timeout: 30,
        ringTone: 'default',
    },
    'support-team': {
        name: 'Support Team',
        description: 'All available support engineers',
        extensions: ['201', '202', '203', '204'],
        ringStrategy: 'round-robin',
        timeout: 45,
        ringTone: 'urgent',
    },
    'billing-team': {
        name: 'Billing Team',
        description: 'Billing and accounting',
        extensions: ['301', '302'],
        ringStrategy: 'sequential',
        timeout: 30,
        ringTone: 'default',
    },
    'executive': {
        name: 'Executive Office',
        description: 'Executive and assistant',
        extensions: ['500'],
        ringStrategy: 'simultaneous',
        timeout: 25,
        ringTone: 'default',
    },
};

// ============================================================================
// BUSINESS HOURS DEFINITIONS
// ============================================================================

const BUSINESS_HOURS = {
    'standard': {
        name: 'Standard Business Hours',
        timezone: 'America/New_York',
        startTime: '09:00',
        endTime: '17:00',
        workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    'extended': {
        name: 'Extended Hours',
        timezone: 'America/New_York',
        startTime: '08:00',
        endTime: '18:00',
        workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    '24-7': {
        name: '24/7 Support',
        timezone: 'UTC',
        startTime: '00:00',
        endTime: '23:59',
        workDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    'weekend': {
        name: 'Weekend Hours',
        timezone: 'America/New_York',
        startTime: '10:00',
        endTime: '16:00',
        workDays: ['Sat', 'Sun'],
    },
};

// ============================================================================
// HOLIDAY DEFINITIONS
// ============================================================================

const HOLIDAYS = {
    'us-holidays-2025': {
        name: 'US Holidays 2025',
        dates: [
            '2025-01-01',  // New Year's Day
            '2025-01-20',  // MLK Jr. Day
            '2025-02-17',  // Presidents Day
            '2025-03-17',  // St. Patrick's Day
            '2025-04-20',  // Easter Sunday
            '2025-05-26',  // Memorial Day
            '2025-06-19',  // Juneteenth
            '2025-07-04',  // Independence Day
            '2025-09-01',  // Labor Day
            '2025-10-13',  // Columbus Day
            '2025-11-11',  // Veterans Day
            '2025-11-27',  // Thanksgiving
            '2025-12-25',  // Christmas Day
        ],
        description: 'US Federal Holidays',
    },
    'company-holidays': {
        name: 'Company Holidays',
        dates: [
            '2025-01-01',
            '2025-07-04',
            '2025-11-27',
            '2025-11-28',
            '2025-12-25',
            '2025-12-26',
        ],
        description: 'Company-specific closures',
    },
};

// ============================================================================
// AUDIO FILES LIBRARY
// ============================================================================

const AUDIO_FILES = {
    'greeting.wav': {
        name: 'Main Greeting',
        duration: 8,
        path: '/audio/greeting.wav',
    },
    'welcome.wav': {
        name: 'Welcome Message',
        duration: 6,
        path: '/audio/welcome.wav',
    },
    'main-menu.wav': {
        name: 'Main Menu Options',
        duration: 12,
        path: '/audio/main-menu.wav',
    },
    'sales-prompt.wav': {
        name: 'Sales Department Prompt',
        duration: 5,
        path: '/audio/sales-prompt.wav',
    },
    'support-prompt.wav': {
        name: 'Support Department Prompt',
        duration: 5,
        path: '/audio/support-prompt.wav',
    },
    'billing-prompt.wav': {
        name: 'Billing Department Prompt',
        duration: 5,
        path: '/audio/billing-prompt.wav',
    },
    'hold-music.wav': {
        name: 'Hold Music',
        duration: 180,
        path: '/audio/hold-music.wav',
    },
    'voicemail-intro.wav': {
        name: 'Voicemail Introduction',
        duration: 3,
        path: '/audio/voicemail-intro.wav',
    },
    'after-hours.wav': {
        name: 'After Hours Message',
        duration: 8,
        path: '/audio/after-hours.wav',
    },
    'holiday-message.wav': {
        name: 'Holiday Closure Message',
        duration: 10,
        path: '/audio/holiday-message.wav',
    },
};

// ============================================================================
// SAMPLE CALL FLOWS
// ============================================================================

const SAMPLE_FLOWS = {
    'simple-routing': {
        name: 'Simple Routing',
        description: 'Basic call routing to departments',
        nodes: {
            'node_incoming': {
                id: 'node_incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: {
                    name: 'Incoming Call',
                    description: 'Receive incoming calls',
                },
            },
            'node_ivr': {
                id: 'node_ivr',
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Main Menu',
                    prompt: 'Press 1 for sales, 2 for support',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2', '0'],
                },
            },
            'node_sales': {
                id: 'node_sales',
                type: 'ring-group',
                x: 250,
                y: 400,
                config: {
                    name: 'Sales Team',
                    extensions: ['101', '102', '103'],
                    ringStrategy: 'simultaneous',
                    timeout: 30,
                    ringTone: 'default',
                },
            },
            'node_support': {
                id: 'node_support',
                type: 'ring-group',
                x: 450,
                y: 400,
                config: {
                    name: 'Support Team',
                    extensions: ['201', '202', '203'],
                    ringStrategy: 'round-robin',
                    timeout: 45,
                    ringTone: 'default',
                },
            },
        },
        edges: [
            { from: 'node_incoming', to: 'node_ivr', status: 'valid' },
            { from: 'node_ivr', to: 'node_sales', status: 'valid' },
            { from: 'node_ivr', to: 'node_support', status: 'valid' },
        ],
    },
    'business-hours-routing': {
        name: 'Business Hours Routing',
        description: 'Route based on business hours',
        nodes: {
            'node_incoming': {
                id: 'node_incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: {
                    name: 'Incoming Call',
                    description: '',
                },
            },
            'node_hours': {
                id: 'node_hours',
                type: 'business-hours',
                x: 100,
                y: 250,
                config: {
                    name: 'Business Hours Check',
                    timezone: 'America/New_York',
                    startTime: '09:00',
                    endTime: '17:00',
                    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                },
            },
            'node_business': {
                id: 'node_business',
                type: 'ring-group',
                x: 250,
                y: 400,
                config: {
                    name: 'Business Hours Queue',
                    extensions: ['100', '101', '102'],
                    ringStrategy: 'simultaneous',
                    timeout: 30,
                    ringTone: 'default',
                },
            },
            'node_afterhours': {
                id: 'node_afterhours',
                type: 'voicemail',
                x: 450,
                y: 400,
                config: {
                    name: 'After Hours Voicemail',
                    mailbox: '100',
                    greeting: 'Sorry, we are closed. Please leave a message.',
                    maxDuration: 300,
                },
            },
        },
        edges: [
            { from: 'node_incoming', to: 'node_hours', status: 'valid' },
            { from: 'node_hours', to: 'node_business', status: 'valid' },
            { from: 'node_hours', to: 'node_afterhours', status: 'valid' },
        ],
    },
    'complex-ivr': {
        name: 'Complex IVR Flow',
        description: 'Multi-level IVR with routing',
        nodes: {
            'node_incoming': {
                id: 'node_incoming',
                type: 'incoming-call',
                x: 100,
                y: 100,
                config: {
                    name: 'Incoming Call',
                    description: '',
                },
            },
            'node_main_ivr': {
                id: 'node_main_ivr',
                type: 'ivr',
                x: 100,
                y: 250,
                config: {
                    name: 'Main Menu',
                    prompt: 'Press 1 for sales, 2 for support, 3 for billing',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2', '3', '0'],
                },
            },
            'node_sales_ivr': {
                id: 'node_sales_ivr',
                type: 'ivr',
                x: 300,
                y: 250,
                config: {
                    name: 'Sales Submenu',
                    prompt: 'Press 1 for new customers, 2 for existing',
                    timeout: 5,
                    maxAttempts: 3,
                    menuOptions: ['1', '2', '0'],
                },
            },
            'node_sales': {
                id: 'node_sales',
                type: 'ring-group',
                x: 300,
                y: 400,
                config: {
                    name: 'Sales Department',
                    extensions: ['101', '102', '103'],
                    ringStrategy: 'simultaneous',
                    timeout: 30,
                    ringTone: 'default',
                },
            },
            'node_support': {
                id: 'node_support',
                type: 'ring-group',
                x: 500,
                y: 400,
                config: {
                    name: 'Support Department',
                    extensions: ['201', '202', '203'],
                    ringStrategy: 'round-robin',
                    timeout: 45,
                    ringTone: 'default',
                },
            },
            'node_billing': {
                id: 'node_billing',
                type: 'extension',
                x: 700,
                y: 400,
                config: {
                    name: 'Billing Manager',
                    extensionNumber: '301',
                    timeout: 30,
                    ringTone: 'default',
                },
            },
        },
        edges: [
            { from: 'node_incoming', to: 'node_main_ivr', status: 'valid' },
            { from: 'node_main_ivr', to: 'node_sales_ivr', status: 'valid' },
            { from: 'node_main_ivr', to: 'node_support', status: 'valid' },
            { from: 'node_main_ivr', to: 'node_billing', status: 'valid' },
            { from: 'node_sales_ivr', to: 'node_sales', status: 'valid' },
        ],
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get extension details by number
 * @param {string} number - Extension number
 * @returns {Object|null} Extension details or null
 */
function getExtension(number) {
    return EXTENSIONS[number] || null;
}

/**
 * Get all extensions in a department
 * @param {string} department - Department name
 * @returns {Array} Array of extensions in department
 */
function getExtensionsByDepartment(department) {
    return Object.entries(EXTENSIONS)
        .filter(([_, ext]) => ext.department === department)
        .map(([num, ext]) => ({ number: num, ...ext }));
}

/**
 * Get ring group extensions with details
 * @param {string} groupKey - Ring group key
 * @returns {Array} Array of extension details
 */
function getRingGroupExtensions(groupKey) {
    const group = RING_GROUPS[groupKey];
    if (!group) return [];
    return group.extensions.map(num => ({
        number: num,
        ...EXTENSIONS[num],
    }));
}

/**
 * Get audio file by key
 * @param {string} key - Audio file key
 * @returns {Object|null} Audio file details or null
 */
function getAudioFile(key) {
    return AUDIO_FILES[key] || null;
}

/**
 * Get all audio files for a category
 * @param {string} category - Category filter (optional)
 * @returns {Array} Array of audio files
 */
function getAudioFiles(category = null) {
    return Object.entries(AUDIO_FILES)
        .map(([key, file]) => ({ key, ...file }))
        .filter(file => !category || file.name.toLowerCase().includes(category.toLowerCase()));
}

/**
 * Get business hours by key
 * @param {string} key - Business hours key
 * @returns {Object|null} Business hours or null
 */
function getBusinessHours(key) {
    return BUSINESS_HOURS[key] || null;
}

/**
 * Get holidays by key
 * @param {string} key - Holiday definition key
 * @returns {Object|null} Holiday definition or null
 */
function getHolidays(key) {
    return HOLIDAYS[key] || null;
}

/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @param {string} holidayKey - Holiday definition key
 * @returns {boolean} True if date is a holiday
 */
function isHoliday(date, holidayKey) {
    const holidays = HOLIDAYS[holidayKey];
    if (!holidays) return false;

    const dateStr = date.toISOString().split('T')[0];
    return holidays.dates.includes(dateStr);
}

/**
 * Get sample flow by key
 * @param {string} key - Sample flow key
 * @returns {Object|null} Sample flow or null
 */
function getSampleFlow(key) {
    return SAMPLE_FLOWS[key] || null;
}

/**
 * Get all available sample flows
 * @returns {Array} Array of available sample flows
 */
function getAvailableSampleFlows() {
    return Object.entries(SAMPLE_FLOWS)
        .map(([key, flow]) => ({ key, ...flow }));
}

/**
 * Create a flow from a sample
 * @param {string} sampleKey - Sample flow key
 * @returns {Object} Flow configuration
 */
function createFlowFromSample(sampleKey) {
    const sample = SAMPLE_FLOWS[sampleKey];
    if (!sample) return null;

    return {
        name: sample.name,
        description: sample.description,
        nodes: JSON.parse(JSON.stringify(sample.nodes)),
        edges: JSON.parse(JSON.stringify(sample.edges)),
        createdAt: new Date().toISOString(),
    };
}

// Export for use in Node.js or as CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IVR_MENUS,
        EXTENSIONS,
        RING_GROUPS,
        BUSINESS_HOURS,
        HOLIDAYS,
        AUDIO_FILES,
        SAMPLE_FLOWS,
        getExtension,
        getExtensionsByDepartment,
        getRingGroupExtensions,
        getAudioFile,
        getAudioFiles,
        getBusinessHours,
        getHolidays,
        isHoliday,
        getSampleFlow,
        getAvailableSampleFlows,
        createFlowFromSample,
    };
}
