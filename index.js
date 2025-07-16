// React 18 renderer for ServiceNow UI Framework
// Provides a drop-in replacement for @servicenow/ui-renderer-react
// Compatible with React 18 hooks and features

import React from 'react';
import ReactDOM from 'react-dom/client';

const noop = () => {};

// Helper function similar to @quixomatic/ui-internal
const callAsync = (fn) => {
	if (fn) setTimeout(fn, 0);
};

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	componentDidCatch(error) {
		const { element, helpers } = this.props;
		
		if (helpers && helpers.dispatch) {
			helpers.dispatch('COMPONENT_ERROR_THROWN', {
				error,
				location: 'VIEW',
				details: { boundaryError: true }
			});
		}

		this.setState({ hasError: true });
		
		console.error(`An Error occured in React component. COMPONENT_ERROR_THROWN action type is dispatched with error details.`, error);
	}

	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}

function onConnect(element, dispatch, next = noop) {
	callAsync(next);
}

// Store React roots on elements
const REACT_ROOT_KEY = '__reactRoot18';

function onStateChange(element, Component, state = {}, helpers = {}) {
	// Create or reuse React 18 root
	if (!element[REACT_ROOT_KEY]) {
		element[REACT_ROOT_KEY] = ReactDOM.createRoot(element);
	}
	
	const root = element[REACT_ROOT_KEY];
	
	// Clean the state object to remove any VNode structures
	const cleanState = {};
	for (const key in state) {
		const value = state[key];
		// Skip VNode objects (they have 'sel' property)
		if (value && typeof value === 'object' && 'sel' in value) {
			continue;
		}
		cleanState[key] = value;
	}
	
	// Pass the cleaned state object matching @quixomatic/ui-renderer-react format
	const componentProps = {
		...cleanState,
		dispatch: helpers.dispatch || helpers,
		helpers: helpers,
		properties: cleanState.properties || {},
		state: cleanState
	};
	
	// Render using React 18 API
	root.render(
		React.createElement(ErrorBoundary, {
			helpers: helpers,
			element: element
		},
			React.createElement(Component, componentProps)
		)
	);
	
	return root;
}

function onDisconnect(element, next = noop) {
	// Clean up React 18 root
	if (element[REACT_ROOT_KEY]) {
		element[REACT_ROOT_KEY].unmount();
		delete element[REACT_ROOT_KEY];
	}
	callAsync(next);
}

export const createElement = React.createElement;
export const Fragment = React.Fragment;
export const createRef = React.createRef;
export { onConnect, onDisconnect, onStateChange };

// Match the export format of @quixomatic/ui-renderer-react and @servicenow/ui-renderer-react
export default {
	Fragment: React.Fragment,
	createElement: React.createElement,
	createRef: React.createRef,
	onConnect,
	onDisconnect,
	onStateChange,
	deprioritizeStyles: true
};