/**
 * ServiceNow CLI patcher (ui-component extension, @servicenow/cli).
 *
 * The babel preset (dist/babel/preset/seismic/index.js) maps JSX in React components
 * to `createElement` from `sn-custom-create-element`, which bundles React 16. React 19
 * refuses those elements ("Objects are not valid as a React child"), so we point the
 * `@servicenow/ui-renderer-react` mapping at the renderer's own createElement.
 *
 * The CLI's webpack configs (dist/servicenow-cli.min.js, CLI 27.x) set
 * `exportsFields: []`, so package.json "exports" maps are ignored and exports-only
 * subpaths such as `@radix-ui/primitive/is-development` (Radix / shadcn) fail to
 * resolve. The "exports" patch turns exports on globally, as CLI 30.x does, which the
 * deploy build's per-package resolver needs. It also adds a module rule so requests made
 * *from* ServiceNow packages keep resolving without exports: in the dev server those
 * packages are bundled, and @servicenow/ui-renderer-snabbdom 24.x deep-imports
 * `snabbdom/build/package/*`, which snabbdom's exports map forbids. (In deploy builds
 * ServiceNow's ui packages are instance externals, so they are never resolved.)
 * CLI 30.x already enables exports everywhere; there the patch is a no-op.
 *
 * React itself needs no CLI patch: it is bundled into this package and reached through
 * the react-shim folder that setup-servicenow-react writes, so it never uses the
 * instance's shared React 16 asset.
 *
 * Each patched file is backed up next to itself (`<file>.backup`).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI_SUBPATH = ['.snc', '.extensions', 'ui-component', 'node_modules', '@servicenow', 'cli'];

const PATCHED_ENTRY = `"@servicenow/ui-renderer-react": { module: "@servicenow/ui-renderer-react", import: "createElement", export: "createElement" }`;
// Any `@servicenow/ui-renderer-react` mapping that imports createElement, whatever its module expression.
const RENDERER_ENTRY = /(["'])@servicenow\/ui-renderer-react\1\s*:\s*\{\s*module\s*:\s*[^,}]+,\s*import\s*:\s*(["'])createElement\2[^}]*\}/g;
const RENDERER_PATCHED = /(["'])@servicenow\/ui-renderer-react\1\s*:\s*\{\s*module\s*:\s*(["'])@servicenow\/ui-renderer-react\2\s*,\s*import\s*:\s*(["'])createElement\3\s*,\s*export\s*:\s*(["'])createElement\4\s*\}/;
// Entries added by hand-patched presets for the old @quixomatic/ui-renderer-react package.
const LEGACY_QUIXOMATIC_ENTRY = /,?\s*(["'])@quixomatic\/ui-renderer-react\1\s*:\s*\{[^}]*\}/g;

// webpack resolve configs in CLI 27.x end with: ...exportsFields:[],mainFields:["module","browser","main"]}
// The patch enables exports there and appends a sibling `module.rules` entry.
const EXPORTS_MARKER = '/*sn-react:exports*/';
const RESOLVE_WITHOUT_EXPORTS = /exportsFields\s*:\s*\[\s*\]\s*,\s*(mainFields\s*:\s*\[\s*"module"\s*,\s*"browser"\s*,\s*"main"\s*\]\s*\})/g;
// Requests issued from ServiceNow packages keep the old no-exports resolution.
const SERVICENOW_EXPORTS_RULE = String.raw`,module:{rules:[` + EXPORTS_MARKER +
	String.raw`{test:/\.[cm]?[jt]sx?$/,include:/[\\/](?:@servicenow|@devsnc|@seismic|@tectonic|snabbdom|sn-[\w.-]+)[\\/]/,resolve:{exportsFields:[]}}]}`;
const countMatches = (content, re) => (content.match(re) || []).length;
const countMarkers = (content) => content.split(EXPORTS_MARKER).length - 1;

