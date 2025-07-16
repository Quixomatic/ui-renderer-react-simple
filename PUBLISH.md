# Publishing Guide

## Pre-publish Checklist

1. **Test the package locally**:
   ```bash
   cd src/ui-renderer-react-simple
   npm pack --dry-run
   ```

2. **Test installation**:
   ```bash
   # Create test project
   mkdir test-project
   cd test-project
   npm init -y
   
   # Install from local package
   npm install ../path/to/ui-renderer-react-simple
   npx setup-servicenow-react
   npm install
   
   # Test import
   node -e "console.log(require('@servicenow/ui-renderer-react'))"
   ```

3. **Verify package contents**:
   ```bash
   npm pack
   tar -tzf quixomatic-ui-renderer-react-simple-1.0.0.tgz
   ```

## Publishing to NPM

### First Time Setup

1. **Create NPM account** (if needed):
   - Go to https://www.npmjs.com/signup
   - Or use: `npm adduser`

2. **Login to NPM**:
   ```bash
   npm login
   ```

3. **Verify login**:
   ```bash
   npm whoami
   ```

### Publishing Process

1. **Navigate to package directory**:
   ```bash
   cd src/ui-renderer-react-simple
   ```

2. **Update version** (if needed):
   ```bash
   npm version patch  # or minor, major
   ```

3. **Publish**:
   ```bash
   npm publish --access public
   ```

## Post-publish Verification

1. **Check package on NPM**:
   - Visit: https://www.npmjs.com/package/@quixomatic/ui-renderer-react-simple

2. **Test installation**:
   ```bash
   mkdir test-install
   cd test-install
   npm init -y
   npm install @quixomatic/ui-renderer-react-simple
   npx setup-servicenow-react
   ```

3. **Verify setup script works**:
   ```bash
   ls src/node_modules/@servicenow/ui-renderer-react/
   ```

## Version Management

### Semantic Versioning

- **Patch** (1.0.1): Bug fixes, no breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

### Common Version Updates

```bash
# Bug fixes
npm version patch

# New features
npm version minor

# Breaking changes
npm version major
```

## Distribution Strategy

### GitHub Repository

1. **Create GitHub repo**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/quixomatic/ui-renderer-react-simple.git
   git push -u origin main
   ```

2. **Update package.json** with repository info:
   ```json
   {
     "repository": {
       "type": "git",
       "url": "https://github.com/quixomatic/ui-renderer-react-simple.git"
     },
     "bugs": {
       "url": "https://github.com/quixomatic/ui-renderer-react-simple/issues"
     },
     "homepage": "https://github.com/quixomatic/ui-renderer-react-simple#readme"
   }
   ```

### Documentation

1. **Update README** with latest usage examples
2. **Create CHANGELOG.md** for version history
3. **Add examples** in `examples/` directory

## Maintenance

### Regular Updates

1. **Monitor React releases** for compatibility
2. **Update dependencies** regularly
3. **Test with latest ServiceNow CLI** versions

### Community Support

1. **Monitor GitHub issues**
2. **Respond to npm package questions**
3. **Update documentation** based on feedback

## Alternative Distribution

### Private Registry

If you need private distribution:

1. **Set up private registry**:
   ```bash
   npm config set registry http://your-registry.com/
   ```

2. **Publish privately**:
   ```bash
   npm publish
   ```

### Direct Distribution

For organizations without npm access:

1. **Create installation script**:
   ```bash
   # install-react-renderer.sh
   wget https://github.com/quixomatic/ui-renderer-react-simple/archive/main.zip
   unzip main.zip
   cp -r ui-renderer-react-simple-main src/node_modules/@servicenow/ui-renderer-react
   npm install
   ```

2. **Package as zip**:
   ```bash
   zip -r ui-renderer-react-simple.zip src/ui-renderer-react-simple
   ```

## Automated Publishing

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "prepublish": "npm run test",
    "test": "node -e \"console.log('Tests pass')\"",
    "preversion": "npm run test",
    "postversion": "git push && git push --tags"
  }
}
```

## Security Considerations

1. **Use `.npmignore`** to exclude sensitive files
2. **Review dependencies** for vulnerabilities
3. **Use `npm audit`** regularly
4. **Consider package signing** for critical packages

## Success Metrics

Track these metrics post-publish:

1. **Download count** on npmjs.com
2. **GitHub stars/forks**
3. **Issue reports** (bugs vs feature requests)
4. **Community contributions**

## Support Plan

1. **Monitor issues** on GitHub
2. **Respond to questions** within 48 hours
3. **Release bug fixes** within 1 week
4. **Document common problems** in FAQ