// React 19 renderer for the ServiceNow UI Framework (Next Experience).
// Source for the renderer part of dist/index.js (see scripts/build.mjs).
//
// ui-core renderer contract (verified against @servicenow/ui-core 24.x):
//   onConnect(rootNode, dispatch, next)
//   onStateChange(rootNode, view, state, helpers, interactionId)
//   onDisconnect(rootNode, dispatch, next)
// rootNode is normally the component's shadow root.
//
// NOTE: this file is consumed untranspiled by older webpack/acorn builds in the
// ServiceNow CLI, so avoid class fields, optional chaining and nullish coalescing.

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { PortalContainerContext, createShadowSupport, usePortalContainer } from './shadow.js';

const noop = () => {};

// Values from @servicenow/ui-internal (errorTypes / locations). The public name
// `actionTypes.COMPONENT_ERROR_THROWN` from @servicenow/ui-core resolves to this string.
const COMPONENT_ERROR_THROWN = 'SEISMIC_COMPONENT_ERROR_THROWN';
const LOCATION_VIEW = 'SEISMIC_LOCATION_VIEW';

// rootNode -> { root, renderCount, pendingUnmount }
const roots = new WeakMap();

const isFunction = (value) => typeof value === 'function';

// Snabbdom VNodes (they carry a `sel` key) can leak into state from snabbdom-based
// parents; React cannot render them, so drop them from the top level of state.
const isVNode = (value) => value !== null && typeof value === 'object' && 'sel' in value && 'data' in value;

// ui-core's context is a Proxy that logs a warning for any unknown key. React 19.2+
// dev builds (Performance Tracks) stringify props, which reads Symbol.toStringTag and
// floods the console. Answer symbol reads that the context doesn't define ourselves.
function quietContext(context) {
	if (!context || typeof context !== 'object') return context;
	return new Proxy(context, {
		get(target, key, receiver) {
			if (key === Symbol.toStringTag || key === Symbol.toPrimitive) return undefined;
			return Reflect.get(target, key, receiver);
		}
	});
}

function resolveDispatch(state, helpers) {
	if (helpers && isFunction(helpers.dispatch)) return helpers.dispatch;
	if (state && isFunction(state.dispatch)) return state.dispatch; // renderer.coeffects mode
	return noop;
}

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null, resetKey: props.resetKey };
	}

	// Each change of ui-core state gets a new resetKey, giving a crashed view a fresh
	// chance to render instead of staying blank forever. The key is recorded at render
	// time, so the commit that catches an error never resets itself.
	static getDerivedStateFromProps(props, state) {
		if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
		return null;
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		try {
			// Same shape ui-core's own sandbox uses, so COMPONENT_ERROR_THROWN handlers fire.
			this.props.dispatch(
				COMPONENT_ERROR_THROWN,
				{
					host: this.props.host,
					location: LOCATION_VIEW,
					details: { boundaryError: true, componentStack: info && info.componentStack },
					error
				},
				{ internal: true },
				true
			);
		} catch (dispatchError) {
			// never let error reporting take the page down
		}
		console.error('An error occurred in a React component. COMPONENT_ERROR_THROWN was dispatched with the error details.', error);
	}

	render() {
		return this.state.error ? null : this.props.children;
	}
}

function getEntry(rootNode) {
	let entry = roots.get(rootNode);
	if (entry) {
		if (entry.pendingUnmount) entry.pendingUnmount = false; // reconnected before the unmount ran
		return entry;
	}
	entry = {
		root: createRoot(rootNode),
		shadow: createShadowSupport(rootNode),
		stateVersion: 0,
		lastState: null,
		lastView: null,
		pendingUnmount: false
	};
	roots.set(rootNode, entry);
	return entry;
}

// ui-core builds a fresh state object every render but keeps unchanged values by
// identity. `context` is a new proxy each time, so it is ignored.
function stateChanged(prev, next) {
	if (!prev) return true;
	const prevKeys = Object.keys(prev);
	if (prevKeys.length !== Object.keys(next).length) return true;
	for (let i = 0; i < prevKeys.length; i++) {
		const key = prevKeys[i];
		if (key !== 'context' && prev[key] !== next[key]) return true;
	}
	return false;
}

function onConnect(rootNode, dispatch, next) {
	const entry = roots.get(rootNode);
	if (entry) entry.pendingUnmount = false;
	if (isFunction(next)) setTimeout(next, 0);
}

function onStateChange(rootNode, view, state, helpers) {
	const entry = getEntry(rootNode);
	const rawState = state || {};
	const dispatch = resolveDispatch(rawState, helpers);

	const cleanState = {};
	for (const key in rawState) {
		const value = rawState[key];
		if (isVNode(value)) continue;
		cleanState[key] = key === 'context' ? quietContext(value) : value;
	}

	const props = Object.assign({}, cleanState, {
		dispatch,
		helpers: helpers || {},
		properties: cleanState.properties || {},
		state: cleanState
	});

	// A crashed view is retried only when ui-core sends different state (or a different
	// view). Re-rendering identical state would just throw and dispatch the error again.
	if (view !== entry.lastView || stateChanged(entry.lastState, rawState)) entry.stateVersion += 1;
	entry.lastView = view;
	entry.lastState = rawState;

	entry.shadow.check();
	const element = React.createElement(
		PortalContainerContext.Provider,
		{ value: entry.shadow.getContainer },
		React.createElement(
			ErrorBoundary,
			{ dispatch, host: rootNode.host || rootNode, resetKey: entry.stateVersion },
			React.createElement(view || noop, props)
		)
	);

	// ui-core dispatches COMPONENT_RENDERED / COMPONENT_DOM_READY right after this
	// call returns, so real renders must be committed synchronously. ui-core's own
	// internal passes (style deprioritisation, clearing on disconnect) send no state;
	// those can happen inside another React commit, where flushSync is not allowed.
	const isInternalPass = !state || Object.keys(state).length === 0;
	if (isInternalPass) {
		entry.root.render(element);
	} else {
		flushSync(() => entry.root.render(element));
	}
}

function onDisconnect(rootNode, dispatch, next) {
	const entry = roots.get(rootNode);
	if (entry) {
		// Defer: disconnects can fire synchronously inside a parent React commit,
		// where unmounting another root is not allowed. A reconnect before the
		// microtask runs (element moved in the DOM) cancels the unmount.
		entry.pendingUnmount = true;
		queueMicrotask(() => {
			if (!entry.pendingUnmount || roots.get(rootNode) !== entry) return;
			roots.delete(rootNode);
			entry.root.unmount();
			entry.shadow.dispose();
		});
	}
	if (isFunction(next)) next();
}

export { onConnect, onDisconnect, onStateChange, usePortalContainer };

// The ui-core renderer interface. dist/index.js merges this with the full React API
// into one default export, so the same module works as both `react` and
// `@servicenow/ui-renderer-react`.
export const rendererInterface = {
	onConnect,
	onDisconnect,
	onStateChange,
	// Tells ui-core to render before injecting <style> into the shadow root, so the
	// first React commit doesn't clear the styles.
	deprioritizeStyles: true
};
