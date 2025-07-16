# Contributing to @quixomatic/ui-renderer-react-simple

Thank you for your interest in contributing! This project aims to provide seamless React 18 integration for ServiceNow Next Experience components.

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm 7+
- Git
- ServiceNow CLI (`npm install -g @servicenow/cli`)

### Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ui-renderer-react-simple.git
   cd ui-renderer-react-simple
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a test ServiceNow project**:
   ```bash
   mkdir test-project
   cd test-project
   snc ui-component project create
   # Follow the prompts to create a test component
   ```

4. **Test the renderer**:
   ```bash
   # Install your local development version
   npm install ../path/to/ui-renderer-react-simple
   npx setup-servicenow-react
   npm install
   ```

## Development Workflow

### Testing Changes

1. **Local testing**:
   ```bash
   # In the renderer directory
   npm pack
   
   # In a test project
   npm install ../ui-renderer-react-simple/quixomatic-ui-renderer-react-simple-1.0.0.tgz
   npx setup-servicenow-react
   ```

2. **Test with different React versions**:
   ```bash
   npm install react@18.0.0 react-dom@18.0.0
   npm install react@18.2.0 react-dom@18.2.0
   ```

3. **Test setup script**:
   ```bash
   rm -rf src/node_modules/@servicenow/ui-renderer-react
   npx setup-servicenow-react
   ```

### Code Style

- Use ES6+ syntax
- Follow existing code formatting
- Add comments for complex logic
- Use descriptive variable names

### Commit Messages

Use conventional commit format:

```
type(scope): description

Examples:
feat: add support for React 18.3
fix: resolve VNode filtering edge case
docs: update installation guide
test: add setup script tests
```

## Types of Contributions

### Bug Reports

When reporting bugs, please include:

1. **Environment details**:
   - Node.js version
   - npm version
   - ServiceNow CLI version
   - Operating system

2. **Steps to reproduce**:
   - Exact commands run
   - Expected vs actual behavior
   - Error messages

3. **Test case** (if possible):
   - Minimal component that reproduces the issue

### Feature Requests

For new features:

1. **Describe the use case**
2. **Explain the benefit**
3. **Consider backward compatibility**
4. **Provide implementation ideas** (optional)

### Code Contributions

#### Areas needing help:

1. **Testing**:
   - Unit tests for the renderer
   - Integration tests with ServiceNow
   - Cross-platform testing

2. **Documentation**:
   - More examples
   - Video tutorials
   - FAQ section

3. **Features**:
   - TypeScript definitions
   - Performance optimizations
   - Additional React features support

4. **Tooling**:
   - Better error messages
   - Development tools
   - Debugging utilities

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, well-documented code
   - Add tests if applicable
   - Update documentation

3. **Test your changes**:
   ```bash
   # Test package creation
   npm pack --dry-run
   
   # Test installation
   mkdir test-install
   cd test-install
   npm init -y
   npm install ../your-package.tgz
   npx setup-servicenow-react
   ```

4. **Update documentation**:
   - Update README.md if needed
   - Update CHANGELOG.md
   - Add examples for new features

5. **Submit pull request**:
   - Clear description of changes
   - Reference any related issues
   - Include testing instructions

## Testing Guidelines

### Manual Testing

1. **Basic functionality**:
   ```javascript
   // Test component
   import React, { useState } from 'react';
   
   export default function TestComponent(state) {
     const [count, setCount] = useState(0);
     return <button onClick={() => setCount(count + 1)}>{count}</button>;
   }
   ```

2. **Error handling**:
   ```javascript
   // Test error boundary
   export default function ErrorComponent() {
     throw new Error('Test error');
   }
   ```

3. **Lifecycle hooks**:
   ```javascript
   // Test useEffect
   import React, { useEffect, useState } from 'react';
   
   export default function LifecycleComponent() {
     useEffect(() => {
       console.log('Mounted');
       return () => console.log('Unmounted');
     }, []);
     
     return <div>Lifecycle test</div>;
   }
   ```

### Automated Testing (Future)

We're working on:
- Jest unit tests
- Cypress integration tests
- GitHub Actions CI/CD

## Documentation Standards

### Code Documentation

```javascript
/**
 * Renders a React component within ServiceNow's component system
 * @param {HTMLElement} element - DOM element to render into
 * @param {React.Component} Component - React component to render
 * @param {Object} state - ServiceNow component state
 * @param {Object} helpers - ServiceNow helper functions
 * @returns {ReactRoot} React 18 root instance
 */
function onStateChange(element, Component, state, helpers) {
  // Implementation
}
```

### README Updates

When adding features, update:
- Feature list
- Usage examples
- Installation steps (if changed)
- Troubleshooting section

## Release Process

1. **Update version**:
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**:
   - Add new version section
   - List all changes
   - Include upgrade instructions

3. **Test release**:
   ```bash
   npm pack
   # Test the tarball
   ```

4. **Create release PR**:
   - Update documentation
   - Get reviews
   - Merge to main

5. **Publish**:
   ```bash
   npm publish
   ```

6. **Create GitHub release**:
   - Tag the version
   - Include release notes
   - Attach tarball

## Community Guidelines

### Be Respectful

- Welcome newcomers
- Provide constructive feedback
- Help others learn

### Stay On Topic

- Focus on React/ServiceNow integration
- Keep discussions relevant
- Use appropriate channels

### Share Knowledge

- Document solutions
- Help with troubleshooting
- Share use cases

## Getting Help

### Documentation

- README.md - Quick start
- INSTALLATION.md - Detailed setup
- GitHub Issues - Known problems

### Communication

- GitHub Issues - Bug reports, feature requests
- GitHub Discussions - General questions
- Email - Direct support (see package.json)

### Resources

- [React Documentation](https://reactjs.org/docs)
- [ServiceNow Developer Site](https://developer.servicenow.com)
- [Next Experience UI Framework](https://developer.servicenow.com/dev.do#!/reference/next-experience)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in package.json (for significant contributions)

Thank you for contributing to making React 18 work seamlessly with ServiceNow! 🎉