#!/usr/bin/env node

const BabelPatcher = require('./babel-patcher');

console.log('🔧 ServiceNow Babel Plugin Restore');
console.log('===================================');

const patcher = new BabelPatcher();
const success = patcher.run('restore');

if (success) {
    console.log('\n✅ Babel plugin restored from backup successfully!');
    console.log('ServiceNow babel plugin is back to its original state.');
} else {
    console.error('\n❌ Failed to restore babel plugin.');
    console.error('No backup file found or restore operation failed.');
    process.exit(1);
}