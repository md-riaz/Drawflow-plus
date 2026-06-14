# Advanced Call Flow Editor - Phase 6 Complete Example

## Overview

The **Advanced Call Flow Editor** is a comprehensive, production-ready demonstration of the Drawflow-Plus enhancement system. It showcases all 5 phases of features working together in a unified, professional application for designing telephone call flows.

**Demo File**: `call-flow-editor.html`

## Features Demonstrated

### Phase 1: Node Type System
- 8 predefined node types: Incoming Call, IVR, Extension, Ring Group, Business Hours, Holiday, Play Audio, Voicemail
- Dynamic node creation and configuration
- Type-specific settings and constraints
- Locked node support (Incoming Call is locked to prevent deletion)

### Phase 2: Settings UI Builder
- Real-time settings panel with reactive forms
- Context-aware field generation based on node type
- Professional form inputs with labels and descriptions
- Live configuration updates

### Phase 3: Validation Framework
- Field-level validation (required fields, type checking)
- Numeric constraints (min/max values)
- Flow-level validation (orphaned node detection)
- Real-time validation feedback with error messages
- Connection status visualization

### Phase 4: Reactive State Binding
- Application state management with `appState` object
- Auto-save functionality with configurable debounce
- Undo/redo history with up to 50 state snapshots
- Version save/restore for call flow configurations
- LocalStorage persistence

### Phase 5: Connection Styling & Metadata API
- Dynamic connection lines with curved paths
- Color-coded connections by node type
- Connection status indicators (valid, warning, error)
- Visual feedback for connection creation and deletion

## Getting Started

### Quick Start

1. Open `call-flow-editor.html` in a modern web browser
2. The editor opens with a pre-built example flow (Incoming Call → IVR → Extension)
3. Drag node types from the left toolbox to the canvas
4. Connect nodes by dragging from output ports to input ports
5. Click nodes to edit their settings in the right panel
6. Use header buttons to export, import, undo, redo, and save versions

### Browser Requirements

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- JavaScript enabled
- LocalStorage enabled (for auto-save and versioning)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CALL FLOW EDITOR                       │
├──────────────┬──────────────────────────┬──────────────────┤
│   TOOLBOX    │       CANVAS             │   SETTINGS       │
│              │                          │   PANEL          │
│ • Incoming   │  ┌──────────┐           │                  │
│ • IVR        │  │ Incoming │           │ Node Config:     │
│ • Extension  │  │   Call   │           │ • Type           │
│ • Ring Group │  └──────────┘           │ • Fields         │
│ • Conditions │        ↓                │ • Validation     │
│ • Media      │  ┌──────────┐           │ • Controls       │
└──────────────┤  │ IVR Menu │           │                  │
               │  └──────────┘           │                  │
               │        ↓                │                  │
               │  ┌──────────┐           │                  │
               │  │Extension │           │                  │
               │  └──────────┘           │                  │
               └──────────────────────────┴──────────────────┘
