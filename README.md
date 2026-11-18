# @quixomatic/ui-renderer-react-simple

React 19 for ServiceNow Next Experience (UI Framework) components. It is a drop-in replacement
for `@servicenow/ui-renderer-react`: write your component views as React 19 function components
with hooks, while `createCustomElement`, action handlers, properties and styles keep working the
usual ServiceNow way.

React 19 is **bundled into this package**. Deployed components run React 19 even on pages
where ServiceNow's own components use the platform's React 16, and the two never collide.

## Quick start

```bash
pnpm add @quixomatic/ui-renderer-react-simple   # or: npm install ...
pnpm exec setup-servicenow-react                # or: npx setup-servicenow-react
pnpm install
snc ui-component develop
```

Commit the generated `react-shim/` folder with your project. Under pnpm, setup also sets
`nodeLinker: hoisted` in `pnpm-workspace.yaml`: ServiceNow's deploy build can't handle pnpm's
symlinked store.

## Usage

```javascript
// src/my-component/index.js
import { createCustomElement } from '@servicenow/ui-core';
import react from '@servicenow/ui-renderer-react';
import view from './view';
import styles from './styles.scss';

createCustomElement('my-component', {
	renderer: { type: react },
	view,
	styles,
	properties: {
		title: { default: 'Hello World' },
		count: { default: 0 }
	},
	actionHandlers: {
		INCREMENT: ({ state, updateProperties }) => updateProperties({ count: state.properties.count + 1 })
	}
});
```

```javascript
// src/my-component/view.js
import React, { useState } from 'react';

export default function View({ properties, state, dispatch, helpers }) {
	const [note, setNote] = useState('');
	return (
		<div>
			<h1>{properties.title}</h1>
			<p>Count: {properties.count}</p>
			<button onClick={() => { dispatch('INCREMENT'); setNote('clicked'); }}>Increment</button>
			<p>{note}</p>
		</div>
	);
}
```

### What the view receives

| Prop | Value |
| --- | --- |
| `properties` | The component's properties (always an object). |
| `state` | The full ui-core view state (`properties`, your `initialState` keys, `componentId`, `context`). |
| `dispatch` | ui-core `dispatch(type, payload)`. Always a function. |
| `helpers` | ui-core helpers (`dispatch`, `updateState`, `updateProperties`, ...). |
| _every state key_ | State keys are also spread at the top level, e.g. `componentId`, `context`. |

### Notes

- **JSX files must import React.** The ServiceNow JSX plugin treats a file as React when it
  imports `react`. Use `import React from 'react'`. This is also required for `<>` fragments,
  because ServiceNow's babel setup compiles them to `React.Fragment`.
- **React 19 features work**: `use()`, `useId`, `ref` as a prop, Actions, and so on.
- **Custom elements**: React 19 sets object and array props on custom elements as properties, so
  `<child-component items={[1, 2]} />` works with ServiceNow child components.
- **Errors**: a crashing view renders nothing, dispatches ui-core's
  `actionTypes.COMPONENT_ERROR_THROWN` (with `componentStack` in `details`), and gets another
  chance to render as soon as the component's state changes.
- **Lifecycle**: renders are committed synchronously, so `COMPONENT_DOM_READY` and
  `COMPONENT_RENDERED` handlers can query the rendered DOM.

## Tailwind v4, shadcn/ui (Base UI) and shadow DOM

ui-core always renders a component into its own shadow root, and UI Builder nests that inside
several more. Page-level CSS never reaches in, and overlay libraries portal to `document.body`,
outside it. This package handles the parts that need runtime help. A component is a
self-contained app with its CSS inside its shadow root.

**What the renderer does for you, automatically:**

- **`@property` / `@font-face` hoisting.** Both are ignored inside shadow roots. Tailwind v4
  registers `--tw-shadow`, `--tw-ring-*`, `--tw-translate-*`, gradients, … with `@property`,
  so shadows, rings, transforms and gradients silently break in shadow DOM. The renderer copies
  those rules from the component's styles into the document once.
- **Overlay layer.** `usePortalContainer()` returns a container on `document.body` with its
  own shadow root, which mirrors the component's stylesheets and host classes (for dark mode).
  Overlays rendered there are styled, sit above the page, and are never clipped by a UI Builder
  container's `overflow`, `transform` or `z-index`, however deep the component is nested.
  It's created on first use and removed when the component unmounts.

