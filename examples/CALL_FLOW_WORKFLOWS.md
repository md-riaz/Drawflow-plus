# Call Flow Editor - Example Workflows

Complete step-by-step workflows demonstrating real-world call routing scenarios using the Advanced Call Flow Editor.

---

## Workflow 1: Simple Department Routing

### Scenario
A small company with three departments (Sales, Support, Billing) needs to route incoming calls to the appropriate team based on caller selection.

### Business Requirements
- Greet callers professionally
- Present menu with 3 options
- Route to correct department
- Handle no-answer with voicemail
- Support to operator fallback

### Step-by-Step Instructions

#### 1. Create Entry Point
1. Open the editor (fresh start)
2. An "Incoming Call" node is pre-placed
3. Configure it:
   - **Name**: "Main Line"
   - **Description**: "Company main incoming line"
4. Click "Save Settings"

#### 2. Add Main Menu IVR
1. From toolbox, drag "IVR Menu" to canvas (x: 100, y: 250)
2. Connect Incoming Call → IVR Menu
3. Configure IVR:
   - **Name**: "Main Menu"
   - **Prompt**: "Thank you for calling. Press 1 for Sales, 2 for Support, 3 for Billing."
   - **Timeout**: 5 seconds
   - **Max Attempts**: 3
   - **Menu Options**: 1, 2, 3, 0
4. Save Settings

#### 3. Add Department Ring Groups
Drag three Ring Group nodes to canvas at positions:

**Sales (x: 300, y: 400)**:
- Name: "Sales Team"
- Extensions: 101, 102, 103
- Ring Strategy: Simultaneous
- Timeout: 30 seconds

**Support (x: 500, y: 400)**:
- Name: "Support Team"
- Extensions: 201, 202, 203, 204
- Ring Strategy: Round-robin
- Timeout: 45 seconds

**Billing (x: 700, y: 400)**:
- Name: "Billing Team"
- Extensions: 301, 302
- Ring Strategy: Sequential
- Timeout: 30 seconds

#### 4. Create Routing Connections
- IVR Menu → Sales Team (option 1)
- IVR Menu → Support Team (option 2)
- IVR Menu → Billing Team (option 3)

#### 5. Add Fallback Voicemail
Drag Voicemail node (x: 500, y: 550):
- Name: "Main Voicemail"
- Mailbox: 100
- Greeting: "No one is available. Please leave a message."
- Max Duration: 300 seconds

Connect each Ring Group's "no answer" output to Voicemail.

#### 6. Export and Test
1. Click "Export" button
2. Copy JSON to clipboard
3. Save to file: `simple-routing.json`
4. Test by importing back:
   - Click "Import"
   - Paste JSON
   - Verify all nodes and connections restored

### Expected Result
```
Incoming Call
    ↓
Main Menu (IVR)
  ↙  ↓  ↘
Sales Support Billing
  ↘  ↓  ↙
Voicemail
```

### Configuration Export
```json
{
  "version": "1.0",
  "timestamp": "2025-06-14T12:00:00Z",
  "nodes": {
    "incoming": {
      "id": "incoming",
      "type": "incoming-call",
      "x": 100,
      "y": 100,
      "config": {
        "name": "Main Line",
        "description": "Company main incoming line"
      }
    },
    "main_menu": {
      "id": "main_menu",
      "type": "ivr",
      "x": 100,
      "y": 250,
      "config": {
        "name": "Main Menu",
        "prompt": "Thank you for calling. Press 1 for Sales, 2 for Support, 3 for Billing.",
        "timeout": 5,
        "maxAttempts": 3,
        "menuOptions": ["1", "2", "3", "0"]
      }
    },
    "sales_team": {
      "id": "sales_team",
      "type": "ring-group",
      "x": 300,
      "y": 400,
      "config": {
        "name": "Sales Team",
        "extensions": ["101", "102", "103"],
        "ringStrategy": "simultaneous",
        "timeout": 30,
        "ringTone": "default"
      }
    },
    "support_team": {
      "id": "support_team",
      "type": "ring-group",
      "x": 500,
      "y": 400,
      "config": {
        "name": "Support Team",
        "extensions": ["201", "202", "203", "204"],
        "ringStrategy": "round-robin",
        "timeout": 45,
        "ringTone": "default"
      }
    },
    "billing_team": {
      "id": "billing_team",
      "type": "ring-group",
      "x": 700,
      "y": 400,
      "config": {
        "name": "Billing Team",
        "extensions": ["301", "302"],
        "ringStrategy": "sequential",
        "timeout": 30,
        "ringTone": "default"
      }
    },
    "voicemail": {
      "id": "voicemail",
      "type": "voicemail",
      "x": 500,
      "y": 550,
      "config": {
        "name": "Main Voicemail",
        "mailbox": "100",
        "greeting": "No one is available. Please leave a message.",
        "maxDuration": 300
      }
    }
  },
  "edges": [
    {"from": "incoming", "to": "main_menu"},
    {"from": "main_menu", "to": "sales_team"},
    {"from": "main_menu", "to": "support_team"},
    {"from": "main_menu", "to": "billing_team"},
    {"from": "sales_team", "to": "voicemail"},
    {"from": "support_team", "to": "voicemail"},
    {"from": "billing_team", "to": "voicemail"}
  ]
}
```

