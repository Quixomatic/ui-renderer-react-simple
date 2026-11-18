// Shadow DOM support for React components rendered by ui-core.
//
// Every ServiceNow component renders into its own shadow root, usually nested inside
// several more (UI Builder containers). Two things therefore need help:
//
// 1. Overlays (dialogs, popovers, menus, tooltips). Libraries such as Radix/shadcn
//    portal into document.body by default: outside the component's shadow root, so
//    unstyled. Portalling into the component's own shadow root instead gets them
//    clipped by any ancestor container with overflow/transform/z-index. So each
//    component gets a lazily-created overlay layer: a host element on document.body
//    with its own shadow root that mirrors the component's stylesheets (and host
//    classes, for dark mode). Reach it with usePortalContainer().
//
// 2. Document-only CSS. @property and @font-face rules inside a shadow root are
//    ignored. Tailwind v4 registers --tw-shadow, --tw-ring-*, --tw-translate-* etc.
//    with @property, so shadows, rings and transforms silently break in shadow DOM.
//    These rules are copied once into the document (registrations are global).
//
// Keep this file free of class fields / optional chaining (see renderer.js).

import React from 'react';

export const PortalContainerContext = React.createContext(null);

/**
 * Element to pass as the portal container for overlay content, e.g.
 * <DialogPrimitive.Portal container={usePortalContainer()}>. Outside a component
 * rendered by this renderer it returns null (libraries then fall back to document.body).
 */
export function usePortalContainer() {
	const getContainer = React.useContext(PortalContainerContext);
	return getContainer ? getContainer() : null;
}

const OVERLAY_ATTR = 'data-sn-react-overlay';
const HOISTED_ATTR = 'data-sn-react-hoisted';
const hoistedRules = new Set();
let hoistedStyleEl = null;

function styleNodesOf(rootNode) {
	const nodes = [];
	const children = rootNode.children || [];
	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (node.tagName === 'STYLE' || (node.tagName === 'LINK' && node.rel === 'stylesheet')) nodes.push(node);
	}
	return nodes;
}

function adoptedOf(rootNode) {
	return rootNode.adoptedStyleSheets ? Array.prototype.slice.call(rootNode.adoptedStyleSheets) : [];
}

function isDocumentOnlyRule(rule) {
	if (typeof CSSPropertyRule !== 'undefined' && rule instanceof CSSPropertyRule) return true;
	if (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule) return true;
	return false;
}

function collectDocumentOnlyRules(rules, out) {
	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (isDocumentOnlyRule(rule)) out.push(rule.cssText);
		// Tailwind v4 nests some rules in @layer blocks; look inside those.
		else if (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule) collectDocumentOnlyRules(rule.cssRules, out);
	}
}

/** Copy @property / @font-face rules from the component's styles into the document, once. */
export function hoistDocumentOnlyRules(rootNode) {
	const sheets = adoptedOf(rootNode);
	const nodes = styleNodesOf(rootNode);
	for (let i = 0; i < nodes.length; i++) if (nodes[i].sheet) sheets.push(nodes[i].sheet);

	const found = [];
	for (let i = 0; i < sheets.length; i++) {
		try {
			collectDocumentOnlyRules(sheets[i].cssRules, found);
		} catch (error) {
			// cross-origin <link> sheets can't be read; nothing to hoist from them
		}
	}
	const fresh = found.filter((text) => !hoistedRules.has(text));
	if (!fresh.length) return;
	fresh.forEach((text) => hoistedRules.add(text));
	if (!hoistedStyleEl || !hoistedStyleEl.isConnected) {
		hoistedStyleEl = document.createElement('style');
		hoistedStyleEl.setAttribute(HOISTED_ATTR, '');
		hoistedStyleEl.textContent = Array.from(hoistedRules).join('\n');
		document.head.appendChild(hoistedStyleEl);
	} else {
		hoistedStyleEl.textContent += '\n' + fresh.join('\n');
	}
}

