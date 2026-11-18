#!/usr/bin/env node

const BabelPatcher = require('./babel-patcher.cjs');

console.log('🔧 Restoring the stock ServiceNow CLI files');
if (!new BabelPatcher().run('restore')) process.exit(1);
console.log('Note: React 19 components will not build or deploy correctly until you run patch-servicenow-babel again.');