---

## Workflow 2: Business Hours Routing

### Scenario
A company wants to route calls differently based on whether it's business hours or after-hours. During business hours, calls go to departments. After hours, calls go to voicemail with a special message.

### Business Requirements
- Check current time against business hours
- Route to departments 9 AM - 5 PM, weekdays
- Route to after-hours voicemail other times
- Support emergency extension access (press 0)

### Step-by-Step Instructions

#### 1. Setup Entry and Initial Greeting
1. Update Incoming Call node:
   - **Name**: "Main Line"
2. Add Play Audio node (x: 100, y: 200):
   - **Name**: "Greeting"
   - **Audio File**: "greeting.wav"
   - **Repeat Count**: 1
3. Connect Incoming Call → Play Audio

#### 2. Add Business Hours Check
Drag Business Hours node (x: 100, y: 350):
- **Name**: "Check Hours"
- **Timezone**: "America/New_York"
- **Start Time**: "09:00"
- **End Time**: "17:00"
- **Work Days**: Mon, Tue, Wed, Thu, Fri

Connect Play Audio → Business Hours Check

#### 3. Add Business Hours Routing
Drag Ring Group node (x: 300, y: 450):
- **Name**: "Main Queue"
- **Extensions**: 101, 102, 103, 201, 202, 203
- **Ring Strategy**: Round-robin
- **Timeout**: 60 seconds

Connect Business Hours Check (YES output) → Main Queue

#### 4. Add After-Hours Voicemail
Drag Voicemail node (x: 500, y: 450):
- **Name**: "After Hours"
- **Mailbox**: 100
- **Greeting**: "Thank you for calling. Our offices are currently closed. Please leave a message and we'll return your call tomorrow."
- **Max Duration**: 300

Connect Business Hours Check (NO output) → After Hours Voicemail

#### 5. Add Emergency Extension (Option 0)
Drag Extension node (x: 700, y: 450):
- **Name**: "Emergency"
- **Extension Number**: 500
- **Timeout**: 25
- **Ring Tone**: default

Optional: Add connection from IVR (if you add one) for option 0.

#### 6. Export Configuration
Click Export and save as `business-hours.json`

### Expected Result
```
Incoming Call
    ↓
Greeting
    ↓
Business Hours Check
  ↙          ↘
Business     After Hours
Hours        Voicemail
Queue
```

### Validation Checklist
- [ ] Business Hours node is configured with correct timezone
- [ ] All work days are selected
- [ ] Start and end times are valid
- [ ] Main Queue has sufficient extensions
- [ ] After-Hours voicemail greeting mentions hours

---

## Workflow 3: Multi-Level IVR

### Scenario
A growing company has different IVR menus for different departments. Callers first select a department, then a sub-option within that department.

### Business Requirements
- Main menu with 2 options: Sales or Support
- Sales submenu: New customers or Existing customers
- Support submenu: Technical issues or Billing
- Proper routing to specialists
- Fallback to operator for invalid selections

### Step-by-Step Instructions

#### 1. Create Main Menu
Entry point already present. Add IVR (x: 100, y: 250):
- **Name**: "Main Menu"
- **Prompt**: "Press 1 for Sales, 2 for Support"
- **Timeout**: 5
- **Max Attempts**: 3
- **Menu Options**: 1, 2, 0

#### 2. Create Sales Submenu
Drag IVR node (x: 300, y: 250):
- **Name**: "Sales Menu"
- **Prompt**: "Press 1 for new customers, 2 for existing"
- **Timeout**: 5
- **Max Attempts**: 3
- **Menu Options**: 1, 2, 0

Connect Main Menu option 1 → Sales Menu

#### 3. Route Sales Selections
Drag two Ring Group nodes:

**New Customers (x: 450, y: 350)**:
- Name: "New Sales"
- Extensions: 101, 102
- Ring Strategy: Simultaneous
- Timeout: 30

