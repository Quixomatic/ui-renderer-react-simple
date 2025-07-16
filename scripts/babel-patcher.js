/**
 * Improved ServiceNow Babel Plugin Patcher
 * 
 * This version handles both minified and non-minified babel plugins by using
 * more flexible regex patterns that account for:
 * - Different function names (u(), m(), etc.)
 * - Single or double quotes
 * - Variable whitespace
 * - Minification patterns
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
        // More flexible pattern to detect if already patched
        const patchedPattern = /['"]@servicenow\/ui-renderer-react['"]:\s*{\s*module:\s*['"]@servicenow\/ui-renderer-react['"],\s*import:\s*['"]createElement['"],?\s*export:\s*['"]createElement['"]/;
        return patchedPattern.test(content);
    }

    /**
     * Extract the current function name used in the babel plugin (u(), m(), etc.)
     */
    extractFunctionName(content) {
        // Look for pattern like: "@servicenow/ui-snabbdom-renderer":{module:"@servicenow/ui-snabbdom-renderer"
        // This tells us this is the correct pattern, and we can find the function used for React
        const snabbdomPattern = /['"]@servicenow\/ui-snabbdom-renderer['"]:\s*{\s*module:\s*['"]@servicenow\/ui-snabbdom-renderer['"]/;
        
        if (snabbdomPattern.test(content)) {
            console.log('✅ Detected non-minified babel plugin (uses string literals)');
            return 'string-literal'; // Special marker for non-minified
        }

        // Look for React renderer with function call
        const reactFunctionPattern = /['"]@servicenow\/ui-renderer-react['"]:\s*{\s*module:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\(\)/;
        const match = content.match(reactFunctionPattern);
        
        if (match) {
            const functionName = match[1];
            console.log(`✅ Detected minified babel plugin (function: ${functionName}())`);
            return functionName;
        }

        console.log('⚠️  Could not determine babel plugin format');
        return null;
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

            const functionName = this.extractFunctionName(content);
            if (!functionName) {
                console.error('❌ Could not determine babel plugin format');
                return false;
            }

            let patched = false;

            if (functionName === 'string-literal') {
                // Non-minified version - look for u() pattern
                const patterns = [
                    // Pattern 1: Look for u() function
                    {
                        regex: /(["'])@servicenow\/ui-renderer-react\1:\s*{\s*module:\s*u\(\),\s*import:\s*(["'])createElement\2\s*}/g,
                        replacement: `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`
                    },
                    // Pattern 2: Alternative whitespace/quote variations
                    {
                        regex: /(["'])@servicenow\/ui-renderer-react\1:\s*{\s*module:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\(\),\s*import:\s*(["'])createElement\2\s*}/g,
                        replacement: `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`
                    }
                ];

                for (const pattern of patterns) {
                    if (content.match(pattern.regex)) {
                        content = content.replace(pattern.regex, pattern.replacement);
                        console.log('✅ Applied React renderer patch (non-minified)');
                        patched = true;
                        break;
                    }
                }
            } else {
                // Minified version - use the detected function name
                const patterns = [
                    // Pattern 1: Exact function match
                    {
                        regex: new RegExp(`(["'])@servicenow\\/ui-renderer-react\\1:\\s*{\\s*module:\\s*${functionName}\\(\\),\\s*import:\\s*(["'])createElement\\2\\s*}`, 'g'),
                        replacement: `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`
                    },
                    // Pattern 2: Any function call pattern (fallback)
                    {
                        regex: /(["'])@servicenow\/ui-renderer-react\1:\s*{\s*module:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\(\),\s*import:\s*(["'])createElement\2\s*}/g,
                        replacement: `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`
                    }
                ];

                for (const pattern of patterns) {
                    if (content.match(pattern.regex)) {
                        content = content.replace(pattern.regex, pattern.replacement);
                        console.log(`✅ Applied React renderer patch (minified, function: ${functionName}())`);
                        patched = true;
                        break;
                    }
                }
            }

            if (!patched) {
                // Final fallback - try to find and replace any React renderer entry
                const fallbackPattern = /(["'])@servicenow\/ui-renderer-react\1:\s*{\s*module:\s*[^,}]+,\s*import:\s*(["'])createElement\2[^}]*}/g;
                if (content.match(fallbackPattern)) {
                    content = content.replace(fallbackPattern, `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`);
                    console.log('✅ Applied React renderer patch (fallback method)');
                    patched = true;
                } else {
                    console.error('❌ Could not find the React renderer pattern to patch.');
                    console.error('The babel plugin structure may have changed significantly.');
                    
                    // Debug: show what we found
                    const reactEntries = content.match(/(["'])@servicenow\/ui-renderer-react\1[^}]+}/g);
                    if (reactEntries) {
                        console.error('Found React renderer entries:');
                        reactEntries.forEach(entry => console.error(`  ${entry}`));
                    }
                    
                    return false;
                }
            }

            // Remove any old @quixomatic/ui-renderer-react entries if they exist
            const quixomaticPatterns = [
                /,?\s*\/\/[^'"]*?\n\s*(["'])@quixomatic\/ui-renderer-react\1:[^,}]+/g,
                /,?\s*(["'])@quixomatic\/ui-renderer-react\1:[^,}]+/g
            ];

            for (const pattern of quixomaticPatterns) {
                if (content.match(pattern)) {
                    content = content.replace(pattern, '');
                    console.log('✅ Removed old @quixomatic/ui-renderer-react entries');
                }
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
                console.error('The React renderer may not work correctly');
            }
            
            return isPatched;
        } catch (error) {
            console.error('❌ Error verifying patch:', error.message);
            return false;
        }
    }

    /**
     * Debug method to analyze the babel plugin structure
     */
    debug() {
        try {
            const content = fs.readFileSync(this.babelPluginPath, 'utf8');
            
            console.log('🔍 Babel Plugin Analysis:');
            console.log('========================');
            
            // Check if minified
            const isMinified = content.length > 1000 && !content.includes('\n  ');
            console.log(`Minified: ${isMinified ? 'Yes' : 'No'}`);
            
            // Find React renderer entries
            const reactPattern = /(["'])@servicenow\/ui-renderer-react\1[^}]+}/g;
            const reactEntries = content.match(reactPattern);
            
            if (reactEntries) {
                console.log('\nFound React renderer entries:');
                reactEntries.forEach((entry, i) => {
                    console.log(`  ${i + 1}. ${entry}`);
                });
            } else {
                console.log('\n❌ No React renderer entries found');
            }
            
            // Check function pattern
            const functionName = this.extractFunctionName(content);
            if (functionName) {
                console.log(`\nFunction pattern: ${functionName}()`);
            }
            
            console.log('\n========================');
            
        } catch (error) {
            console.error('❌ Error analyzing babel plugin:', error.message);
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
                    console.log('\n🔍 Running debug analysis...');
                    this.debug();
                    return false;
                }

            case 'restore':
                return this.restore();

            case 'verify':
                return this.verify();

            case 'debug':
                this.debug();
                return true;

            default:
                console.error('❌ Unknown action. Use: patch, restore, verify, or debug');
                return false;
        }
    }
}

module.exports = BabelPluginPatcher;