const TARGETS = [
	{
		id: 'preset',
		label: 'babel preset (JSX -> React 19 createElement)',
		file: ['dist', 'babel', 'preset', 'seismic', 'index.js'],
		isPatched: (content) => RENDERER_PATCHED.test(content),
		patch(content) {
			if (content.search(RENDERER_ENTRY) === -1) return { error: 'Could not find the @servicenow/ui-renderer-react JSX mapping.' };
			return { content: content.replace(RENDERER_ENTRY, PATCHED_ENTRY).replace(LEGACY_QUIXOMATIC_ENTRY, '') };
		},
		describe(content) {
			return content.match(/(["'])@servicenow\/ui-renderer-react\1[^}]+\}/g) || [];
		}
	},
	{
		id: 'exports',
		label: 'package.json "exports" enabled (Radix/shadcn subpaths), off for ServiceNow packages',
		file: ['dist', 'servicenow-cli.min.js'],
		// Patched when no webpack config disables exports any more. CLI 30.x has none.
		isPatched: (content) => countMatches(content, RESOLVE_WITHOUT_EXPORTS) === 0,
		patch(content) {
			if (countMarkers(content) > 0) return { error: 'Partially patched file; run restore-servicenow-babel first.' };
			return { content: content.replace(RESOLVE_WITHOUT_EXPORTS, 'exportsFields:["exports"],$1' + SERVICENOW_EXPORTS_RULE) };
		},
		describe(content) {
			return [`webpack configs with exports disabled: ${countMatches(content, RESOLVE_WITHOUT_EXPORTS)}, ServiceNow no-exports rules: ${countMarkers(content)}`];
		}
	}
];

class BabelPluginPatcher {
	constructor(options = {}) {
		this.log = options.log || console.log;
		this.error = options.error || console.error;
		this.cliRoot = options.cliRoot || null;
	}

	candidateRoots() {
		const candidates = [];
		if (process.env.SNC_CLI_PATH) candidates.push(process.env.SNC_CLI_PATH);
		candidates.push(path.join(os.homedir(), ...CLI_SUBPATH));
		candidates.push(path.join(process.cwd(), ...CLI_SUBPATH));
		return [...new Set(candidates)];
	}

	findCli() {
		if (this.cliRoot) return fs.existsSync(this.cliRoot);
		const candidates = this.candidateRoots();
		const found = candidates.find((root) => TARGETS.every((t) => fs.existsSync(path.join(root, ...t.file))));
		if (found) {
			this.cliRoot = found;
			this.log(`✅ Found ServiceNow CLI: ${found}`);
			return true;
		}
		this.error('❌ Could not find the ServiceNow CLI (ui-component extension). Searched:');
		candidates.forEach((p) => this.error(`  - ${p}`));
		this.error('Install it with: snc extension add --name ui-component');
		this.error('or set SNC_CLI_PATH to the @servicenow/cli folder.');
		return false;
	}

	// Kept for callers of v1's API.
	findBabelPlugin() {
		return this.findCli();
	}

	pathOf(target) {
		return path.join(this.cliRoot, ...target.file);
	}

	read(target) {
		return fs.readFileSync(this.pathOf(target), 'utf8');
	}

	/**
	 * Back up the stock file. The backup is refreshed whenever the live file is
	 * unpatched, so a CLI upgrade never leaves an old version's backup behind.
	 */
	backup(target, content) {
		const backupPath = this.pathOf(target) + '.backup';
		if (target.isPatched(content)) {
			if (!fs.existsSync(backupPath)) this.log(`⚠️  ${target.id}: already patched and no backup exists; restore will not be available.`);
			return;
		}
		fs.writeFileSync(backupPath, content, 'utf8');
		this.log(`✅ ${target.id}: backed up stock file -> ${backupPath}`);
	}

	patchTarget(target) {
		try {
			const content = this.read(target);
			if (target.isPatched(content)) {
				this.log(`✅ ${target.id}: already patched`);
				return true;
			}
			const result = target.patch(content);
			if (result.error) {
				this.error(`❌ ${target.id}: ${result.error} The ServiceNow CLI format may have changed; run with --debug.`);
				return false;
			}
			this.backup(target, content);
			fs.writeFileSync(this.pathOf(target), result.content, 'utf8');
			this.log(`✅ ${target.id}: patched - ${target.label}`);
			return true;
		} catch (error) {
			this.error(`❌ ${target.id}: ${error.message}`);
			return false;
		}
	}

	applyPatch() {
		return TARGETS.map((t) => this.patchTarget(t)).every(Boolean);
	}

	restore() {
		let ok = true;
		for (const target of TARGETS) {
			const backupPath = this.pathOf(target) + '.backup';
			if (!fs.existsSync(backupPath)) {
				// Never patched (e.g. the exports patch on CLI 30.x): nothing to restore.
				let patchedWithoutBackup = false;
				try { patchedWithoutBackup = target.id === 'preset' && target.isPatched(this.read(target)); } catch (error) { /* unreadable */ }
				if (patchedWithoutBackup) {
					this.error(`❌ ${target.id}: patched, but no backup at ${backupPath}`);
					ok = false;
				} else {
					this.log(`ℹ️  ${target.id}: nothing to restore`);
				}
				continue;
			}
			fs.copyFileSync(backupPath, this.pathOf(target));
			this.log(`✅ ${target.id}: restored stock file`);
		}
		return ok;
	}

	verify() {
		let ok = true;
		for (const target of TARGETS) {
			let patched = false;
			try { patched = target.isPatched(this.read(target)); } catch (error) { this.error(`❌ ${target.id}: ${error.message}`); }
			if (patched) this.log(`✅ ${target.id}: patched`);
			else this.error(`❌ ${target.id}: NOT patched - ${target.label}`);
			ok = ok && patched;
		}
		return ok;
	}

	debug() {
		this.log('🔍 ServiceNow CLI patch status');
		this.log(`CLI: ${this.cliRoot}`);
		for (const target of TARGETS) {
			const file = this.pathOf(target);
			try {
				const content = this.read(target);
				this.log(`\n[${target.id}] ${file}`);
				this.log(`  patched: ${target.isPatched(content) ? 'yes' : 'no'} | backup: ${fs.existsSync(file + '.backup') ? 'yes' : 'no'} | ${content.length} bytes`);
				target.describe(content).forEach((d) => this.log(`  ${d}`));
			} catch (error) {
				this.error(`  ❌ ${error.message}`);
			}
		}
		return true;
	}

	run(action = 'patch') {
		if (!this.findCli()) return false;
		switch (action) {
			case 'patch':
				if (this.applyPatch()) return this.verify();
				this.debug();
				return false;
			case 'restore':
				return this.restore();
			case 'verify':
				return this.verify();
			case 'debug':
				return this.debug();
			default:
				this.error(`❌ Unknown action "${action}". Use: patch, restore, verify, or debug.`);
				return false;
		}
	}
}

BabelPluginPatcher.TARGETS = TARGETS;
module.exports = BabelPluginPatcher;
