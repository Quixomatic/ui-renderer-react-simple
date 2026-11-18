import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { fix } = require('../scripts/shadcn-fix.cjs');

// Shapes of shadcn base-nova output (shadcn 4.x).
const BUTTON = `import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";
import { cn } from "cn"

function Button({ className, ...props }) {
  return <ButtonPrimitive data-slot="button" className={cn(className)} {...props} />
}
`;
const POPOVER = `"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

function PopoverContent({ className, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner>
        <PopoverPrimitive.Popup className={cn(className)} {...props} />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}
function DialogPortal({ ...props }) {
  return <PopoverPrimitive.Portal data-slot="x" {...props} />
}
`;

test('adds a React import to JSX files that lack one (else ServiceNow compiles them for snabbdom)', () => {
	const { next, notes } = fix(BUTTON);
	assert.match(next, /^import \* as React from "react"\n/);
	assert.deepEqual(notes, ['react import']);
});

test('keeps "use client" first when adding the React import', () => {
	const { next } = fix('"use client"\n\nimport { cn } from "cn"\n\nexport const A = () => <div />\n');
	assert.match(next, /^"use client"\n\nimport \* as React from "react"\nimport \{ cn \} from "cn"/);
});

test('sends every Portal to the overlay layer and imports the hook once', () => {
	const { next, notes } = fix(POPOVER);
	assert.equal((next.match(/\.Portal container=\{usePortalContainer\(\)\}/g) || []).length, 2);
	assert.equal((next.match(/import \{ usePortalContainer \} from "@servicenow\/ui-renderer-react"/g) || []).length, 1);
	assert.match(next, /import \{ cn \} from "cn"\nimport \{ usePortalContainer \}/, 'import goes with the other imports');
	assert.doesNotMatch(next, /<\/PopoverPrimitive\.Portal container/, 'closing tags untouched');
	assert.deepEqual(notes, ['portal container']);
});

test('is idempotent and leaves non-JSX files alone', () => {
	const once = fix(POPOVER).next;
	assert.equal(fix(once).next, once);
	assert.equal(fix(fix(BUTTON).next).next, fix(BUTTON).next);
	const plain = 'export function cn(...a) { return a.join(" ") }\n';
	assert.equal(fix(plain).next, plain);
});

test('repairs a file that has the container prop but lost the import', () => {
	const broken = 'import * as React from "react"\nimport { X } from "x"\n\nconst P = () => <X.Portal container={usePortalContainer()} />\n';
	const { next } = fix(broken);
	assert.match(next, /import \{ usePortalContainer \} from "@servicenow\/ui-renderer-react"/);
});
