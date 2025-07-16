#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const BabelPatcher = require('./babel-patcher');

console.log('🔧 Setting up ServiceNow React 18 renderer...');

try {
  // Create the fake ServiceNow package directory
  const targetDir = path.join(process.cwd(), 'src/node_modules/@servicenow/ui-renderer-react');
  console.log(`📁 Creating directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy renderer files from the installed package
  const sourcePackage = path.join(process.cwd(), 'node_modules/@quixomatic/ui-renderer-react-simple');
  
  if (!fs.existsSync(sourcePackage)) {
    console.error('❌ @quixomatic/ui-renderer-react-simple not found.');
    console.error('   Please run: npm install @quixomatic/ui-renderer-react-simple');
    process.exit(1);
  }

  // Copy the renderer index.js
  const sourceIndex = path.join(sourcePackage, 'index.js');
  const targetIndex = path.join(targetDir, 'index.js');
  
  if (fs.existsSync(sourceIndex)) {
    fs.copyFileSync(sourceIndex, targetIndex);
    console.log('✅ Copied renderer index.js');
  } else {
    console.error('❌ Source index.js not found');
    process.exit(1);
  }

  // Create package.json for the fake package
  const fakePackageJson = {
    "name": "@servicenow/ui-renderer-react",
    "version": "2.0.0",
    "description": "React 18 renderer for ServiceNow UI Framework",
    "main": "index.js",
    "peerDependencies": {
      "react": "^18.0.0",
      "react-dom": "^18.0.0"
    }
  };

  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(fakePackageJson, null, 2)
  );
  console.log('✅ Created fake package.json');

  // Update project package.json
  const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(projectPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, 'utf8'));
    
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    // Add the file dependency
    packageJson.dependencies['@servicenow/ui-renderer-react'] = 'file:src/node_modules/@servicenow/ui-renderer-react';
    
    // Ensure React 18 dependencies
    if (!packageJson.dependencies.react) {
      packageJson.dependencies.react = '^18.3.1';
    }
    if (!packageJson.dependencies['react-dom']) {
      packageJson.dependencies['react-dom'] = '^18.3.1';
    }
    
    fs.writeFileSync(projectPackageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');
  } else {
    console.error('❌ package.json not found in current directory');
    process.exit(1);
  }

  console.log('🎉 Fake package setup complete!');
  console.log('');
  
  // Patch the ServiceNow babel plugin
  console.log('🔧 Patching ServiceNow babel plugin...');
  const patcher = new BabelPatcher();
  const patchSuccess = patcher.run('patch');
  
  if (patchSuccess) {
    console.log('🎉 Complete setup finished successfully!');
    console.log('');
    console.log('✅ React 18 is now ready to use in ServiceNow components!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: snc ui-component develop');
    console.log('3. Import in your components: import react from "@servicenow/ui-renderer-react"');
    console.log('');
    console.log('To restore the original babel plugin: npx restore-servicenow-babel');
  } else {
    console.log('⚠️  Fake package created, but babel plugin patching failed.');
    console.log('You may need to manually patch the babel plugin or run:');
    console.log('npx patch-servicenow-babel');
  }
  
  console.log('');
  console.log('Example usage:');
  console.log('```javascript');
  console.log('import { createCustomElement } from "@servicenow/ui-core";');
  console.log('import react from "@servicenow/ui-renderer-react";');
  console.log('');
  console.log('createCustomElement("my-component", {');
  console.log('    renderer: { type: react },');
  console.log('    view: MyReactComponent,');
  console.log('    properties: { /* props */ }');
  console.log('});');
  console.log('```');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  console.error('');
  console.error('Manual setup instructions:');
  console.error('1. mkdir -p src/node_modules/@servicenow/ui-renderer-react');
  console.error('2. Copy files from node_modules/@quixomatic/ui-renderer-react-simple/');
  console.error('3. Add to package.json: "@servicenow/ui-renderer-react": "file:src/node_modules/@servicenow/ui-renderer-react"');
  console.error('4. Run npm install');
  process.exit(1);
}