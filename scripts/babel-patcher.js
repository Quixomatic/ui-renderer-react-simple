/**
 * Automated ServiceNow Babel Plugin Patcher
 * 
 * This script automatically patches the ServiceNow babel plugin to correctly
 * handle @servicenow/ui-renderer-react without requiring manual modifications.
 * 
 * The issue: ServiceNow's babel plugin uses u() function which returns the
 * snabbdom module path for ALL renderers, including React ones.
 * 
 * The fix: Replace u() with the correct module path for React renderers.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class BabelPluginPatcher {
    constructor() {
        this.babelPluginPath = null;
        this.backupPath = null;
    }

    /**
     * Find the ServiceNow babel plugin file
     */
    findBabelPlugin() {
        const possiblePaths = [
            // Windows
            path.join(os.homedir(), '.snc', '.extensions', 'ui-component', 'node_modules', '@servicenow', 'cli', 'dist', 'babel', 'preset', 'seismic', 'index.js'),
            // macOS/Linux
            path.join(os.homedir(), '.snc', '.extensions', 'ui-component', 'node_modules', '@servicenow', 'cli', 'dist', 'babel', 'preset', 'seismic', 'index.js'),
            // Alternative locations
            path.join(process.cwd(), '.snc', '.extensions', 'ui-component', 'node_modules', '@servicenow', 'cli', 'dist', 'babel', 'preset', 'seismic', 'index.js'),
        ];

        for (const pluginPath of possiblePaths) {
            if (fs.existsSync(pluginPath)) {
                console.log(`✅ Found babel plugin: ${pluginPath}`);
                this.babelPluginPath = pluginPath;
                this.backupPath = pluginPath + '.backup';
                return true;
            }
        }

        console.error('❌ Could not find ServiceNow babel plugin file.');
        console.error('Searched in:');
        possiblePaths.forEach(p => console.error(`  - ${p}`));
        return false;
    }

    /**
     * Create a backup of the original file
     */
    createBackup() {
        if (!fs.existsSync(this.backupPath)) {
            fs.copyFileSync(this.babelPluginPath, this.backupPath);
            console.log(`✅ Created backup: ${this.backupPath}`);
        } else {
            console.log(`ℹ️  Backup already exists: ${this.backupPath}`);
        }
    }

    /**
     * Check if the file is already patched
     */
    isAlreadyPatched(content) {
        return content.includes(`'@servicenow/ui-renderer-react': { module: '@servicenow/ui-renderer-react', import: 'createElement', export: 'createElement' }`);
    }

    /**
     * Apply the patch to fix React renderer support
     */
    applyPatch() {
        try {
            let content = fs.readFileSync(this.babelPluginPath, 'utf8');

            if (this.isAlreadyPatched(content)) {
                console.log('✅ File is already patched!');
                return true;
            }

            // Find the babel plugin JSX configuration section
            const originalPattern = /'@servicenow\/ui-renderer-react':\s*{\s*module:\s*u\(\),\s*import:\s*'createElement'\s*}/g;
            const replacement = `'@servicenow/ui-renderer-react': { module: '@servicenow/ui-renderer-react', import: 'createElement', export: 'createElement' }`;

            if (content.match(originalPattern)) {
                content = content.replace(originalPattern, replacement);
                console.log('✅ Applied React renderer patch');
            } else {
                // Alternative: look for the imports section and patch it
                const importsPattern = /(imports:\s*{\s*[^}]+)'@servicenow\/ui-renderer-react':\s*{\s*module:\s*u\(\),\s*import:\s*'createElement'\s*}([^}]+})/s;
                
                if (content.match(importsPattern)) {
                    content = content.replace(importsPattern, (match, before, after) => {
                        return before + replacement + after;
                    });
                    console.log('✅ Applied React renderer patch (alternative method)');
                } else {
                    console.error('❌ Could not find the pattern to patch. The babel plugin structure may have changed.');
                    return false;
                }
            }

            // Remove any old @quixomatic/ui-renderer-react entries if they exist
            const quixomaticPattern = /,?\s*\/\/[^']*?\n\s*'@quixomatic\/ui-renderer-react':[^,}]+/g;
            if (content.match(quixomaticPattern)) {
                content = content.replace(quixomaticPattern, '');
                console.log('✅ Removed old @quixomatic/ui-renderer-react entries');
            }

            // Write the patched content
            fs.writeFileSync(this.babelPluginPath, content, 'utf8');
            console.log('✅ Successfully patched babel plugin!');
            return true;

        } catch (error) {
            console.error('❌ Error applying patch:', error.message);
            return false;
        }
    }

    /**
     * Restore from backup
     */
    restore() {
        if (fs.existsSync(this.backupPath)) {
            fs.copyFileSync(this.backupPath, this.babelPluginPath);
            console.log('✅ Restored from backup');
            return true;
        } else {
            console.error('❌ No backup file found');
            return false;
        }
    }

    /**
     * Verify the patch was applied correctly
     */
    verify() {
        try {
            const content = fs.readFileSync(this.babelPluginPath, 'utf8');
            const isPatched = this.isAlreadyPatched(content);
            
            if (isPatched) {
                console.log('✅ Patch verification successful!');
                console.log('✅ React renderer should now work without issues');
            } else {
                console.error('❌ Patch verification failed');
            }
            
            return isPatched;
        } catch (error) {
            console.error('❌ Error verifying patch:', error.message);
            return false;
        }
    }

    /**
     * Main execution function
     */
    run(action = 'patch') {
        if (!this.findBabelPlugin()) {
            return false;
        }

        switch (action) {
            case 'patch':
                this.createBackup();
                if (this.applyPatch()) {
                    this.verify();
                    return true;
                } else {
                    return false;
                }

            case 'restore':
                return this.restore();

            case 'verify':
                return this.verify();

            default:
                console.error('❌ Unknown action. Use: patch, restore, or verify');
                return false;
        }
    }
}

module.exports = BabelPluginPatcher;