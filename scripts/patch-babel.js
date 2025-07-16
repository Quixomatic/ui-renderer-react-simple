#!/usr/bin/env node

const BabelPatcher = require('./babel-patcher');

console.log('🔧 ServiceNow Babel Plugin Patcher');
console.log('===================================');

const patcher = new BabelPatcher();
const success = patcher.run('patch');

if (success) {
    console.log('\n🎉 Babel plugin patched successfully!');
    console.log('React renderer should now work without issues.');
} else {
    console.error('\n❌ Failed to patch babel plugin.');
    console.error('You may need to manually update the ServiceNow babel plugin file.');
    process.exit(1);
}