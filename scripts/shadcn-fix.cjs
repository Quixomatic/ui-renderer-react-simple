#!/usr/bin/env node

// Usage: servicenow-shadcn-fix [dir=src/components/ui] [--check]
//
// Run after every `shadcn add`. Makes generated shadcn/ui components (Base UI or Radix)
// work inside ServiceNow components:
//
// 1. React import. ServiceNow's JSX babel plugin only compiles a file's JSX for React
//    when the file imports "react"; otherwise it uses snabbdom's createElement and the
//    component crashes ("tag.indexOf is not a function"). shadcn files written for the
//    automatic JSX runtime (button, input, ...) don't import React, so one is added.
//
// 2. Portals. Overlays portal into document.body, outside the component's shadow root,
//    so they render unstyled. `container={usePortalContainer()}` sends them to the
//    renderer's overlay layer instead (styled, and not clipped by UI Builder containers).
//
// Idempotent. --check reports files that still need fixing and exits 1 (for CI).

const fs = require('fs');
const path = require('path');

const RENDERER = '@servicenow/ui-renderer-react';
const args = process.argv.slice(2);
const check = args.includes('--check');
const dir = args.find((a) => !a.startsWith('--')) || path.join('src', 'components', 'ui');

// <SomethingPrimitive.Portal ...> without a container prop on the tag.
const PORTAL_OPEN = /<([A-Za-z_$][\w$]*)\.Portal\b(?![^>]*\bcontainer=)/g;
const HAS_JSX = /<[A-Za-z][\w.]*[\s/>]/;
const IMPORTS_REACT = /^import\s[^;]*?from\s+["']react["']/m;
const IMPORTS_HOOK = /import\s*\{[^}]*\busePortalContainer\b[^}]*\}\s*from/;

function lastImportEnd(source) {
	const imports = [...source.matchAll(/^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$/gm)];
	return imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : -1;
}

function addAfterImports(source, line) {
	const at = lastImportEnd(source);
	if (at === -1) return line + '\n' + source;
	return source.slice(0, at) + '\n' + line + source.slice(at);
}

function addReactImport(source) {
	const line = 'import * as React from "react"';
	// Keep a leading "use client" directive first.
	const directive = /^(["']use client["'];?[ \t]*\r?\n)/.exec(source);
	if (directive) return directive[1] + '\n' + line + '\n' + source.slice(directive[1].length).replace(/^\r?\n/, '');
	return line + '\n' + source;
}

function fix(source) {
	let next = source;
	const notes = [];
	if (HAS_JSX.test(next) && !IMPORTS_REACT.test(next)) {
		next = addReactImport(next);
		notes.push('react import');
	}
	PORTAL_OPEN.lastIndex = 0;
	if (PORTAL_OPEN.test(next)) {
		PORTAL_OPEN.lastIndex = 0;
		next = next.replace(PORTAL_OPEN, '<$1.Portal container={usePortalContainer()}');
		notes.push('portal container');
	}
	if (/container=\{usePortalContainer\(\)\}/.test(next) && !IMPORTS_HOOK.test(next)) {
		next = addAfterImports(next, `import { usePortalContainer } from "${RENDERER}"`);
		if (!notes.includes('portal container')) notes.push('portal import');
	}
	return { next, notes };
}

if (require.main === module) {
	if (!fs.existsSync(dir)) {
		console.error(`❌ ${dir} not found. Pass your shadcn ui folder: servicenow-shadcn-fix <dir>`);
		process.exit(1);
	}
	const results = [];
	for (const file of fs.readdirSync(dir).filter((f) => /\.(jsx?|tsx?)$/.test(f))) {
		const full = path.join(dir, file);
		const source = fs.readFileSync(full, 'utf8');
		const { next, notes } = fix(source);
		if (next === source) continue;
		results.push(`${file} (${notes.join(', ')})`);
		if (!check) fs.writeFileSync(full, next);
	}
	if (!results.length) {
		console.log(`✅ ${dir}: all components ready for ServiceNow.`);
	} else if (check) {
		console.error(`❌ Needs servicenow-shadcn-fix: ${results.join('; ')}`);
		process.exit(1);
	} else {
		console.log(`✅ Fixed: ${results.join('; ')}`);
	}
}

module.exports = { fix };
