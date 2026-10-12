import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function menuFixture() {
  let focused = false;
  const inside = {};
  const menu = { open: true, contains: (target: unknown) => target === inside,
    querySelector: () => ({ focus: () => { focused = true; } }) };
  const exports: Record<string, (props: object) => { props: Record<string, (event: object) => void> }> = {};
  const source = readFileSync(new URL('../src/components/ui/MenuDetails.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react') return { useRef: () => ({ current: menu }), useEffect: () => {} };
    if (name === 'react-router-dom') return { useLocation: () => ({ key: 'test' }) };
    if (name === 'react/jsx-runtime') return { jsx: (_: unknown, props: object) => ({ props }) };
    throw new Error(name);
  } });
  return { menu, inside, props: exports.default({ children: null }).props, focused: () => focused };
}

test('Safari blur with no focus destination leaves the action available until click', () => {
  const { menu, props, focused } = menuFixture();
  props.onBlur({ currentTarget: menu, relatedTarget: null });
  assert.equal(menu.open, true, 'tap must not hide its target before click');
  const event = { target: { closest: (selector: string) => selector.includes('button') ? {} : null } };
  props.onClickCapture(event);
  assert.equal(menu.open, true, 'capture must leave child action visible');
  let launched = false;
  if (menu.open) launched = true; // Child click handler runs before bubbling to the menu.
  props.onClick(event);
  assert.equal(launched, true);
  assert.equal(menu.open, false);
  assert.equal(focused(), true);
});

test('keyboard focus leaving closes the menu, internal focus does not', () => {
  const { menu, inside, props } = menuFixture();
  props.onBlur({ currentTarget: menu, relatedTarget: inside });
  assert.equal(menu.open, true);
  props.onBlur({ currentTarget: menu, relatedTarget: {} });
  assert.equal(menu.open, false);
});