### Setup

1. **Tailwind entry**, e.g. `src/styles/tailwind.css`. Put theme tokens on `:host` as well as
   `:root`, and key dark mode off the host:

   ```css
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "shadcn/tailwind.css";
   @source "../";

   @custom-variant dark (&:where(:host(.dark), :host(.dark) *));

   :root, :host { --background: oklch(1 0 0); /* ...shadcn tokens... */ }
   :host(.dark) { --background: oklch(0.145 0 0); /* ... */ }

   @theme inline { --color-background: var(--background); /* ... */ }

   @layer base {
     * { @apply border-border outline-ring/50; }
     :host { @apply text-foreground; display: block; }
   }
   ```

2. **Build it and put it in the component's `styles`**, the same as any stylesheet:

   ```json
   "scripts": { "build:css": "tailwindcss -i src/styles/tailwind.css -o src/styles/tailwind.generated.css --minify" }
   ```

   ```javascript
   import styles from '../styles/tailwind.generated.css';
   createCustomElement('x-...-my-component', { renderer: { type: react }, view, styles });
   ```

   The CLI compiles styles with your project's `sass`. Setup installs a current one. The Sass
   1.53 the CLI ships with can't parse Tailwind v4 output.

3. **shadcn/ui with Base UI.** `shadcn init` can't detect a ServiceNow project, so use
   shadcn's manual setup: a `components.json` with the `base-nova` style and `#/` aliases.
   The CLI's webpack ignores jsconfig/tsconfig `paths`, but it resolves package.json
   `"imports"`, which setup adds (`"#/*": "./src/*"`):

   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "base-nova",
     "rsc": false,
     "tsx": false,
     "tailwind": { "config": "", "css": "src/styles/tailwind.css", "baseColor": "neutral", "cssVariables": true },
     "iconLibrary": "lucide",
     "aliases": { "components": "#/components", "utils": "#/lib/utils", "ui": "#/components/ui", "lib": "#/lib", "hooks": "#/hooks" }
   }
   ```

   Plus a `jsconfig.json` so the shadcn CLI knows where `#/` points:
   `{ "compilerOptions": { "baseUrl": ".", "paths": { "#/*": ["./src/*"] } } }`

   Then add components and run the fix after **every** `shadcn add`:

   ```bash
   pnpm dlx shadcn@latest add button dialog dropdown-menu popover input
   pnpm add @base-ui/react class-variance-authority cn lucide-react
   pnpm add -D shadcn tw-animate-css
   pnpm exec servicenow-shadcn-fix
   ```

   `servicenow-shadcn-fix` makes two changes to the generated files:
   - It adds `import * as React from "react"` where missing. ServiceNow's JSX plugin only
     compiles a file for React when it imports `react`; otherwise you get snabbdom elements
     and `tag.indexOf is not a function`.
   - It adds `container={usePortalContainer()}` to every `.Portal`.

   `--check` makes it a CI guard.

4. **Use the components** with the `#/` alias:
   `import { Button } from '#/components/ui/button'`.

Your own overlay code can use the hook directly:

```javascript
import { usePortalContainer } from '@servicenow/ui-renderer-react';
import { createPortal } from 'react-dom';

function Toast({ children }) {
	return createPortal(<div className="fixed bottom-4 right-4">{children}</div>, usePortalContainer());
}
```

## How it works

Two problems stand between React 19 and a ServiceNow component. The setup script solves both.

### 1. React 16 on the instance

ServiceNow pages load the platform's **React 16.14.0** into a page-global slot named after the
package (`window.__TECTONIC__react`). Every deployed npm package shares slots this way. If your
component deployed the real `react` package, it would find that slot already taken and silently
get React 16. With `react-dom` 19 that fails at startup
(`Cannot read properties of undefined (reading 'S')`).

So this package **bundles** React 19, react-dom and the renderer into one module, which deploys
under its own name and slot (`__TECTONIC__$quixomatic_ui_renderer_react_simple`). Setup writes a
two-line shim folder and points the names your code uses at it:

