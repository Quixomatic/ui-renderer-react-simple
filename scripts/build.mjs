// Builds dist/index.js: React 19 + react-dom + the renderer in ONE ES module.
//
// Why bundle React? On an instance, the CLI deploys each npm package as a shared
// asset guarded by a page global named after the package (window.__TECTONIC__react).
// ServiceNow pages load the platform's React 16 into that same global first, so a
// separately deployed `react` 19 asset steps aside and hands out React 16. Bundled
// here, React 19 lives under this package's own global and never collides.
//
// The module exports the full `react`, `react-dom`, `react-dom/client` and
// `react/jsx-runtime` APIs plus the ui-core renderer, so one copy can stand in for
// all of them (see the shim that setup-servicenow-react creates).

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

const validName = (n) => /^[A-Za-z_$][\w$]*$/.test(n) && n !== 'default';
const taken = new Set();
const pick = (names) => names.filter((n) => validName(n) && !taken.has(n) && taken.add(n));

process.env.NODE_ENV = 'production';
const reactNames = pick(Object.keys(require('react')));
const domNames = pick(Object.keys(require('react-dom'))); // `version` already taken by react
const clientNames = pick(Object.keys(require('react-dom/client')));
const jsxNames = pick(Object.keys(require('react/jsx-runtime'))); // jsx, jsxs (Fragment taken)
const rendererNames = pick(['onConnect', 'onDisconnect', 'onStateChange', 'usePortalContainer']);

const entry = `
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as JSXRuntime from 'react/jsx-runtime';
import { rendererInterface, ${rendererNames.join(', ')} } from './src/renderer.js';

export const { ${reactNames.join(', ')} } = React;
export const { ${domNames.join(', ')} } = ReactDOM;
export const { ${clientNames.join(', ')} } = ReactDOMClient;
export const { ${jsxNames.join(', ')} } = JSXRuntime;
// The production jsx-dev-runtime has no jsxDEV; map it to jsx for dev-mode JSX transforms.
export const jsxDEV = (type, props, key) => JSXRuntime.jsx(type, props, key);
export { ${rendererNames.join(', ')} };

// Default export: works as \`import React from 'react'\`, as
// \`import ReactDOM from 'react-dom'\`, and as the ui-core renderer
// (\`renderer: { type: react }\` reads onConnect / onStateChange / onDisconnect).
export default Object.assign(
	{},
	{ ${reactNames.map((n) => `${n}: React.${n}`).join(', ')} },
	{ ${domNames.map((n) => `${n}: ReactDOM.${n}`).join(', ')} },
	{ ${clientNames.map((n) => `${n}: ReactDOMClient.${n}`).join(', ')} },
	{ jsx: JSXRuntime.jsx, jsxs: JSXRuntime.jsxs, jsxDEV },
	{ usePortalContainer },
	rendererInterface
);
`;

const entryFile = path.join(root, '.build-entry.js');
fs.writeFileSync(entryFile, entry);
try {
	await build({
		entryPoints: [entryFile],
		outfile: path.join(distDir, 'index.js'),
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2019', // ServiceNow's asset pipeline re-parses this file
		minify: true,
		legalComments: 'inline',
		define: { 'process.env.NODE_ENV': '"production"' },
		logLevel: 'warning'
	});
} finally {
	fs.rmSync(entryFile, { force: true });
}

const { version } = require('react/package.json');
// setup-servicenow-react stamps this on the react-shim so libraries' react peer ranges match.
fs.writeFileSync(path.join(distDir, 'meta.json'), JSON.stringify({ react: version }, null, 2) + '\n');
const size = fs.statSync(path.join(distDir, 'index.js')).size;
console.log(`built dist/index.js: React ${version}, ${taken.size} named exports, ${(size / 1024).toFixed(1)} KB`);
