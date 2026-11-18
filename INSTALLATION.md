# Installation

## 1. Install and run setup

From your component project root (the folder with `now-ui.json` and `package.json`):

```bash
npm install @quixomatic/ui-renderer-react-simple
npx setup-servicenow-react
npm install
```

`setup-servicenow-react` writes a small `react-shim/` folder (commit it) and makes these
changes to `package.json`:

```json
{
  "dependencies": {
    "@quixomatic/ui-renderer-react-simple": "^2.1.0",
    "@servicenow/ui-renderer-react": "file:react-shim",
    "react": "file:react-shim",
    "react-dom": "file:react-shim"
  }
}
```

Don't install the real `react` / `react-dom` packages: React 19 is bundled into
`@quixomatic/ui-renderer-react-simple`. Setup also patches the ServiceNow CLI's babel preset
(`~/.snc/.extensions/ui-component/node_modules/@servicenow/cli/dist/babel/preset/seismic/index.js`)
so JSX uses React 19's `createElement`, and keeps a backup next to it.

See [How it works](README.md#how-it-works).

## 2. Switch a component to React

```javascript
// src/my-component/index.js
import { createCustomElement } from '@servicenow/ui-core';
import react from '@servicenow/ui-renderer-react';
import view from './view';

createCustomElement('my-component', {
	renderer: { type: react },
	view,
	properties: { message: { default: 'Hello' } }
});
```

```javascript
// src/my-component/view.js
import React, { useState, useEffect } from 'react';

export default function View({ properties, dispatch }) {
	const [count, setCount] = useState(0);
	useEffect(() => () => console.log('unmounted'), []);
	return (
		<button onClick={() => { setCount(count + 1); dispatch('CLICKED', { count: count + 1 }); }}>
			{properties.message}: {count}
		</button>
	);
}
```

Snabbdom and React components can live in the same project and nest inside each other. Each file
uses the renderer it imports.

## 3. Verify

```bash
npm ls @servicenow/ui-renderer-react react react-dom   # all three -> file:react-shim
npx patch-servicenow-babel --verify                     # babel preset patched
snc ui-component develop
```

## Teams and CI

The `package.json` change and `react-shim/` are committed with your project, so teammates only
need `npm install`. The babel patch lives in each developer's `~/.snc` folder, though, so everyone runs `patch-servicenow-babel` once, and
again after upgrading the ui-component extension. A `postinstall` script handles both:

```json
{
  "scripts": {
    "postinstall": "patch-servicenow-babel || echo \"ServiceNow CLI not found; skipping babel patch\""
  }
}
```

## Updating

```bash
npm install @quixomatic/ui-renderer-react-simple@latest
npm install
```

The shim only re-exports the package, so it never needs regenerating when you update. Newer
React 19 releases arrive through updates to this package.

## Uninstalling

```bash
npx restore-servicenow-babel
npm uninstall @servicenow/ui-renderer-react react react-dom @quixomatic/ui-renderer-react-simple
rm -rf react-shim
```

Then switch your components back to `@servicenow/ui-renderer-snabbdom`.