```json
"dependencies": {
  "@quixomatic/ui-renderer-react-simple": "^2.1.0",
  "@servicenow/ui-renderer-react": "file:react-shim",
  "react": "file:react-shim",
  "react-dom": "file:react-shim"
}
```

```javascript
// react-shim/index.js (generated)
export * from '@quixomatic/ui-renderer-react-simple';
export { default } from '@quixomatic/ui-renderer-react-simple';
```

npm symlinks all three names to that one folder, so `import React from 'react'`,
`react-dom/client`, `react/jsx-runtime` and `import react from '@servicenow/ui-renderer-react'`
all reach the same single React 19. Third-party React libraries in your project resolve `react`
the same way. ServiceNow's own components on the page keep their React 16.

The default export is both the React API and the ui-core renderer (`onConnect`,
`onStateChange`, `onDisconnect`, `deprioritizeStyles`). That's why one module can stand in for
`react` and for `@servicenow/ui-renderer-react`.

### 2. JSX compiled for React 16 (CLI patch)

The CLI's JSX plugin only treats a file as React when `@servicenow/ui-renderer-react` is a
dependency (the shim covers that). Its babel preset then injects `createElement` from
`sn-custom-create-element`, which bundles **React 16**, and React 19 rejects those elements
("Objects are not valid as a React child"). `patch-servicenow-babel` changes that one mapping in
`~/.snc/.extensions/ui-component/node_modules/@servicenow/cli/dist/babel/preset/seismic/index.js`
so JSX uses this package's `createElement`.

On CLI 27.x a second patch is needed: its webpack config ignores package.json `"exports"`, so
exports-only subpaths that modern libraries use (`@base-ui/react/dialog`, Radix's
`@radix-ui/primitive/is-development`, …) fail to resolve. The patch enables exports, as CLI 30.x
ships, but keeps them off for requests from ServiceNow's own packages, whose deep imports
(`snabbdom/build/package/*`) rely on that. On CLI 30.x it is a no-op.

## CLI commands

| Command | Purpose |
| --- | --- |
| `npx setup-servicenow-react` | Write `react-shim/`, point `react`, `react-dom` and `@servicenow/ui-renderer-react` at it, migrate older setups, and patch the babel preset. Options: `--skip-patch`, `--spec <npm spec>` (version spec for this package). |
| `npx patch-servicenow-babel` | Apply the CLI patches (babel preset; `exports` on 27.x). Run again after upgrading or reinstalling the `snc` ui-component extension, because that replaces the patched files. Options: `--verify` (exit code 1 if not patched), `--debug`. |
| `npx restore-servicenow-babel` | Restore the stock CLI files from their backups. |
| `npx servicenow-shadcn-fix [dir]` | After `shadcn add`: add React imports and overlay portal containers to the components in `dir` (default `src/components/ui`). `--check` exits 1 if anything needs fixing. |

The patcher backs up each stock file next to it (`<file>.backup`). If a CLI upgrade replaces a
file, the next patch refreshes its backup, so `restore` never rolls back to an old CLI
version. If the CLI lives somewhere unusual, set `SNC_CLI_PATH` to the `@servicenow/cli` folder.

## Deploying

```bash
npx patch-servicenow-babel --verify
snc ui-component deploy
```

- Component tags listed in `now-ui.json` must start with your instance's vendor prefix, e.g.
  `x-312987-my-component` (the CLI checks this). The scope must look like `x_<prefix>_<name>`.
  Inner components that aren't listed in `now-ui.json` aren't checked. Prefixing them still
  avoids custom element name clashes on the page.
- **Third-party code is bundled into your component.** Setup writes this to `now-cli.json`:

  ```json
  "build": { "pack": { "esmExternalModules": {
    "build":  { "allow": ["externals"], "deny": ["**"] },
    "bundle": { "allow": ["**"], "deny": ["@servicenow/*", "@servicenow/**", "@devsnc/*", "@devsnc/**", "@seismic/*", "@seismic/**", "@tectonic/*", "@tectonic/**", "sn-*", "sn-*/**"] }
  } } }
  ```

  The CLI's default deploys every npm package as a separate shared asset named only by
  package + version. Libraries that publish their API as `exports` subpaths (all of Base UI,
  `@floating-ui/utils/dom`, …) collapse into one asset, and the other subpaths arrive undefined
  (`Super expression must either be null or a function`). Bundling avoids that and tree-shakes:
  the test project (React 19, Base UI, TanStack Query, lucide, 5 components) deploys as one
  ~570 KB asset instead of 81 assets totaling 1.9 MB. ServiceNow's own packages (ui-core, …)
  stay external, provided by the instance.
