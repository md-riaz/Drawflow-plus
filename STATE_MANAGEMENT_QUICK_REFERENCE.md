# State Management Quick Reference

## Installation

```javascript
import StateManager from './src/extensions/state/index.js';
import HistoryManager from './src/extensions/state/history.js';
```

## Quick Start

### Create a Store
```javascript
const manager = new StateManager();
const appState = manager.createReactiveState('app', {
  initialState: {
    counter: 0,
    user: { name: 'John', email: 'john@example.com' },
    items: []
  }
});
```

### Get Values
```javascript
appState.get();              // Full state object
appState.get('counter');     // 0
appState.get('user.name');   // 'John'
```

### Set Values
```javascript
appState.set('counter', 5);
appState.set('user.name', 'Jane');
appState.set('user.email', 'jane@example.com');
```

### Subscribe to Changes
```javascript
// Single path
appState.subscribe('counter', (newVal, oldVal) => {
  console.log(`Counter changed: ${oldVal} → ${newVal}`);
});

// Nested path
appState.subscribe('user.name', (newVal, oldVal) => {
  console.log(`Name changed to: ${newVal}`);
});

// All changes
appState.subscribe('*', (change) => {
  console.log('Something changed:', change);
});

// Unsubscribe
const unsubscribe = appState.subscribe('counter', callback);
unsubscribe();
```

## Mutations

### Batch Updates
```javascript
appState.batch((state) => {
  state.set('counter', 10);
  state.set('user.name', 'Bob');
  state.set('items', [1, 2, 3]);
  // All treated as one operation
});
```

### Functional Mutation
```javascript
appState.mutate('counter', (val) => val + 1);
appState.mutate('items', (items) => [...items, 4]);
```

### Bulk Update
```javascript
appState.update({
  'counter': 5,
  'user.name': 'Alice',
  'user.email': 'alice@example.com'
});
```

## Snapshots

### Save & Restore
```javascript
// Capture current state
const snapshot = appState.snapshot();

// Make changes
appState.set('counter', 100);
appState.set('user.name', 'Unknown');

// Restore previous state
appState.restore(snapshot);
```

### Check Snapshots
```javascript
const snapshots = appState.getSnapshots();
console.log(`${snapshots.length} snapshots saved`);
```

## Dirty Tracking

### Track Changes
```javascript
appState.set('counter', 10);
appState.set('user.name', 'Bob');

// Check if dirty
appState.isDirty();           // true
appState.isDirty('counter');  // true
appState.isDirty('items');    // false

// Get all dirty paths
const dirty = appState.getDirtyPaths();
// ['counter', 'user.name']
```

### Reset Dirty State
```javascript
appState.resetDirty();           // Reset all
appState.resetDirty('counter');  // Reset specific path
```

## Mutation History

### Track Mutations
```javascript
appState.set('counter', 5);
appState.set('user.name', 'Jane');

const mutations = appState.getMutations();
// [
//   { path: 'counter', oldValue: 0, newValue: 5, timestamp: 1234567890 },
//   { path: 'user.name', oldValue: 'John', newValue: 'Jane', timestamp: 1234567891 }
// ]
```

### Clear History
```javascript
appState.clearMutations();
```

## Undo/Redo

### Setup History
```javascript
import HistoryManager from './src/extensions/state/history.js';

const history = new HistoryManager(appState, {
  maxSize: 100,           // Max history entries
  debounceMs: 300         // Debounce recording
});
```

### Record Snapshots
```javascript
history.record('initial state');

appState.set('counter', 5);
history.record('counter incremented');

appState.set('user.name', 'Jane');
history.record('name updated');
```

### Undo/Redo
```javascript
if (history.canUndo()) {
  history.undo();         // Go back one step
}

if (history.canRedo()) {
  history.redo();         // Go forward one step
}
```

### View History
```javascript
const h = history.getHistory();
// {
//   past: [...],
//   future: [...],
//   current: snapshot
// }

// Get past entries
const past = history.getPast(5);  // Last 5 changes

// Get size info
const size = history.getSize();
// { past: 2, future: 1, total: 3, maxSize: 100 }
```

### Jump to Point
```javascript
history.jumpToPast(0);  // Jump to first change
```

## Adapters

### Vanilla (Default)
```javascript
const manager = new StateManager({
  adapter: 'vanilla'  // Built-in, no dependencies
});
```

### Reef.js Integration
```javascript
const manager = new StateManager({
  adapter: 'reef'     // Requires Reef.js library
});
```

## State Management

### Full State Operations
```javascript
// Get full state
const state = appState.getState();

// Replace entire state
appState.setState({
  counter: 0,
  user: { name: 'New User' }
});

// Clear state
appState.clear();
```

### Utility Methods
```javascript
// Check existence
appState.has('counter');         // true
appState.has('nonexistent');     // false
appState.has('user.name');       // true

// Export state
const copy = appState.getState();
JSON.stringify(copy);             // Serialize
```

## Form Integration Example

