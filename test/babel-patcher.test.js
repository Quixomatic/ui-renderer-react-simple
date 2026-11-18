import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BabelPatcher = require('../scripts/babel-patcher.cjs');

// Shapes of the relevant snippets in @servicenow/cli (27.4.1 and 30.2.0). CLI_MIN is the
// externals list, which must NOT be touched.
const PRESET_PRETTIFIED = `imports: {
                    '@servicenow/ui-react-renderer': { module: u(), import: 'createElement' },
                    '@servicenow/ui-snabbdom-renderer': { module: '@servicenow/ui-snabbdom-renderer', import: 'createElement', export: 'createElement' },
                    '@servicenow/ui-renderer-react': { module: u(), import: 'createElement' },
                    '@servicenow/ui-renderer-snabbdom': { module: '@servicenow/ui-renderer-snabbdom', import: 'createElement', export: 'createElement' },
                  }`;
const PRESET_MINIFIED = `imports:{"@servicenow/ui-react-renderer":{module:m(),import:"createElement"},"@servicenow/ui-renderer-react":{module:m(),import:"createElement"},"@servicenow/ui-renderer-snabbdom":{module:"@servicenow/ui-renderer-snabbdom",import:"createElement",export:"createElement"}}`;
const PRESET_LEGACY_HAND_PATCHED = `imports: { '@servicenow/ui-renderer-react': { module: u(), import: 'createElement' }, '@quixomatic/ui-renderer-react': { module: '@quixomatic/ui-renderer-react', import: 'createElement' } }`;
const CLI_MIN = `68225:(e,t,r)=>{var n=r(47373),o=["sn-seismic-core","sn-translate"],i=["sn-translate","react","react-dom","@devsnc/library-uxf","amb-client-js"];e.exports=function(e){return n.any(e,i)}}`;

const PRESET_FILE = ['dist', 'babel', 'preset', 'seismic', 'index.js'];
const CLI_FILE = ['dist', 'servicenow-cli.min.js'];
const silent = { log() {}, error() {} };