- Nothing touches the instance's own `react` or `@servicenow/ui-renderer-react`.

A handy guard in your component's `package.json`:

```json
{
  "scripts": {
    "deploy": "patch-servicenow-babel --verify && snc ui-component deploy"
  }
}
```

## Upgrading from v1 (React 18)

```bash
npm install @quixomatic/ui-renderer-react-simple@^2
npx setup-servicenow-react
npm install
```

The setup script points `@servicenow/ui-renderer-react`, `react` and `react-dom` at the new
`react-shim/` folder and deletes the copied `src/node_modules/@servicenow/ui-renderer-react`
folder. Component code needs no changes. v1 never actually ran React 18 once deployed: the
instance served its React 16. Do review the
[React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) for your own
code, though: `propTypes`/`defaultProps` on function components, string refs and legacy context
were removed.

`COMPONENT_ERROR_THROWN` handlers now actually fire. v1 dispatched an action type ui-core
does not listen to.

## Troubleshooting

**"Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner})"**
JSX is still being compiled with ServiceNow's React 16 `createElement`. Run
`npx patch-servicenow-babel --verify`. Then restart `snc ui-component develop` and clear its
cache (`snc ui-component develop --clear-cache`).

**The view renders snabbdom output, or nothing at all**
Make sure `@servicenow/ui-renderer-react` is listed in `dependencies` and the view file imports
`react`.

**Works in `snc ui-component develop` but breaks on the instance with
`Cannot read properties of undefined (reading 'S')` or hook errors**
Something imported the real `react` package, which on the instance resolves to the platform's
React 16. Check that `react` and `react-dom` in `package.json` point at `file:react-shim`, then
run `npm ls react`: everything should resolve to `react-shim`.

**`TypeError: tag.indexOf is not a function` (in `isCustomElement`)**
A JSX file was compiled for snabbdom because it doesn't import `react`. Add
`import * as React from "react"`. For shadcn components, run `servicenow-shadcn-fix`.

**`SassError: Only 3 elements allowed, but 5 were passed`**
Tailwind v4 CSS went through the CLI's bundled Sass 1.53. Add a current `sass` to your
project's devDependencies (setup does this). The CLI prefers the project's copy.

**Works locally, but on the instance the component never renders: `Super expression must either be null or a function`, or `X is not a function` / `undefined` from a library**
A library with `exports` subpaths was deployed as a separate asset and lost its subpaths. Use the
`esmExternalModules` bundling config from "Deploying" (setup writes it), then deploy again.

**Deploy fails with "Multiple assets emit different content to the same filename"**
pnpm's symlinked layout. Set `nodeLinker: hoisted` in `pnpm-workspace.yaml` (setup does this
under pnpm), then reinstall.

**Overlays (dialogs, menus, popovers) render unstyled, or get clipped**
Their portal isn't using the overlay layer. Pass `container={usePortalContainer()}`, or run
`servicenow-shadcn-fix`.

**`snc extension add` fails with "NPM version 11.x found, expected >= 6.13.4"**
The snc installer misreads npm 11+ as too old. Install the extension by hand: create
`~/.snc/.extensions/ui-component/package.json` with
`{ "name": "ui-component", "version": "1.0.0", "dependencies": { "@servicenow/cli": "https://registry.npmjs.org/@servicenow/cli/-/cli-<version>.tgz" } }`,
run `npm install` in that folder, then run `npx patch-servicenow-babel`.

**Inspect the patch**: `npx patch-servicenow-babel --debug`.

## Requirements

- ServiceNow CLI (`snc`) with the `ui-component` extension, 30.x recommended. Tested with
  27.4.1 and 30.2.0, including deploys.
- npm or pnpm. pnpm needs `nodeLinker: hoisted`, which setup configures.
- No separate React install: React 19.3.1 is bundled. Run `npm update` on this package to get
  newer React releases.
- Node.js 18+ for the setup scripts

## License

MIT
