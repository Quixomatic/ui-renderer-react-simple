import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// npm 11.19+ silently drops bin entries whose path starts with "./" when publishing
// ("script name ... was invalid and removed"), which shipped 2.1.0 without its CLI commands.
test('bin entries survive npm publish normalization', () => {
	assert.ok(Object.keys(pkg.bin).length >= 4);
	for (const [name, file] of Object.entries(pkg.bin)) {
		assert.doesNotMatch(file, /^\.\//, `${name}: no leading ./`);
		assert.ok(fs.existsSync(new URL('../' + file, import.meta.url)), `${name}: ${file} exists`);
		assert.match(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /^#!\/usr\/bin\/env node/, `${name}: has a node shebang`);
		assert.ok(pkg.files.some((entry) => file.startsWith(entry.replace(/\/$/, ''))), `${name}: included in "files"`);
	}
});
