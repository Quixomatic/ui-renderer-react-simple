# @quixomatic/ui-renderer-react-simple

A React 18 renderer for ServiceNow UI Framework that provides seamless integration with Next Experience components.

## Features

- **React 18 Support**: Full compatibility with React 18 hooks and concurrent features
- **Automatic Setup**: One-command installation that handles all configuration
- **Babel Plugin Patching**: Automatically patches ServiceNow's babel plugin for React support
- **Drop-in Replacement**: Compatible with existing ServiceNow React patterns
- **Error Boundaries**: Built-in error handling for React components
- **VNode Filtering**: Prevents Snabbdom VNode contamination
- **No Manual Configuration**: Zero manual babel plugin modifications required

## Quick Start

```bash
# Install the package
npm install @quixomatic/ui-renderer-react-simple react@18 react-dom@18

# Run the setup script (creates fake package + patches babel)
npx setup-servicenow-react

# Complete the setup
npm install
```

## CLI Commands

- **`npx setup-servicenow-react`** - Complete setup (fake package + babel patch)
- **`npx patch-servicenow-babel`** - Just patch the babel plugin
- **`npx restore-servicenow-babel`** - Restore original babel plugin

## Usage

After setup, you can use React components exactly like you would with the original `@quixomatic/ui-renderer-react`:

```javascript
// my-component/index.js
import { createCustomElement } from "@servicenow/ui-core";
import react from "@servicenow/ui-renderer-react";
import view from "./view";
import styles from "./styles.scss";

createCustomElement("my-react-component", {
    renderer: { type: react },
    view,
    properties: {
        title: { default: "Hello World" },
        count: { default: 0 }
    },
    actionHandlers: {
        INCREMENT: ({ state, updateProperties }) => {
            updateProperties({ count: state.properties.count + 1 });
        }
    },
    styles
});
```

```javascript
// my-component/view.js
import React, { useState } from "react";

export default function MyReactComponent(state) {
    const { dispatch, helpers, properties } = state;
    const { title, count } = properties;
    
    const [localState, setLocalState] = useState('');
    
    const handleClick = () => {
        dispatch('INCREMENT');
        setLocalState('Button clicked!');
    };
    
    return (
        <div>
            <h1>{title}</h1>
            <p>Count: {count}</p>
            <button onClick={handleClick}>Increment</button>
            <p>{localState}</p>
        </div>
    );
}
```

## How It Works

This package solves the JSX transformation problem in ServiceNow by:

1. **Installing as a regular npm package** (`@quixomatic/ui-renderer-react-simple`)
2. **Creating a fake local package** (`@servicenow/ui-renderer-react`) that tricks the babel plugin
3. **Automatically patching ServiceNow's babel plugin** to handle React renderers correctly
4. **Providing React 18 compatibility** while maintaining the same API
5. **Filtering VNode objects** to prevent React rendering errors

## What the Setup Script Does

1. Creates `src/node_modules/@servicenow/ui-renderer-react/` directory
2. Copies the renderer files to masquerade as the official ServiceNow renderer
3. Updates your `package.json` to include the local dependency
4. **Automatically patches the ServiceNow babel plugin** in `~/.snc/.extensions/ui-component/`
5. Creates a backup of the original babel plugin for easy restoration
6. Ensures React 18 dependencies are present

## Babel Plugin Patching

The setup script automatically:
- Locates ServiceNow's babel plugin file
- Creates a backup before making changes
- Patches the React renderer configuration to use the correct module path
- Removes any old renderer entries
- Verifies the patch was applied successfully

### Manual Babel Operations

If needed, you can manually control the babel plugin:

```bash
# Patch just the babel plugin
npx patch-servicenow-babel

# Restore the original babel plugin
npx restore-servicenow-babel
```

## Migration from @quixomatic/ui-renderer-react

If you're migrating from the original `@quixomatic/ui-renderer-react`:

1. **Remove the old package**: `npm uninstall @quixomatic/ui-renderer-react`
2. **Install this package**: `npm install @quixomatic/ui-renderer-react-simple`
3. **Run setup**: `npx setup-servicenow-react`
4. **Update imports**: Change imports to `@servicenow/ui-renderer-react`
5. **No other changes needed** - your components will work exactly the same

### Key Improvements

- **No manual babel modifications** - everything is automated
- **Automatic babel plugin patching** - works out of the box
- **Easy restoration** - restore original babel plugin anytime
- **Better error handling** - improved setup process with fallbacks

## Troubleshooting

### "Objects are not valid as a React child" Error

This usually means the setup didn't complete properly:

1. Verify the setup script ran successfully
2. Check that `@servicenow/ui-renderer-react` appears in your `package.json`
3. Ensure `src/node_modules/@servicenow/ui-renderer-react/` exists
4. Run `npm install` again
5. Try running `npx patch-servicenow-babel` separately

### Babel Plugin Issues

If babel patching fails:

1. Check that ServiceNow CLI is installed: `snc --version`
2. Verify the babel plugin exists: `npx patch-servicenow-babel`
3. Try restoring and re-patching: `npx restore-servicenow-babel && npx patch-servicenow-babel`

### React Hooks Not Working

Ensure you're using React 18:

```bash
npm list react react-dom
```

Both should show version 18.x.x.

### Manual Setup

If the automatic setup fails, you can set up manually:

1. **Create the directory**:
   ```bash
   mkdir -p src/node_modules/@servicenow/ui-renderer-react
   ```

2. **Copy the renderer**:
   ```bash
   cp node_modules/@quixomatic/ui-renderer-react-simple/index.js src/node_modules/@servicenow/ui-renderer-react/
   ```

3. **Create package.json**:
   ```json
   {
     "name": "@servicenow/ui-renderer-react",
     "version": "2.0.0",
     "main": "index.js",
     "peerDependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0"
     }
   }
   ```

4. **Add to your package.json**:
   ```json
   {
     "dependencies": {
       "@servicenow/ui-renderer-react": "file:src/node_modules/@servicenow/ui-renderer-react"
     }
   }
   ```

5. **Run npm install**

6. **Patch babel manually**:
   ```bash
   npx patch-servicenow-babel
   ```

## Requirements

- Node.js 16+
- React 18.x
- ServiceNow Next Experience UI Framework
- ServiceNow CLI (`snc`)

## License

MIT

## Contributing

Issues and pull requests are welcome on GitHub.

## Support

For support, please open an issue on GitHub or contact the maintainer.

## Changelog

### v1.1.0
- Added automatic babel plugin patching
- Added CLI commands for patch/restore operations
- Improved setup process with better error handling
- Added backup/restore functionality for babel plugin

### v1.0.1
- Initial release with fake package approach
- React 18 compatibility
- VNode filtering
- Error boundaries