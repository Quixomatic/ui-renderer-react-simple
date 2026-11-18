// Exercises the renderer the way @servicenow/ui-core 24.x calls it.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Element', 'Event', 'MutationObserver']) {
	globalThis[key] = dom.window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

// Everything comes from the bundle: it IS React 19 plus the renderer. Importing a
// separate 'react' here would give hooks a second React copy.
const named = await import('../dist/index.js');
const renderer = named.default;
const React = renderer;
const { createElement: h, useState } = named;

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
const quietErrors = async (fn) => {
	const original = console.error;
	console.error = () => {};
	try { return await fn(); } finally { console.error = original; }
};

let rootNode;
let dispatched;
const helpers = () => ({ dispatch: (...args) => dispatched.push(args), updateState() {}, updateProperties() {} });

beforeEach(() => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	rootNode = host.attachShadow({ mode: 'open' });
	dispatched = [];
});

test('exports match the @servicenow/ui-renderer-react shape', () => {
	for (const key of ['createElement', 'Fragment', 'createRef', 'onConnect', 'onDisconnect', 'onStateChange']) {
		assert.ok(renderer[key], `default export has ${key}`);
		assert.equal(named[key], renderer[key], `named export ${key} matches default`);
	}
	assert.equal(renderer.deprioritizeStyles, true);
});

