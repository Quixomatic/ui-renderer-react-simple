# Installation Guide

## Quick Installation

```bash
# 1. Install the package and dependencies
npm install @quixomatic/ui-renderer-react-simple react@18 react-dom@18

# 2. Run the setup script
npx setup-servicenow-react

# 3. Complete the setup
npm install
```

## What Gets Installed

After running the setup script, your project will have:

### Modified Files
- `package.json` - Updated with React 18 dependencies and local renderer reference

### New Files
- `src/node_modules/@servicenow/ui-renderer-react/index.js` - The React 18 renderer
- `src/node_modules/@servicenow/ui-renderer-react/package.json` - Package metadata

### Dependencies Added
- `@servicenow/ui-renderer-react` - File dependency pointing to local renderer
- `react` - React 18.x
- `react-dom` - React DOM 18.x

## Project Structure After Setup

```
your-servicenow-project/
├── package.json                          # Updated with dependencies
├── src/
│   ├── node_modules/
│   │   └── @servicenow/
│   │       └── ui-renderer-react/        # Local fake package
│   │           ├── index.js              # React 18 renderer
│   │           └── package.json          # Package metadata
│   └── your-component/
│       ├── index.js                      # Can now import "@servicenow/ui-renderer-react"
│       └── view.js                       # React component with hooks
└── node_modules/
    └── @quixomatic/
        └── ui-renderer-react-simple/     # Source package from npm
```

## Usage After Installation

### Basic Component

```javascript
// my-component/index.js
import { createCustomElement } from "@servicenow/ui-core";
import react from "@servicenow/ui-renderer-react";
import view from "./view";

createCustomElement("my-component", {
    renderer: { type: react },
    view,
    properties: {
        message: { default: "Hello World" }
    }
});
```

### React Component with Hooks

```javascript
// my-component/view.js
import React, { useState, useEffect } from "react";

export default function MyComponent(state) {
    const { dispatch, helpers, properties } = state;
    const { message } = properties;
    
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        console.log('Component mounted');
        return () => console.log('Component unmounted');
    }, []);
    
    const handleClick = () => {
        setCount(count + 1);
        dispatch('BUTTON_CLICKED', { count: count + 1 });
    };
    
    return (
        <div>
            <h1>{message}</h1>
            <p>Count: {count}</p>
            <button onClick={handleClick}>
                Click me
            </button>
        </div>
    );
}
```

## Verification

### 1. Check Dependencies

```bash
npm list react react-dom @servicenow/ui-renderer-react
```

Should show:
- `react@18.x.x`
- `react-dom@18.x.x`
- `@servicenow/ui-renderer-react@2.0.0`

### 2. Test Import

Create a test file:

```javascript
// test-import.js
import react from "@servicenow/ui-renderer-react";
console.log('Renderer loaded:', react);
```

### 3. Check File Structure

Verify these files exist:
- `src/node_modules/@servicenow/ui-renderer-react/index.js`
- `src/node_modules/@servicenow/ui-renderer-react/package.json`

## Multiple Projects

For multiple ServiceNow projects, run the setup in each project directory:

```bash
# Project 1
cd /path/to/project1
npm install @quixomatic/ui-renderer-react-simple react@18 react-dom@18
npx setup-servicenow-react
npm install

# Project 2
cd /path/to/project2
npm install @quixomatic/ui-renderer-react-simple react@18 react-dom@18
npx setup-servicenow-react
npm install
```

## Team Setup

For team development, you can:

### Option 1: Include in Setup Instructions
Add to your project's README:

```markdown
## Setup
1. Clone the repository
2. Run: npm install
3. Run: npm install @quixomatic/ui-renderer-react-simple
4. Run: npx setup-servicenow-react
5. Run: npm install
```

### Option 2: NPM Scripts
Add to your `package.json`:

```json
{
  "scripts": {
    "setup": "npm install @quixomatic/ui-renderer-react-simple && npx setup-servicenow-react && npm install",
    "postinstall": "npx setup-servicenow-react"
  }
}
```

### Option 3: Include in Repository
If you want to commit the setup to your repository:

1. Run the setup once
2. Commit the `src/node_modules/@servicenow/ui-renderer-react/` directory
3. Team members just need to run `npm install`

## Troubleshooting Installation

### Setup Script Fails

If `npx setup-servicenow-react` fails:

1. **Check if package is installed**:
   ```bash
   ls node_modules/@quixomatic/ui-renderer-react-simple/
   ```

2. **Run setup manually**:
   ```bash
   node node_modules/@quixomatic/ui-renderer-react-simple/scripts/setup.js
   ```

3. **Manual setup** (see README.md)

### Permission Errors

On some systems, you might need to use `sudo` or run as administrator:

```bash
sudo npx setup-servicenow-react
```

### Windows Path Issues

If you get path errors on Windows:

```cmd
npx setup-servicenow-react
```

Or use PowerShell:

```powershell
npx setup-servicenow-react
```

## Updating

To update the renderer:

```bash
# Update the source package
npm update @quixomatic/ui-renderer-react-simple

# Re-run setup to update the local copy
npx setup-servicenow-react
```

## Uninstalling

To remove the React renderer:

```bash
# Remove the source package
npm uninstall @quixomatic/ui-renderer-react-simple

# Remove the local fake package
rm -rf src/node_modules/@servicenow/ui-renderer-react

# Remove from package.json
# Edit package.json and remove:
# "@servicenow/ui-renderer-react": "file:src/node_modules/@servicenow/ui-renderer-react"

# Update dependencies
npm install
```