```

## Node Types

### 1. Incoming Call (Entry Point)
**Icon**: ☎️ | **Color**: Green | **Locked**: Yes

Represents the starting point of a call flow. Locked to prevent accidental deletion.

**Configuration**:
- `name` (string): Display name
- `description` (string): Optional description

**Example Use**:
```javascript
{
  type: 'incoming-call',
  config: {
    name: 'Incoming Call',
    description: 'Main company line'
  }
}
```

### 2. IVR Menu (Interactive Voice Response)
**Icon**: 🎙️ | **Color**: Indigo | **Inputs**: 1 | **Outputs**: Dynamic

Interactive menu presenting options to callers.

**Configuration**:
- `name` (string): Display name
- `prompt` (string): Message played to caller
- `timeout` (number): 1-30 seconds, default: 5
- `maxAttempts` (number): 1-10, default: 3
- `menuOptions` (array): Touch-tone options available

**Example Use**:
```javascript
{
  type: 'ivr',
  config: {
    name: 'Main Menu',
    prompt: 'Press 1 for sales, 2 for support',
    timeout: 5,
    maxAttempts: 3,
    menuOptions: ['1', '2', '3', '0']
  }
}
```

### 3. Extension (Single Routing)
**Icon**: 📱 | **Color**: Amber | **Inputs**: 1 | **Outputs**: 2

Routes calls to a single extension (employee).

**Configuration**:
- `name` (string): Display name
- `extensionNumber` (string): Extension code
- `timeout` (number): 5-120 seconds, default: 30
- `ringTone` (string): Ring tone type

**Example Use**:
```javascript
{
  type: 'extension',
  config: {
    name: 'Sales Rep',
    extensionNumber: '101',
    timeout: 30,
    ringTone: 'default'
  }
}
```

### 4. Ring Group (Multi-Extension Routing)
**Icon**: 👥 | **Color**: Amber | **Inputs**: 1 | **Outputs**: 2

Rings multiple extensions simultaneously or in sequence.

**Configuration**:
- `name` (string): Display name
- `extensions` (array): Extension numbers to ring
- `ringStrategy` (string): 'simultaneous', 'sequential', 'round-robin'
- `timeout` (number): 5-120 seconds, default: 30

**Example Use**:
```javascript
{
  type: 'ring-group',
  config: {
    name: 'Sales Team',
    extensions: ['101', '102', '103'],
    ringStrategy: 'simultaneous',
    timeout: 30
  }
}
```

### 5. Business Hours (Time-Based Routing)
**Icon**: 🕐 | **Color**: Purple | **Inputs**: 1 | **Outputs**: 2

Routes based on current business hours.

**Configuration**:
- `name` (string): Display name
- `timezone` (string): IANA timezone
- `startTime` (string): "HH:MM" format
- `endTime` (string): "HH:MM" format
- `workDays` (array): ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

**Example Use**:
```javascript
{
  type: 'business-hours',
  config: {
    name: 'Business Hours',
    timezone: 'America/New_York',
    startTime: '09:00',
    endTime: '17:00',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  }
}
```

### 6. Holiday (Holiday-Based Routing)
**Icon**: 🎄 | **Color**: Purple | **Inputs**: 1 | **Outputs**: 2

Routes based on holiday dates.

**Configuration**:
- `name` (string): Display name
- `dates` (array): ISO date strings (YYYY-MM-DD)
- `description` (string): Holiday description

**Example Use**:
```javascript
{
  type: 'holiday',
  config: {
    name: 'Holidays',
    dates: ['2025-12-25', '2025-01-01'],
    description: 'Closed for holidays'
  }
}
```

### 7. Play Audio (Media)
**Icon**: 🎵 | **Color**: Cyan | **Inputs**: 1 | **Outputs**: 1

Plays an audio file to the caller.

**Configuration**:
- `name` (string): Display name
- `audioFile` (string): File name/path
- `repeatCount` (number): 1-5 times, default: 1

**Example Use**:
```javascript
{
  type: 'play-audio',
  config: {
    name: 'Play Greeting',
    audioFile: 'greeting.wav',
    repeatCount: 1
  }
}
```

### 8. Voicemail (Call Capture)
**Icon**: 📧 | **Color**: Amber | **Inputs**: 1 | **Outputs**: 1

Captures caller's voicemail message.

**Configuration**:
- `name` (string): Display name
- `mailbox` (string): Mailbox number
- `greeting` (string): Greeting message
- `maxDuration` (number): 30-600 seconds, default: 300

**Example Use**:
```javascript
{
  type: 'voicemail',
  config: {
    name: 'Leave Message',
    mailbox: '100',
    greeting: 'Please leave a message',
    maxDuration: 300
  }
}
```

## User Interface Guide

### Header Controls

| Button | Function | Shortcut |
|--------|----------|----------|
| **Export** | Download flow as JSON | Ctrl+E |
| **Import** | Load flow from JSON | Ctrl+I |
| **Undo** | Revert last change | Ctrl+Z |
| **Redo** | Reapply last change | Ctrl+Y |
| **Save Version** | Create snapshot | Ctrl+S |
| **Clear All** | Remove all nodes | ⚠️ Confirmation |

### Canvas Interactions

#### Creating Nodes
1. Drag node type from toolbox
2. Drop on canvas
3. Node appears at drop location
4. Auto-snaps to 40px grid

#### Moving Nodes
1. Click and drag node
2. Nodes update position in real-time
3. Connections redraw dynamically
4. Auto-save triggers on release

#### Connecting Nodes
1. Drag from output port (bottom)
2. Release on input port (top)
3. Connection created with visual line
4. Connections styled by source node type

#### Deleting Nodes
1. Hover over node
2. Click "×" button (top-right)
3. Node and connections removed
4. Locked nodes cannot be deleted

#### Editing Settings
1. Click node on canvas
2. Settings appear in right panel
3. Modify configuration fields
4. Click "Save Settings" button
5. Validation feedback appears immediately

### Settings Panel

**Statistics**:
- Shows total node count
- Shows total connection count
- Auto-updates on changes

**Configuration Fields**:
- Generated dynamically per node type
- Type-appropriate inputs
- Real-time validation
- Helpful error messages

**Validation Feedback**:
- Red error indicators for required fields
- Warning icons for invalid ranges
- Success messages on save

**Action Buttons**:
- ✓ **Save Settings**: Persist node configuration
- ✕ **Delete Node**: Remove node and connections

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save Version |
| `Ctrl+E` | Export |
| `Ctrl+I` | Import |
| `Delete` | Delete selected node |
| `Escape` | Deselect node / Close modal |

## API Reference

### Application State

```javascript
appState = {
  nodes: {
    'node_id': {
      id: 'node_id',
      type: 'extension',
      x: 100,
      y: 200,
      config: { /* node configuration */ }
    }
  },
  edges: [
    { from: 'node_1', to: 'node_2', status: 'valid' }
  ],
  selectedNode: 'node_id' | null,
  validationErrors: {
    'node_id': ['error message']
  },
  history: [ /* state snapshots */ ],
  historyIndex: 0,
  versions: [ /* saved versions */ ]
}
```

### Key Functions

#### Node Management

```javascript
// Create a new node
createNode(type, x, y) → nodeId