```javascript
const formState = manager.createReactiveState('form', {
  initialState: {
    name: '',
    email: '',
    password: '',
    errors: {}
  }
});

// Form input handlers
function onNameChange(e) {
  formState.set('name', e.target.value);
}

// Submit handler
function onSubmit(e) {
  e.preventDefault();
  
  // Track dirty fields
  const dirty = formState.getDirtyPaths();
  console.log('Changed fields:', dirty);
  
  // Validate
  validate(formState.getState());
  
  // Save
  save(formState.getState());
  
  // Reset
  formState.resetDirty();
}

// Enable undo
const history = new HistoryManager(formState);
formState.subscribe('*', () => {
  history.recordDebounced('form change');
});
```

## UI Framework Integration

### Vue-like Usage
```javascript
// In component
const state = manager.createReactiveState('component', {
  initialState: { message: 'Hello' }
});

// Auto-update UI on change
state.subscribe('message', (newVal) => {
  document.getElementById('message').textContent = newVal;
});
```

### React-like Usage
```javascript
function useReactiveState(name, initialState) {
  const state = manager.createReactiveState(name, { initialState });
  
  return [
    state.get(),
    {
      set: (path, value) => state.set(path, value),
      update: (updates) => state.update(updates),
      reset: () => state.setState(initialState)
    }
  ];
}

// Usage in component
const [state, actions] = useReactiveState('todo', { 
  items: [], 
  filter: 'all' 
});
```

## Debugging

### Inspect State
```javascript
console.log('Current state:', appState.getState());
console.log('Dirty paths:', appState.getDirtyPaths());
console.log('Mutations:', appState.getMutations());
console.log('Snapshots:', appState.getSnapshots().length);
```

### Monitor Changes
```javascript
appState.subscribe('*', (change) => {
  console.log('[CHANGE]', change);
});
```

### Export for Analysis
```javascript
const dump = {
  state: appState.getState(),
  dirty: appState.getDirtyPaths(),
  mutations: appState.getMutations(),
  snapshots: appState.getSnapshots().length
};
console.log(JSON.stringify(dump, null, 2));
```

## Best Practices

1. **Use Descriptive Names**
   ```javascript
   manager.createReactiveState('appState', { ... })  // Good
   manager.createReactiveState('s', { ... })         // Bad
   ```

2. **Batch Related Changes**
   ```javascript
   state.batch((s) => {
     s.set('name', 'John');
     s.set('email', 'john@example.com');
   });
   ```

3. **Clean Up Subscriptions**
   ```javascript
   const unsubscribe = state.subscribe('path', callback);
   // Later...
   unsubscribe();
   ```

4. **Use History for Undo Support**
   ```javascript
   history.recordDebounced();  // Auto-save state
   ```

5. **Check Dirty Before Saving**
   ```javascript
   if (state.isDirty()) {
     await save(state.getState());
     state.resetDirty();
   }
   ```

## Configuration

### StateManager Options
```javascript
const manager = new StateManager({
  adapter: 'vanilla',      // Default adapter
  enableHistory: true,     // Enable undo/redo
  trackDirty: true,        // Track dirty state
  snapshotSize: 50         // Max snapshots
});
```

### ReactiveState Options
```javascript
const state = manager.createReactiveState('app', {
  initialState: { ... },
  adapter: 'vanilla',      // Override adapter
  trackDirty: true         // Override dirty tracking
});
```

### HistoryManager Options
```javascript
const history = new HistoryManager(state, {
  maxSize: 100,            // Max history entries
  debounceMs: 300          // Debounce time
});
```

## Performance Tips

1. **Use Batch for Multiple Updates**
   ```javascript
   // Good: Single notification
   state.batch((s) => {
     for (let i = 0; i < 1000; i++) {
       s.set(`items.${i}`, i);
     }
   });

   // Bad: 1000 notifications
   for (let i = 0; i < 1000; i++) {
     state.set(`items.${i}`, i);
   }
   ```

2. **Unsubscribe When Done**
   ```javascript
   const unsubscribe = state.subscribe('path', callback);
   // ... use it ...
   unsubscribe();  // Prevent memory leaks
   ```

3. **Use Specific Paths**
   ```javascript
   state.subscribe('user.name', callback);  // Specific
   state.subscribe('*', callback);          // Wildcard (less efficient)
   ```

## Migration Guide

### From Legacy Store API
```javascript
// Old
const store = manager.createStore('app', { count: 0 });
store.set('count', 5);
store.watch('count', callback);

// New (same interface, plus new features)
const state = manager.createReactiveState('app', { initialState: { count: 0 } });
state.set('count', 5);
state.subscribe('count', callback);

// New features available
state.snapshot();
state.isDirty();
// ... etc
```

## Common Patterns

### Reset to Initial State
```javascript
const initialState = { counter: 0, name: 'John' };
const state = manager.createReactiveState('app', { initialState });

// Reset
state.setState(initialState);
state.resetDirty();
```

### Form Validation
```javascript
const form = manager.createReactiveState('form', {
  initialState: { email: '', errors: {} }
});

form.subscribe('*', () => {
  const { email } = form.getState();
  const errors = validate(email);
  form.set('form.errors', errors);
});
```

### Optimistic Updates
```javascript
const snapshot = state.snapshot();
state.set('status', 'loading');

try {
  await saveToServer(state.getState());
  state.set('status', 'success');
} catch (error) {
  state.restore(snapshot);  // Rollback
  state.set('status', 'error');
}
```

---

For more details, see `PHASE4_IMPLEMENTATION_REPORT.md` and `examples/state-demo.html`
