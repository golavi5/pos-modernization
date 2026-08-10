// Shared user-facing-string detector for i18n-lint.cjs and i18n-suggest.cjs.
// Both used to carry byte-identical copies of these regexes; a fix applied to
// one silently forked the other, so the detector lives here now.
//
// Precision rules (why the shape is what it is):
//   * A JSX text node is only recognised when it sits between a real opening
//     tag (`<Tag ...>`) and a closing `</`. Anchoring on a bare `>` matched
//     TypeScript instead — `(v: string) => Promise<void>` produced the phantom
//     literal " Promise" (the `>` of `=>` and the `<` of `<void>`), and
//     `a > b && c < d` produced " b && c ". Both turned CI red on strings that
//     do not exist.
//   * Text is allowed to span lines and has no length cap. The old
//     `[^<>{}\n]{3,60}` class let a heading on its own line, or any string over
//     60 chars, pass the gate silently — the fail-open direction, which is
//     worse than a false alarm because it is invisible.
//
// Residual gap: a text node interrupted by a `{expr}` interpolation is only
// partially seen (the class stops at `{`). Splitting those needs a real parser;
// the JSX around it is still checked.

const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/;

// `<Tag>` / `<Tag attr="x">` / `<Icon size={14} />` — a tag whose `>` may
// legitimately start a text node. Self-closing counts: the Sidebar logout
// literal sits between `<LogOut … />` and `</DropdownMenuItem>`.
// `typeof`/`keyof`/`infer` open a TS type argument, never a JSX element —
// `React.ComponentPropsWithoutRef<typeof Primitive.Content>` otherwise reads as
// a tag with a text node after it.
const OPEN_TAG = '<(?!(?:typeof|keyof|infer|readonly)\\b)[A-Za-z][A-Za-z0-9.]*(?:\\s[^<>]*)?>';

// Rule A — text terminated by a closing tag: <p>Hola</p>. High confidence.
const TEXT_BEFORE_CLOSE = new RegExp(`${OPEN_TAG}([^<>{}]{3,})<\\/`, 'g');

// Rule B — text terminated by a nested element: <p>Hola <b>x</b></p>. The `<`
// that ends it is a letter, which is also what a TS generic looks like, so code
// punctuation disqualifies the run.
const TEXT_BEFORE_TAG = new RegExp(`${OPEN_TAG}([^<>{}]{3,})<[A-Za-z]`, 'g');
// Code punctuation, a dotted identifier (`React.Component`), or a leading
// separator (an object/array entry between two elements, e.g.
// `Regular: <Users />,\n  Inactive: <UserX />`) disqualify a rule-B run.
const CODEISH = /[;=()[\]`$\\]|[A-Za-z]\.[A-Za-z]|^\s*[,:}]|\b(?:const|return|import|typeof)\b/;

const ATTRS = /(?:placeholder|aria-label|title|alt)="([^"]{2,})"/g;

/**
 * User-facing string literals in a .tsx source. Returns unique trimmed strings.
 */
function literals(src) {
  const found = [];
  const push = (raw) => {
    const s = raw.trim().replace(/\s+/g, ' ');
    if (s.length >= 3 && HAS_LETTERS.test(s)) found.push(s);
  };

  for (const m of src.matchAll(TEXT_BEFORE_CLOSE)) push(m[1]);
  for (const m of src.matchAll(TEXT_BEFORE_TAG)) {
    if (!CODEISH.test(m[1])) push(m[1]);
  }
  for (const m of src.matchAll(ATTRS)) push(m[1]);

  return [...new Set(found)];
}

module.exports = { literals, HAS_LETTERS };