// Delete a node
deleteNode(nodeId) → void

// Select a node
selectNode(nodeId) → void

// Render canvas
renderCanvas() → void
```

#### Validation

```javascript
// Validate single node
validateNode(nodeId) → { valid: boolean, errors: [] }

// Validate entire flow
validateFlow() → { nodeId: [errors] }
```

#### State Management

```javascript
// Undo last action
undo() → void

// Redo last action
redo() → void

// Save to history
saveHistory() → void

// Auto-save to localStorage
autoSaveFlow() → void
```

#### Export/Import

```javascript
// Export flow as JSON
exportFlow() → JSON string

// Import from JSON
importFlow(json) → boolean

// Save version
saveVersion() → void
```

## Example Workflows

### Workflow 1: Simple Department Routing

**Scenario**: Route calls to different departments based on caller selection.

**Steps**:
1. Start with Incoming Call node
2. Add IVR Menu: "Press 1 for Sales, 2 for Support"
3. Add Ring Group for Sales (extensions: 101, 102, 103)
4. Add Ring Group for Support (extensions: 201, 202, 203)
5. Connect IVR option 1 → Sales Ring Group
6. Connect IVR option 2 → Support Ring Group
7. Export and deploy

**Configuration**:
```json
{
  "nodes": {
    "incoming": {"type": "incoming-call", "x": 100, "y": 100},
    "ivr": {"type": "ivr", "x": 100, "y": 250},
    "sales": {"type": "ring-group", "x": 300, "y": 400},
    "support": {"type": "ring-group", "x": 500, "y": 400}
  },
  "edges": [
    {"from": "incoming", "to": "ivr"},
    {"from": "ivr", "to": "sales"},
    {"from": "ivr", "to": "support"}
  ]
}
```

### Workflow 2: Business Hours with After-Hours

**Scenario**: Route to departments during business hours, voicemail after hours.

**Steps**:
1. Start with Incoming Call
2. Add Business Hours check
3. Connect "yes" branch to Sales Ring Group
4. Connect "no" branch to Voicemail
5. Configure hours and days
6. Test with different times

### Workflow 3: Holiday Handling

**Scenario**: Special routing on holidays.

**Steps**:
1. Start with Incoming Call
2. Add Holiday check
3. Connect "yes" branch to Holiday message + Voicemail
4. Connect "no" branch to normal routing
5. Add specific dates (Christmas, New Year, etc.)

### Workflow 4: Multi-Level IVR

**Scenario**: Two-level menu system.

**Steps**:
1. Incoming Call → Main IVR (1-3)
2. Option 1 → Sales Submenu (1: New, 2: Existing)
3. Sales New → Sales team
4. Sales Existing → VIP sales team
5. Option 2 → Support (single extension)
6. Option 3 → Billing (single extension)

## Best Practices

### Design Principles

1. **Keep it Simple**: Limit IVR menus to 3-4 options
2. **Logical Flow**: Group related routing paths
3. **Timeout Handling**: Always provide fallback paths
4. **Clear Labels**: Use descriptive node names
5. **Validation**: Check for orphaned nodes before deployment

### Performance Tips

1. **Limit Connections**: Large flows (50+ nodes) may scroll slowly
2. **Name Consistency**: Use same names for same departments
3. **Documentation**: Use node descriptions for clarity
4. **Versioning**: Save frequently with meaningful version names
5. **Testing**: Export and validate JSON before deployment

### Common Patterns

#### Pattern 1: Escalation Chain
```
IVR → Extension 1 (no answer) → Extension 2 → Voicemail
```

#### Pattern 2: Time-Based Routing
```
Business Hours Check → Business hours: ring group
                    → After hours: voicemail