/**
 * Per-component shadow support. Watches the component's shadow root for style changes
 * (ui-core injects styles after the first render), hoists document-only rules and keeps
 * the overlay layer's styles in sync.
 */
export function createShadowSupport(rootNode) {
	const support = { overlay: null, observer: null, lastAdopted: [] };
	const host = rootNode.host || null;

	function syncOverlay() {
		const overlay = support.overlay;
		if (!overlay) return;
		overlay.clones.forEach((node) => node.remove());
		overlay.clones = styleNodesOf(rootNode).map((node) => {
			const clone = node.cloneNode(true);
			overlay.shadow.insertBefore(clone, overlay.container);
			return clone;
		});
		if (overlay.shadow.adoptedStyleSheets !== undefined) {
			try { overlay.shadow.adoptedStyleSheets = adoptedOf(rootNode); } catch (error) { /* sheets from another document */ }
		}
		syncHostAttributes();
	}

	function syncHostAttributes() {
		const overlay = support.overlay;
		if (!overlay || !host) return;
		// Mirror class / dir / theme attributes so :host(.dark) and similar selectors match.
		overlay.host.className = host.className || '';
		['dir', 'data-theme', 'data-mode'].forEach((name) => {
			if (host.hasAttribute && host.hasAttribute(name)) overlay.host.setAttribute(name, host.getAttribute(name));
			else overlay.host.removeAttribute(name);
		});
	}

	function onStylesChanged() {
		hoistDocumentOnlyRules(rootNode);
		syncOverlay();
	}

	if (typeof MutationObserver !== 'undefined') {
		support.observer = new MutationObserver((records) => {
			for (let i = 0; i < records.length; i++) {
				const changed = Array.prototype.slice.call(records[i].addedNodes).concat(Array.prototype.slice.call(records[i].removedNodes));
				if (changed.some((n) => n.tagName === 'STYLE' || n.tagName === 'LINK')) {
					onStylesChanged();
					return;
				}
			}
		});
		support.observer.observe(rootNode, { childList: true });
		// Theme switches usually toggle a class on the host directly (no ui-core render),
		// so watch the host too and keep the overlay layer's copy in step.
		if (host) {
			support.hostObserver = new MutationObserver(syncHostAttributes);
			support.hostObserver.observe(host, { attributes: true, attributeFilter: ['class', 'dir', 'data-theme', 'data-mode'] });
		}
	}

	// Called on every render: adoptedStyleSheets changes are not observable.
	support.check = () => {
		const adopted = adoptedOf(rootNode);
		const changed = adopted.length !== support.lastAdopted.length || adopted.some((s, i) => s !== support.lastAdopted[i]);
		if (changed) {
			support.lastAdopted = adopted;
			onStylesChanged();
		} else {
			syncHostAttributes();
		}
	};

	// Stable function given to PortalContainerContext; creates the layer on first use.
	support.getContainer = () => {
		if (support.overlay) return support.overlay.container;
		if (typeof document === 'undefined' || !document.body) return null;
		const overlayHost = document.createElement('div');
		overlayHost.setAttribute(OVERLAY_ATTR, host ? host.tagName.toLowerCase() : '');
		// Its own stacking layer above the page; content inside positions itself (fixed).
		overlayHost.style.cssText = 'position:relative;z-index:2147483000;';
		const shadow = overlayHost.attachShadow({ mode: 'open' });
		const container = document.createElement('div');
		shadow.appendChild(container);
		document.body.appendChild(overlayHost);
		support.overlay = { host: overlayHost, shadow, container, clones: [] };
		syncOverlay();
		return container;
	};

	support.dispose = () => {
		if (support.observer) support.observer.disconnect();
		if (support.hostObserver) support.hostObserver.disconnect();
		if (support.overlay) support.overlay.host.remove();
		support.overlay = null;
	};

	onStylesChanged();
	return support;
}
