// Small hand-rolled JSON syntax highlighter.
//
// Deliberately NOT JSON.parse-based: the request panel is live-edited by the
// user, so the source text is frequently momentarily invalid JSON (an open
// string, a trailing comma, a half-typed number, ...). This is a
// character-scanning lexer that walks the raw source once and wraps whatever
// tokens it recognizes in <span> tags, passing everything else through
// (escaped) unchanged. That means it never throws and never reformats or
// drops the user's exact whitespace.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const NUMBER_RE = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const KEYWORD_RE = /true|false|null/y;
const WHITESPACE_RE = /\s+/y;

function span(className: string, raw: string): string {
  return `<span class="${className}">${escapeHtml(raw)}</span>`;
}

/** Reads a JSON string literal starting at a `"` in `source[i]`. Tolerates an
 * unterminated string (mid-typing) by running to end of input. Returns the
 * raw text consumed (including quotes) and the index just past it. */
function readStringLiteral(source: string, start: number): { raw: string; end: number } {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '"') {
      i += 1;
      break;
    }
    i += 1;
  }
  return { raw: source.slice(start, i), end: i };
}

export function highlightJson(source: string): string {
  if (!source) return '';
  let out = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    WHITESPACE_RE.lastIndex = i;
    const wsMatch = WHITESPACE_RE.exec(source);
    if (wsMatch) {
      out += escapeHtml(wsMatch[0]);
      i += wsMatch[0].length;
      continue;
    }

    if (ch === '"') {
      const { raw, end } = readStringLiteral(source, i);
      let j = end;
      while (j < len && /\s/.test(source[j])) j += 1;
      const isKey = source[j] === ':';
      out += span(isKey ? 'tok-key' : 'tok-string', raw);
      i = end;
      continue;
    }

    if (ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === ':' || ch === ',') {
      out += span('tok-punct', ch);
      i += 1;
      continue;
    }

    KEYWORD_RE.lastIndex = i;
    const kwMatch = KEYWORD_RE.exec(source);
    if (kwMatch) {
      out += span(kwMatch[0] === 'null' ? 'tok-null' : 'tok-boolean', kwMatch[0]);
      i += kwMatch[0].length;
      continue;
    }

    NUMBER_RE.lastIndex = i;
    const numMatch = NUMBER_RE.exec(source);
    if (numMatch && numMatch[0].length > 0) {
      out += span('tok-number', numMatch[0]);
      i += numMatch[0].length;
      continue;
    }

    // Anything unrecognized (stray characters while typing, etc.) passes
    // through as plain escaped text.
    out += escapeHtml(ch);
    i += 1;
  }

  return out;
}