```

#### Pattern 3: Skills-Based Routing
```
IVR → Ring Group (skill 1) → Ring Group (skill 2) → Voicemail
```

#### Pattern 4: VIP Treatment
```
Incoming → IVR → If VIP → Priority queue
               → If normal → Regular queue
```

## Troubleshooting

### Nodes Not Connecting

**Problem**: Can't connect output to input port
**Solution**: 
- Ensure you're dragging from output (bottom) to input (top)
- Check node types support connections (some nodes have limited outputs)
- Try dragging to center of target node

### Settings Not Saving

**Problem**: Configuration changes don't persist
**Solution**:
- Click "Save Settings" button after editing
- Check browser console for errors
- Ensure JavaScript is enabled
- Clear browser cache and reload

### Validation Errors

**Problem**: Red error indicators on nodes
**Solution**:
- Click node to view errors in settings panel
- Fill in required fields marked with *
- Check numeric ranges (min/max values)
- Ensure all fields are valid before exporting

### Export/Import Issues

**Problem**: JSON import fails or loses data
**Solution**:
- Validate JSON syntax (use jsonlint.com)
- Ensure all required node fields are present
- Check for circular references
- Start fresh if corrupted: use Clear All button

### Performance Issues

**Problem**: Slow UI or lag when dragging
**Solution**:
- Reduce number of nodes (> 50 may be slow)
- Close other browser tabs
- Clear browser cache
- Try different browser

## File Reference

### call-flow-editor.html
Main application file (~2,000 LOC)
- Complete UI with all controls
- Canvas rendering and interaction
- Node management and configuration
- Export/import functionality
- State management and history

### call-flow-data.js
Mock data and helper functions (~500 LOC)
- IVR menu definitions
- Extension directory
- Ring group templates
- Business hours definitions
- Holiday schedules
- Audio file library
- Sample call flows

### call-flow-styles.css
Professional styling (~400 LOC)
- Layout and grid system
- Component styling
- Node type colors
- Responsive design
- Dark/light theme support
- Animations and transitions

## Advanced Features

### Local Storage

Auto-save configuration:
```javascript
const CONFIG = {
  autoSaveInterval: 3000,  // 3 seconds
  nodeWidth: 160,
  nodeHeight: 120,
  gridSize: 40,            // Grid snap size
  maxHistory: 50           // Undo/redo limit
};
```

### Connection Styling

Color-coded by source node type:
- Incoming Call → Green lines
- IVR Menu → Indigo lines
- Extension → Amber lines
- Ring Group → Amber lines
- Business Hours → Purple lines
- Holiday → Purple lines
- Play Audio → Cyan lines
- Voicemail → Amber lines

### Responsive Design

- **Desktop** (1200px+): Side-by-side layout
- **Tablet** (768-1199px): Stacked layout
- **Mobile** (<768px): Full-width stacked

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✓ Full |
| Firefox | 88+ | ✓ Full |
| Safari | 14+ | ✓ Full |
| Edge | 90+ | ✓ Full |
| Opera | 76+ | ✓ Full |
| IE 11 | Any | ✗ Not supported |

## Known Limitations

1. **No server persistence**: Uses only LocalStorage (cleared on cache clear)
2. **No collaboration**: Single user only
3. **No real-time validation**: Backend validation required
4. **Limited to 8 node types**: Can be extended with custom types
5. **SVG connections**: May have performance issues with 100+ nodes

## Future Enhancements

Potential additions to the complete system:

- [ ] Custom node type creation UI
- [ ] Drag-to-pan canvas
- [ ] Node duplication
- [ ] Search/filter nodes
- [ ] Node comments/annotations
- [ ] Flow simulation/testing
- [ ] Export to Asterisk/Freeswitch config
- [ ] Import from existing systems
- [ ] Real-time collaboration
- [ ] Server-side persistence
- [ ] Advanced analytics
- [ ] A/B testing flows

## Support & Issues

For questions or issues:

1. Check the Troubleshooting section
2. Review example workflows
3. Inspect browser console (F12)
4. Check LocalStorage: `localStorage.getItem('callflow_autosave')`
5. Review validation errors in settings panel

## License

This example is part of the Drawflow-Plus enhancement project.

---

**Last Updated**: June 2025
**Phase**: 6 - Complete Example
**Status**: Production Ready