function withCli({ preset = PRESET_MINIFIED, cli = CLI_MIN } = {}, fn) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-cli-'));
	const presetPath = path.join(root, ...PRESET_FILE);
	const cliPath = path.join(root, ...CLI_FILE);
	fs.mkdirSync(path.dirname(presetPath), { recursive: true });
	fs.writeFileSync(presetPath, preset);
	fs.writeFileSync(cliPath, cli);
	const read = (p) => fs.readFileSync(p, 'utf8');
	try {
		return fn({ presetPath, cliPath, read, patcher: new BabelPatcher({ cliRoot: root, ...silent }) });
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

for (const [name, preset] of Object.entries({ PRESET_PRETTIFIED, PRESET_MINIFIED })) {
	test(`patches the ${name.toLowerCase().replace('preset_', '')} preset and keeps other entries`, () => {
		withCli({ preset }, ({ presetPath, read, patcher }) => {
			assert.equal(patcher.run('patch'), true);
			const out = read(presetPath);
			assert.match(out, /"@servicenow\/ui-renderer-react": \{ module: "@servicenow\/ui-renderer-react", import: "createElement", export: "createElement" \}/);
			assert.match(out, /ui-react-renderer['"]:\s*\{\s*module:\s*[um]\(\)/, 'unrelated entries untouched');
			assert.match(out, /ui-renderer-snabbdom/);
			assert.equal(read(presetPath + '.backup'), preset, 'backup is the stock file');
		});
	});
}

test('leaves the CLI externals list alone (React is bundled, not externalized)', () => {
	withCli({}, ({ cliPath, read, patcher }) => {
		assert.equal(patcher.run('patch'), true);
		assert.equal(read(cliPath), CLI_MIN);
		assert.equal(fs.existsSync(cliPath + '.backup'), false);
	});
});

test('verify fails until the preset is patched', () => {
	withCli({}, ({ presetPath, patcher }) => {
		assert.equal(patcher.run('verify'), false);
		patcher.run('patch');
		assert.equal(patcher.run('verify'), true);
		fs.writeFileSync(presetPath, PRESET_MINIFIED); // e.g. a CLI reinstall
		assert.equal(patcher.run('verify'), false);
	});
});

test('patching twice is a no-op and keeps the stock backup', () => {
	withCli({}, ({ presetPath, read, patcher }) => {
		patcher.run('patch');
		const once = read(presetPath);
		assert.equal(patcher.run('patch'), true);
		assert.equal(read(presetPath), once);
		assert.equal(read(presetPath + '.backup'), PRESET_MINIFIED);
	});
});

test('restore puts the stock preset back', () => {
	withCli({ preset: PRESET_PRETTIFIED }, ({ presetPath, read, patcher }) => {
		patcher.run('patch');
		assert.equal(patcher.run('restore'), true);
		assert.equal(read(presetPath), PRESET_PRETTIFIED);
	});
});

test('a CLI upgrade (new unpatched preset) refreshes the backup', () => {
	withCli({ preset: PRESET_PRETTIFIED }, ({ presetPath, read, patcher }) => {
		patcher.run('patch');
		fs.writeFileSync(presetPath, PRESET_MINIFIED);
		patcher.run('patch');
		assert.equal(read(presetPath + '.backup'), PRESET_MINIFIED);
	});
});

test('removes legacy @quixomatic/ui-renderer-react preset entries', () => {
	withCli({ preset: PRESET_LEGACY_HAND_PATCHED }, ({ presetPath, read, patcher }) => {
		assert.equal(patcher.run('patch'), true);
		assert.doesNotMatch(read(presetPath), /@quixomatic/);
	});
});

test('fails cleanly and leaves the file alone when the mapping is missing', () => {
	withCli({ preset: 'module.exports = {}' }, ({ presetPath, read, patcher }) => {
		assert.equal(patcher.run('patch'), false);
		assert.equal(read(presetPath), 'module.exports = {}');
		assert.equal(fs.existsSync(presetPath + '.backup'), false);
	});
});

// --- exports patch (webpack resolve.exportsFields) -------------------------------
const CLI_27_RESOLVE = 'a={resolve:{mainFiles:["src/index","index"],symlinks:!0,exportsFields:[],mainFields:["module","browser","main"]}};'
	+ 'b={resolve:{symlinks:!0,exportsFields:[],mainFields:["module","browser","main"]}};'
	+ CLI_MIN;
const CLI_30_RESOLVE = 'a={resolve:{symlinks:!0,mainFields:["module","browser","main"],exportsFields:["exports"]}};' + CLI_MIN;

test('exports patch enables exports in every CLI 27.x webpack config, except for ServiceNow packages', () => {
	withCli({ cli: CLI_27_RESOLVE }, ({ cliPath, read, patcher }) => {
		assert.equal(patcher.run('verify'), false);
		assert.equal(patcher.run('patch'), true);
		const out = read(cliPath);
		assert.doesNotMatch(out, /exportsFields:\[\],mainFields/, 'no config disables exports globally any more');
		const head = 'exportsFields:["exports"],mainFields:["module","browser","main"]},module:{rules:[/*sn-react:exports*/';
		assert.equal(out.split(head).length - 1, 2, 'one rule per config, right after its resolve object');
		// The injected rule is valid JS and turns exports off only for requests from ServiceNow packages.
		const start = out.indexOf(head) + head.indexOf('module:');
		const injected = out.slice(start, out.indexOf('}}]}', start) + 4); // module:{rules:[...]}
		const rule = new Function('return {' + injected + '}')().module.rules[0];
		assert.deepEqual(rule.resolve, { exportsFields: [] });
		assert.ok(rule.test.test('/proj/node_modules/@radix-ui/react-dialog/dist/index.mjs'));
		assert.equal(rule.include.test('/proj/node_modules/.pnpm/@servicenow+ui-renderer-snabbdom@24.1.1/node_modules/@servicenow/ui-renderer-snabbdom/module/index.js'), true);
		assert.equal(rule.include.test('C:\\proj\\node_modules\\snabbdom\\build\\package\\h.js'), true);
		assert.equal(rule.include.test('/proj/node_modules/sn-http-request/index.js'), true);
		assert.equal(rule.include.test('/proj/src/my-component/view.js'), false);
		assert.equal(rule.include.test('/proj/node_modules/.pnpm/radix-ui@1.8.1/node_modules/radix-ui/dist/index.mjs'), false);
		assert.ok(out.includes(CLI_MIN), 'nothing else in the file changes');
		assert.equal(read(cliPath + '.backup'), CLI_27_RESOLVE);
		assert.equal(patcher.run('verify'), true);
		assert.equal(patcher.run('restore'), true);
		assert.equal(read(cliPath), CLI_27_RESOLVE);
	});
});

test('exports patch is a no-op on CLI 30.x, which already enables exports', () => {
	withCli({ cli: CLI_30_RESOLVE }, ({ cliPath, read, patcher }) => {
		assert.equal(patcher.run('patch'), true);
		assert.equal(read(cliPath), CLI_30_RESOLVE);
		assert.equal(fs.existsSync(cliPath + '.backup'), false);
	});
});