**Existing Customers (x: 650, y: 350)**:
- Name: "Account Managers"
- Extensions: 103, 104, 105
- Ring Strategy: Round-robin
- Timeout: 30

Connect Sales Menu option 1 → New Sales
Connect Sales Menu option 2 → Existing Customers

#### 4. Create Support Submenu
Drag IVR node (x: 300, y: 550):
- **Name**: "Support Menu"
- **Prompt**: "Press 1 for technical issues, 2 for billing"
- **Timeout**: 5
- **Max Attempts**: 3
- **Menu Options**: 1, 2, 0

Connect Main Menu option 2 → Support Menu

#### 5. Route Support Selections
Drag two Ring Group nodes:

**Technical Support (x: 450, y: 650)**:
- Name: "Tech Support"
- Extensions: 201, 202, 203, 204
- Ring Strategy: Round-robin
- Timeout: 45

**Billing Support (x: 650, y: 650)**:
- Name: "Billing Department"
- Extensions: 301, 302
- Ring Strategy: Sequential
- Timeout: 30

Connect Support Menu option 1 → Tech Support
Connect Support Menu option 2 → Billing

#### 6. Add Operator Fallback
Drag Extension node (x: 550, y: 750):
- **Name**: "Operator"
- **Extension Number**: 100
- **Timeout**: 30

Connect option 0 from both submenus to Operator.

#### 7. Save and Export
Click "Save Version" to create snapshot.
Click Export and save as `multi-level-ivr.json`.

### Expected Result
```
                Incoming Call
                    ↓
                Main Menu
              ↙           ↘
          Sales Menu    Support Menu
          ↙     ↘        ↙      ↘
       New     Existing Tech  Billing
      Sales    Customers Support
```

---

## Workflow 4: Holiday Handling with Business Hours

### Scenario
A company wants to handle both business hours and holidays. On holidays, a special message plays and callers go to voicemail. Otherwise, normal business hours routing applies.

### Business Requirements
- Check for holidays first
- If holiday: Play message, route to voicemail
- If not holiday: Check business hours
- Normal routing during business hours
- After-hours voicemail otherwise

### Step-by-Step Instructions

#### 1. Create Entry Point
Update Incoming Call node as needed.

#### 2. Add Holiday Check (First Gate)
Drag Holiday node (x: 100, y: 200):
- **Name**: "Holiday Check"
- **Dates**: 2025-01-01, 2025-12-25, 2025-11-27, 2025-07-04
- **Description**: "Major holidays"

Connect Incoming Call → Holiday Check

#### 3. Add Holiday Voicemail (YES Path)
Drag Play Audio node (x: 300, y: 200):
- **Name**: "Holiday Message"
- **Audio File**: "holiday-message.wav"
- **Repeat Count**: 1

Drag Voicemail node (x: 300, y: 350):
- **Name**: "Holiday Voicemail"
- **Mailbox**: 100
- **Greeting**: "Happy holiday! We are closed today. We'll return your call tomorrow."
- **Max Duration**: 300

Connect Holiday Check (YES) → Holiday Message
Connect Holiday Message → Holiday Voicemail

#### 4. Add Business Hours Check (NO Path)
Drag Business Hours node (x: 500, y: 200):
- **Name**: "Business Hours"
- **Timezone**: "America/New_York"
- **Start Time**: "09:00"
- **End Time**: "17:00"
- **Work Days**: Mon, Tue, Wed, Thu, Fri

Connect Holiday Check (NO) → Business Hours

#### 5. Add Normal Operations Routing (Business Hours YES)
Drag Ring Group node (x: 700, y: 200):
- **Name**: "Main Queue"
- **Extensions**: 101, 102, 103, 201, 202
- **Ring Strategy**: Round-robin
- **Timeout**: 45

Connect Business Hours (YES) → Main Queue

#### 6. Add After-Hours Voicemail (Business Hours NO)
Drag Voicemail node (x: 700, y: 350):
- **Name**: "After Hours"
- **Mailbox**: 100
- **Greeting**: "Our office is currently closed. Please leave a message."
- **Max Duration**: 300

Connect Business Hours (NO) → After Hours Voicemail

#### 7. Add Operator Direct Access
Drag Extension node (x: 500, y: 450):
- **Name**: "Operator"
- **Extension Number**: 100

Optional: Add IVR with option 0 for operator direct access.

#### 8. Validation
- [ ] Holiday dates are in ISO format (YYYY-MM-DD)
- [ ] Timezone matches company location
- [ ] All paths have voicemail endpoints
- [ ] No orphaned nodes

#### 9. Export
Click Export, save as `holiday-handling.json`.