test('the bundle is a complete, self-contained React 19 (react, react-dom, react-dom/client, jsx-runtime)', () => {
	assert.match(named.version, /^19\./);
	for (const key of ['useState', 'useEffect', 'use', 'useActionState', 'createContext', 'memo', 'lazy',
		'createPortal', 'flushSync', 'createRoot', 'hydrateRoot', 'jsx', 'jsxs', 'jsxDEV',
		'__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE']) {
		assert.ok(named[key], `named export ${key}`);
		assert.equal(renderer[key], named[key], `default export has the same ${key}`);
	}
	const src = fs.readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
	// No static or dynamic imports: React must never be loaded from anywhere else.
	assert.doesNotMatch(src, /(^|[;}])\s*import\s*[\w{*"']/m, 'no static imports');
	assert.doesNotMatch(src, /\bimport\s*\(/, 'no dynamic imports');
});

test('JSX runtime output renders through the bundled React', () => {
	renderer.onStateChange(rootNode, () => named.jsxs('p', { children: ['a', named.jsx('b', { children: 'b' })] }), { properties: {} }, helpers());
	assert.equal(rootNode.innerHTML, '<p>a<b>b</b></p>');
});

test('renders synchronously so COMPONENT_RENDERED sees committed DOM', () => {
	const View = ({ properties }) => h('p', null, `count=${properties.count}`);
	renderer.onStateChange(rootNode, View, { properties: { count: 1 } }, helpers());
	assert.equal(rootNode.innerHTML, '<p>count=1</p>');
});

test('passes state, properties, dispatch and helpers to the view', () => {
	let received;
	const View = (props) => { received = props; return null; };
	const hp = helpers();
	renderer.onStateChange(rootNode, View, { componentId: 'c1', properties: { a: 1 }, local: 'x' }, hp);
	assert.equal(received.properties.a, 1);
	assert.equal(received.local, 'x');
	assert.equal(received.state.local, 'x');
	assert.equal(received.helpers, hp);
	received.dispatch('PING', { n: 1 });
	assert.deepEqual(dispatched, [['PING', { n: 1 }]]);
});

test('dispatch is always a function (style pass, coeffects mode)', async () => {
	let seen;
	const View = ({ dispatch }) => { seen = dispatch; return null; };
	renderer.onStateChange(rootNode, View); // ui-core applyStyles pass: no state, no helpers
	await tick();
	assert.equal(typeof seen, 'function');

	const coeffectsDispatch = () => 'coeffects';
	renderer.onStateChange(rootNode, View, { properties: {}, dispatch: coeffectsDispatch }, undefined);
	assert.equal(seen, coeffectsDispatch);
});

test('hook state survives re-renders from ui-core', async () => {
	let setLocal;
	const View = ({ properties }) => {
		const [local, set] = useState('init');
		setLocal = set;
		return h('span', null, `${properties.p}/${local}`);
	};
	renderer.onStateChange(rootNode, View, { properties: { p: 1 } }, helpers());
	assert.equal(rootNode.textContent, '1/init');
	setLocal('changed');
	await tick();
	assert.equal(rootNode.textContent, '1/changed');
	renderer.onStateChange(rootNode, View, { properties: { p: 2 } }, helpers());
	assert.equal(rootNode.textContent, '2/changed');
});

test('styles appended by ui-core after the deprioritised first render are kept', async () => {
	renderer.onStateChange(rootNode, () => null);
	await tick();
	const style = document.createElement('style');
	style.textContent = 'p{color:red}';
	rootNode.appendChild(style);
	renderer.onStateChange(rootNode, () => h('p', null, 'hi'), { properties: {} }, helpers());
	assert.ok(rootNode.querySelector('style'), 'style element still present');
	assert.equal(rootNode.querySelector('p').textContent, 'hi');
});

test('context reads pass through, but stringifying it does not hit ui-core\'s proxy', () => {
	const touched = [];
	const context = new Proxy({ theme: 'dark' }, { get(t, k) { touched.push(k); return t[k]; } });
	let received;
	renderer.onStateChange(rootNode, (p) => { received = p; return null; }, { properties: {}, context }, helpers());
	assert.equal(received.context.theme, 'dark');
	assert.equal(received.state.context, received.context);
	String(received.context);
	assert.equal(touched.includes(Symbol.toStringTag), false);
});

test('filters snabbdom VNodes out of state', () => {
	let received;
	const vnode = { sel: 'div', data: {}, children: [], elm: undefined, key: undefined, text: undefined };
	renderer.onStateChange(rootNode, (p) => { received = p; return null; }, { properties: {}, slot: vnode, ok: 1 }, helpers());
	assert.equal('slot' in received, false);
	assert.equal(received.ok, 1);
});

test('error boundary dispatches COMPONENT_ERROR_THROWN and recovers on the next state', async () => {
	const View = ({ properties }) => {
		if (properties.fail) throw new Error('boom');
		return h('b', null, 'ok');
	};
	await quietErrors(() => renderer.onStateChange(rootNode, View, { properties: { fail: true } }, helpers()));
	assert.equal(rootNode.innerHTML, '');
	// Must match @servicenow/ui-core's actionTypes.COMPONENT_ERROR_THROWN and be marked internal,
	// otherwise ui-core drops it as a forbidden internal action.
	const [type, payload, meta] = dispatched.find(([t]) => t === 'SEISMIC_COMPONENT_ERROR_THROWN');
	assert.equal(type, 'SEISMIC_COMPONENT_ERROR_THROWN');
	assert.equal(payload.error.message, 'boom');
	assert.equal(payload.location, 'SEISMIC_LOCATION_VIEW');
	assert.equal(payload.host, rootNode.host);
	assert.equal(meta.internal, true);

	renderer.onStateChange(rootNode, View, { properties: { fail: false } }, helpers());
	await tick();
	assert.equal(rootNode.innerHTML, '<b>ok</b>');
});

test('a crashed view is not retried (or re-reported) when ui-core re-renders identical state', async () => {
	const properties = { fail: true };
	let renders = 0;
	const View = () => { renders++; throw new Error('still broken'); };
	await quietErrors(async () => {
		renderer.onStateChange(rootNode, View, { properties }, helpers());
		renderer.onStateChange(rootNode, View, { properties }, helpers()); // e.g. re-render after the error action
		await tick();
	});
	const errors = dispatched.filter(([t]) => t === 'SEISMIC_COMPONENT_ERROR_THROWN');
	assert.equal(errors.length, 1);
	const rendersAfterCrash = renders;
	await quietErrors(async () => {
		renderer.onStateChange(rootNode, View, { properties: { fail: true } }, helpers()); // new state object: retry
		await tick();
	});
	assert.ok(renders > rendersAfterCrash, 'changed state retries the view');
});

test('a crash after a successful render is caught and reported exactly once', async () => {
	let catches = 0;
	const View = ({ properties }) => {
		if (properties.fail) { catches++; throw new Error('late crash'); }
		return h('b', null, 'fine');
	};
	renderer.onStateChange(rootNode, View, { properties: { fail: false } }, helpers());
	await quietErrors(async () => {
		renderer.onStateChange(rootNode, View, { properties: { fail: true } }, helpers());
		await tick();
	});
	assert.equal(dispatched.filter(([t]) => t === 'SEISMIC_COMPONENT_ERROR_THROWN').length, 1);
	assert.equal(rootNode.innerHTML, '');
	renderer.onStateChange(rootNode, View, { properties: { fail: false } }, helpers());
	assert.equal(rootNode.innerHTML, '<b>fine</b>');
});

test('onConnect calls next asynchronously', async () => {
	let called = false;
	renderer.onConnect(rootNode, () => assert.fail('dispatch must not be called'), () => { called = true; });
	assert.equal(called, false);
	await tick();
	assert.equal(called, true);
});

test('onDisconnect follows the (node, dispatch, next) signature and unmounts', async () => {
	let effectCleanedUp = false;
	const View = () => {
		React.useEffect(() => () => { effectCleanedUp = true; }, []);
		return h('i', null, 'x');
	};
	renderer.onStateChange(rootNode, View, { properties: {} }, helpers());
	await tick();

	let nextCalled = false;
	renderer.onDisconnect(rootNode, () => assert.fail('dispatch must not be called'), () => { nextCalled = true; });
	assert.equal(nextCalled, true, 'next (ui-core unhoist) is called');
	await tick();
	assert.equal(effectCleanedUp, true);
	assert.equal(rootNode.innerHTML, '');
});

test('reconnecting in the same tick (element moved) keeps the root', async () => {
	renderer.onStateChange(rootNode, () => h('u', null, 'kept'), { properties: {} }, helpers());
	renderer.onDisconnect(rootNode, () => {}, () => {});
	renderer.onConnect(rootNode, () => {}, () => {});
	await tick();
	assert.equal(rootNode.innerHTML, '<u>kept</u>');
	renderer.onStateChange(rootNode, () => h('u', null, 'again'), { properties: {} }, helpers());
	assert.equal(rootNode.innerHTML, '<u>again</u>');
});

// --- Shadow DOM support: overlay layer for portals -------------------------------

test('usePortalContainer is null outside a renderer-managed component', () => {
	let container = 'unset';
	const Probe = () => { container = named.usePortalContainer(); return null; };
	const plain = named.createRoot(document.createElement('div'));
	named.flushSync(() => plain.render(h(Probe)));
	assert.equal(container, null);
	plain.unmount();
});

test('overlay layer: lazily created on document.body with its own shadow root, styled like the component', async () => {
	const before = document.querySelectorAll('[data-sn-react-overlay]').length;
	renderer.onStateChange(rootNode, () => h('p', null, 'no overlay used'), { properties: {} }, helpers());
	assert.equal(document.querySelectorAll('[data-sn-react-overlay]').length, before, 'not created until used');

	const style = document.createElement('style');
	style.textContent = '.menu { color: red; }';
	rootNode.appendChild(style); // like ui-core injecting component styles
	rootNode.host.className = 'dark';

	let clicked = 0;
	const View = () => {
		const container = named.usePortalContainer();
		return h('div', null, 'trigger', named.createPortal(h('button', { className: 'menu', onClick: () => clicked++ }, 'item'), container));
	};
	renderer.onStateChange(rootNode, View, { properties: {} }, helpers());
	const overlays = document.querySelectorAll('[data-sn-react-overlay]');
	assert.equal(overlays.length, before + 1);
	const overlay = overlays[overlays.length - 1];
	assert.equal(overlay.parentNode, document.body);
	const button = overlay.shadowRoot.querySelector('button.menu');
	assert.ok(button, 'portal content rendered in the overlay shadow root');
	assert.equal(rootNode.querySelector('button'), null, 'not inside the (possibly clipped) component');
	assert.equal(overlay.shadowRoot.querySelector('style').textContent, '.menu { color: red; }', 'component styles mirrored');
	assert.equal(overlay.className, 'dark', 'host classes mirrored (dark mode)');

	button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true }));
	assert.equal(clicked, 1, 'React events work through the overlay portal');

	const later = document.createElement('style');
	later.textContent = '.late {}';
	rootNode.appendChild(later);
	await tick(); // MutationObserver
	assert.equal(overlay.shadowRoot.querySelectorAll('style').length, 2, 'styles added later are mirrored too');

	renderer.onDisconnect(rootNode, () => {}, () => {});
	await tick();
	assert.equal(overlay.isConnected, false, 'overlay removed on unmount');
});

test('overlay layer follows host class changes made outside ui-core (e.g. a dark-mode toggle)', async () => {
	const View = () => { named.usePortalContainer(); return null; };
	renderer.onStateChange(rootNode, View, { properties: {} }, helpers());
	const overlays = document.querySelectorAll('[data-sn-react-overlay]');
	const overlay = overlays[overlays.length - 1];
	rootNode.host.classList.add('dark');
	await tick(); // MutationObserver on the host, no re-render involved
	assert.match(overlay.className, /\bdark\b/);
	rootNode.host.classList.remove('dark');
	await tick();
	assert.doesNotMatch(overlay.className, /\bdark\b/);
	renderer.onDisconnect(rootNode, () => {}, () => {});
	await tick();
});
