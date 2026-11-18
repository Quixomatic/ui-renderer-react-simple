# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1] - 2026-11-18

### Fixed
- The CLI commands (`setup-servicenow-react`, `patch-servicenow-babel`,
  `restore-servicenow-babel`, `servicenow-shadcn-fix`) were missing from 2.1.0: npm 11.19 drops
  `bin` paths that start with `./` at publish time. Paths are now written without it, and a test
  guards against regressions.

## [2.1.0] - 2026-11-18

(2.0.0 was never published; this is the first React 19 release.)

### Breaking
- React 19.3.1 is bundled into the package (`dist/index.js`, about 225 KB minified) together
  with react-dom, `react-dom/client`, the JSX runtime and the renderer. It has no React peer
  dependency; don't install `react` / `react-dom` separately.
- Setup writes a two-line `react-shim/` folder and points `react`, `react-dom` and
  `@servicenow/ui-renderer-react` at it (`file:react-shim`), so everything resolves to the one
  bundled React 19. It replaces v1's copied `src/node_modules` renderer; re-running
  `npx setup-servicenow-react` migrates v1 projects automatically.
- The package is ESM (`"type": "module"`, `exports`). CLI scripts are now `.cjs`.

### Fixed
- Deployed components now actually run React 19. On an instance, `react` is a shared asset
  guarded by `window.__TECTONIC__react`, which ServiceNow pages fill with the platform's React
  16.14.0. Every deploy (v1 included) therefore ran React 16. The bundled React lives under this
  package's own global, so it coexists with the platform's React 16 on the same page. Verified on
  a Next Experience workspace page.
- `onDisconnect` used the wrong signature. ui-core calls `(node, dispatch, next)`, so v1 invoked
  `dispatch()` with no arguments and never called `next`, which skipped ui-core's style-unhoist
  cleanup.
- Renders are committed synchronously (`flushSync`). Previously `COMPONENT_DOM_READY` and
  `COMPONENT_RENDERED` fired before the DOM existed.
- `COMPONENT_ERROR_THROWN` handlers never fired, because v1 dispatched the plain string
  `'COMPONENT_ERROR_THROWN'`. The renderer now dispatches ui-core's real
  `SEISMIC_COMPONENT_ERROR_THROWN` with the same payload shape ui-core uses, including
  `componentStack`.
- The error boundary no longer leaves a component blank forever. It retries when state changes,
  and reports each crash exactly once.
- `dispatch` passed to views is always a function. It was `{}` during ui-core's style pass and in
  `renderer.coeffects` mode.
- Removed the console flood from ui-core's context proxy under React 19.2+ dev builds
  (Performance Tracks reading `Symbol.toStringTag`).
- Disconnect is deferred to a microtask, so removing a component from inside another React
  commit no longer unmounts synchronously mid-render. A same-tick reconnect keeps the root.

### Added
- Shadow DOM support for Tailwind v4 and shadcn/ui, verified with shadcn on Base UI
  (`base-nova`) nested in clipping UI Builder-style containers:
  - `@property` and `@font-face` rules in a component's styles are copied into the document
    automatically. Inside shadow roots they're ignored, which broke Tailwind v4 shadows, rings,
    transforms and gradients.
  - `usePortalContainer()`: an overlay layer on `document.body` with its own shadow root,
    mirroring the component's styles and host classes. Overlays are styled, above the page, and
    never clipped by ancestor containers.
- `servicenow-shadcn-fix`: run after `shadcn add`. It adds the React import ServiceNow's JSX
  plugin needs, and portal containers. `--check` for CI.
- Setup adds a current `sass` (the CLI uses the project's copy; its own 1.53 can't parse
  Tailwind v4), a `"#/*": "./src/*"` package.json `imports` alias (the CLI ignores jsconfig
  paths), and `nodeLinker: hoisted` under pnpm (the deploy build can't handle pnpm's symlinked
  store). npm, pnpm and yarn are supported.
- `patch-servicenow-babel` also enables package.json `"exports"` on CLI 27.x (no-op on 30.x),
  scoped so ServiceNow's own packages keep their old resolution.
- Publishing: pushing a `v2.x.x` tag publishes to npm from CI.
- Setup configures `now-cli.json` so deploys bundle third-party code into the component
  (`build.pack.esmExternalModules`). The CLI's default per-package assets break packages that
  publish `exports` subpaths, such as Base UI. It also cuts deploy size through tree-shaking.

### Changed
- `patch-servicenow-babel` gains `--verify` and `--debug`. Its backup refreshes after CLI
  upgrades, so `restore-servicenow-babel` never rolls back to an old CLI version. Set
  `SNC_CLI_PATH` to point at a non-standard CLI location.
- The preset patch uses one pattern for prettified and minified presets, verified against CLI
  27.4.1 and 30.2.0.
- Real test suite (`npm test`, which builds first): renderer behaviour under jsdom against the
  bundled React 19, bundle integrity (no imports, one React instance), and patcher behaviour on
  CLI fixtures. CI runs it on Linux, Windows and macOS with Node 22 and 24.

## [1.0.0] - 2024-01-16

### Added
- Initial release of React 18 renderer for ServiceNow UI Framework
- Automatic setup script (`npx setup-servicenow-react`)
- React 18 createRoot API support
- Built-in error boundaries for React components
- VNode filtering to prevent Snabbdom/React conflicts
- Babel plugin compatibility by masquerading as `@servicenow/ui-renderer-react`
- Complete documentation and installation guides
- Support for all React 18 hooks and concurrent features

### Features
- **React 18 Support**: Full compatibility with React 18.x
- **Automatic JSX Transformation**: Works with ServiceNow's babel plugin
- **Drop-in Replacement**: Compatible with existing React renderer patterns
- **Error Handling**: Comprehensive error boundaries and logging
- **State Management**: Proper integration with ServiceNow's component state
- **Hook Support**: useState, useEffect, and all React 18 hooks work properly

### Technical Details
- Uses ReactDOM.createRoot() instead of legacy ReactDOM.render()
- Filters VNode objects from state to prevent React rendering errors
- Maintains compatibility with ServiceNow's action dispatching system
- Supports both local React state and ServiceNow component properties
- Automatic cleanup of React roots on component unmount

### Documentation
- README.md with quick start guide
- INSTALLATION.md with detailed setup instructions
- PUBLISH.md with publishing guidelines
- Inline code documentation and examples

### Package Structure
- Main renderer in index.js
- Executable setup script in scripts/setup.js
- Comprehensive npm package configuration
- MIT license for open source usage

## [0.1.0] - 2024-01-15

### Added
- Initial development version
- Basic React 18 renderer functionality
- Experimental setup scripts

---

## Upgrade Guide

### From @quixomatic/ui-renderer-react

1. Uninstall the old package:
   ```bash
   npm uninstall @quixomatic/ui-renderer-react
   ```

2. Install the new package:
   ```bash
   npm install @quixomatic/ui-renderer-react-simple react@18 react-dom@18
   ```

3. Run the setup script:
   ```bash
   npx setup-servicenow-react
   npm install
   ```

4. Update imports in your components:
   ```javascript
   // Old
   import react from "@quixomatic/ui-renderer-react";
   
   // New
   import react from "@servicenow/ui-renderer-react";
   ```

5. No other changes needed - your components will work exactly the same!

### Breaking Changes

None - this is designed to be a drop-in replacement for the original renderer.

### New Features Available

- All React 18 hooks (useId, useDeferredValue, useTransition, etc.)
- Concurrent rendering features
- Automatic batching
- Improved error boundaries
- Better performance with createRoot API