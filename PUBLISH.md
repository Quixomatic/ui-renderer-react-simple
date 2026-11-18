# Publishing

## Before a release

```bash
npm ci
npm test
npm pack --dry-run   # runs the build; should list dist/index.js, scripts/*, README.md, INSTALLATION.md, CHANGELOG.md, package.json
```

Then do an end-to-end check in a real ServiceNow component project:

```bash
npm pack --pack-destination /tmp
cd /path/to/component-project
npm install /tmp/quixomatic-ui-renderer-react-simple-<version>.tgz
npx setup-servicenow-react --spec file:/tmp/quixomatic-ui-renderer-react-simple-<version>.tgz
npm install
snc ui-component develop
```

## Release

Pushing a `v2.x.x` tag publishes to npm (`.github/workflows/publish.yml`):

```bash
# update CHANGELOG.md first
npm version minor          # bumps package.json, commits, creates tag v2.x.y
git push --follow-tags     # the tag push triggers the publish workflow
```

The workflow checks that the tag matches `package.json`, runs the tests (which build `dist/`),
skips versions already on npm, and runs `npm publish --access public --provenance`.

One-time setup, either:
- **Trusted publishing (recommended):** on npmjs.com, package settings → Trusted Publisher →
  GitHub Actions, repository `quixomatic/ui-renderer-react-simple`, workflow `publish.yml`.
  No token needed.
- **Token:** add an npm automation token as the `NPM_TOKEN` repository secret.

To publish manually: `npm publish --access public`.

## Versioning

The setup script writes `^<major>.<minor>.0` for this package. Patch and minor releases reach existing
projects through a plain `npm update`. A major release needs `npx setup-servicenow-react` to be
run again.
