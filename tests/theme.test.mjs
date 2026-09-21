import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/lib/theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
runInNewContext(compiled, { exports });

function initialTheme(saved, systemDark, blocked = false) {
  let dark;
  runInNewContext(exports.THEME_SCRIPT, {
    localStorage: { getItem(key) { assert.equal(key, exports.THEME_KEY); if (blocked) throw new Error('Storage blocked'); return saved; } },
    matchMedia: () => ({ matches: systemDark }),
    document: { documentElement: { classList: { toggle(name, value) { assert.equal(name, 'dark'); dark = value; } } } },
  });
  return dark;
}

test('prepaint theme honors an explicit choice ahead of the system preference', () => {
  assert.equal(initialTheme('light', true), false);
  assert.equal(initialTheme('dark', false), true);
});
test('prepaint theme uses the system for absent, invalid or inaccessible storage', () => {
  for (const saved of [null, '', 'invalid']) {
    assert.equal(initialTheme(saved, true), true);
    assert.equal(initialTheme(saved, false), false);
  }
  assert.equal(initialTheme(null, true, true), true);
  assert.equal(initialTheme(null, false, true), false);
});