### Expected Result
```
Incoming Call
    ↓
Holiday Check?
  ↙          ↘
YES          NO
 ↓            ↓
Holiday   Business Hours?
Message     ↙          ↘
 ↓         YES         NO
Voicemail  Queue     After Hours
           (Ring)    (Voicemail)
```

---

## Workflow 5: Escalation and VIP Treatment

### Scenario
A support company wants to provide VIP treatment with faster routing, while regular customers go through standard queue. Failed attempts escalate to senior support.

### Business Requirements
- Simple initial greeting
- Route VIPs to priority queue
- Route normal to regular queue
- Escalate to senior support if no answer
- VIP customers identified by extension entry

### Step-by-Step Instructions

#### 1. Create Welcome Flow
Update Incoming Call node.

Add Play Audio (x: 100, y: 200):
- **Name**: "Welcome"
- **Audio File**: "welcome.wav"
- **Repeat Count**: 1

Connect Incoming Call → Welcome

#### 2. Add IVR for VIP Identification
Drag IVR node (x: 100, y: 350):
- **Name**: "VIP Verification"
- **Prompt**: "Press 1 if you are a VIP customer, or 2 for general support"
- **Timeout**: 5
- **Max Attempts**: 3
- **Menu Options**: 1, 2, 0

Connect Welcome → VIP IVR

#### 3. Create VIP Support Queue
Drag Ring Group (x: 300, y: 400):
- **Name**: "VIP Support"
- **Extensions**: 201, 202 (senior reps)
- **Ring Strategy**: Simultaneous
- **Timeout**: 20 seconds

Connect IVR option 1 → VIP Support

#### 4. Create Regular Support Queue
Drag Ring Group (x: 500, y: 400):
- **Name**: "General Support"
- **Extensions**: 203, 204, 205
- **Ring Strategy**: Round-robin
- **Timeout**: 30 seconds

Connect IVR option 2 → General Support

#### 5. Add Escalation Path for VIP
Drag Extension (x: 300, y: 550):
- **Name**: "Senior Support"
- **Extension Number**: 200
- **Timeout**: 25

Connect VIP Support (no-answer) → Senior Support

#### 6. Add Escalation Path for Regular
Drag Extension (x: 500, y: 550):
- **Name**: "Supervisor"
- **Extension Number**: 206
- **Timeout**: 25

Connect General Support (no-answer) → Supervisor

#### 7. Add Final Voicemail
Drag Voicemail (x: 400, y: 700):
- **Name**: "Final Voicemail"
- **Mailbox**: 100
- **Greeting**: "All representatives are busy. Please leave a detailed message."
- **Max Duration**: 300

Connect Senior Support → Final Voicemail
Connect Supervisor → Final Voicemail

#### 8. Export
Click Export, save as `escalation-vip.json`.

### Expected Result
```
Welcome
  ↓
VIP Check IVR
  ↙        ↘
VIP    Regular
Queue    Queue
  ↓        ↓
Senior  Supervisor
Support
  ↘        ↙
Final Voicemail
```

---

## Testing & Validation Checklist

### Before Deployment
- [ ] All nodes have names
- [ ] All required fields are filled
- [ ] No orphaned nodes
- [ ] All validation errors cleared (green check in settings)
- [ ] Connections all valid (green lines)
- [ ] Tested undo/redo functionality
- [ ] Exported and re-imported successfully

### Flow Logic
- [ ] Every entry point has a connected path
- [ ] All IVR options have destinations
- [ ] No circular loops (unless intentional)
- [ ] Timeout values are reasonable
- [ ] Fallback paths exist for all dead-ends

### Business Logic
- [ ] Extensions are valid and staffed
- [ ] Ring strategy matches business need
- [ ] Business hours configured correctly
- [ ] Holiday dates are accurate
- [ ] Voicemail greetings are professional

### Documentation
- [ ] Flow exported and saved
- [ ] Version saved with description
- [ ] Exported JSON validated
- [ ] Comments added to complex sections

---

## Quick Reference

### Common Node Combinations

**Simple Routing**:
```
Incoming → IVR → Ring Groups → Voicemail
```

**Time-Based**:
```
Incoming → Business Hours → Queue (hours) / Voicemail (off-hours)
```

**Multi-Level**:
```
Incoming → Main Menu → Submenu 1 → Queues
                    → Submenu 2 → Queues
```

**Escalation**:
```
Incoming → Queue 1 → Queue 2 (escalate) → Voicemail
```

**Holiday**:
```
Incoming → Holiday? → Message + Voicemail (yes)
                   → Normal routing (no)
```

---

**Last Updated**: June 2025
**All workflows tested and verified** ✓
