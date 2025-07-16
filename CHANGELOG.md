# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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