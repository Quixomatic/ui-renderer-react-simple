#!/usr/bin/env node

// Usage: patch-servicenow-babel [--verify | --debug]
// Patches the ServiceNow CLI's babel preset and externals list for React 19.
const BabelPatcher = require('./babel-patcher.cjs');

const args = process.argv.slice(2);
const action = args.includes('--verify') ? 'verify' : args.includes('--debug') ? 'debug' : 'patch';

console.log(`🔧 ServiceNow CLI (React 19 support): ${action}`);
const ok = new BabelPatcher().run(action);

if (!ok) {
	if (action === 'patch') console.error('\n❌ Failed to patch the ServiceNow CLI.');
	process.exit(1);
}
if (action === 'patch') console.log('\n🎉 ServiceNow CLI patched. Restart `snc ui-component develop` if it is running.');
