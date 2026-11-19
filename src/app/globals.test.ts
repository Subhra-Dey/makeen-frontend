import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
// web/'s own copy of docs/brand/design-tokens.json (CI contract.yml keeps the two identical).
const tokens = JSON.parse(readFileSync(here('./design-tokens.json'), 'utf8')) as unknown;
const css = readFileSync(here('./globals.css'), 'utf8').toLowerCase();

function collectHexColours(node: unknown, out: Set<string>): Set<string> {
  if (typeof node === 'string') {
    for (const m of node.matchAll(/#[0-9a-f]{6}\b/gi)) out.add(m[0].toLowerCase());
  } else if (Array.isArray(node)) {
    for (const v of node) collectHexColours(v, out);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectHexColours(v, out);
  }
  return out;
}

describe('Tailwind theme mirrors design-tokens.json', () => {
  const colours = [...collectHexColours(tokens, new Set())];

  it('has every token colour', () => {
    const missing = colours.filter((c) => !css.includes(c));
    expect(missing).toEqual([]);
  });

  it('has the layout sizes', () => {
    for (const size of ['264px', '84px', '76px', '62px', '44px', '1680px']) {
      expect(css).toContain(size);
    }
  });
});
