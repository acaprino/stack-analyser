import type { BaseProvider } from '../../provider/base.js';

/** Tokens for reading literal package declarations without evaluating project code. */
export interface Token {
  value: string;
  kind: 'word' | 'string' | 'symbol' | 'opaque';
  line: number;
}

// Scala (sbt) shares Swift's comments and string delimiters; Python shares Elixir's quotes and `#` comments, without
// interpolation, and takes `'` strings as literals.
type Language = 'swift' | 'elixir' | 'ruby' | 'scala' | 'python';

export async function sourceText(provider: BaseProvider, file: string): Promise<null | string> {
  const stat = await provider.stat(file);
  return stat && stat.size <= 2_000_000 ? provider.open(file) : null;
}

function blockCommentEnd(source: string, start: number): number {
  let depth = 1;
  let i = start + 2;
  while (i < source.length && depth) {
    if (source.startsWith('/*', i)) { depth++; i += 2; }
    else if (source.startsWith('*/', i)) { depth--; i += 2; }
    else i++;
  }
  return i;
}

function interpolationEnd(source: string, start: number, isSwift: boolean, level: number): number {
  if (level > 32) return source.length;
  const open = isSwift ? '(' : '{';
  const close = isSwift ? ')' : '}';
  const innerString = isSwift ? /(#*)("""|")/y : /()("""|'''|"|')/y;
  let depth = 1;
  let i = start;
  while (i < source.length && depth) {
    innerString.lastIndex = i;
    const quote = innerString.exec(source);
    if (quote) {
      i = stringEnd(source, innerString.lastIndex, quote[2] + quote[1], '\\' + quote[1], isSwift, level);
    } else if (isSwift && source.startsWith('/*', i)) {
      i = blockCommentEnd(source, i);
    } else if (isSwift ? source.startsWith('//', i) : source[i] === '#') {
      const newline = source.indexOf('\n', i);
      i = newline < 0 ? source.length : newline + 1;
    } else {
      if (source[i] === open) depth++;
      if (source[i] === close) depth--;
      i++;
    }
  }
  return i;
}

function stringEnd(source: string, start: number, close: string, escape: string, isSwift: boolean, level = 0,
  interpolate = true, pairedOpen?: string): number {
  let i = start;
  let depth = 1;
  const interpolation = isSwift ? escape + '(' : '#{';
  while (i < source.length) {
    if (source.startsWith(close, i)) {
      i += close.length;
      if (!--depth) return i;
      continue;
    }
    if (interpolate && source.startsWith(interpolation, i)) {
      i = interpolationEnd(source, i + interpolation.length, isSwift, level + 1);
      continue;
    }
    if (pairedOpen && source.startsWith(pairedOpen, i)) depth++;
    i += source.startsWith(escape, i) ? escape.length + 1 : 1;
  }
  return source.length;
}

export function tokens(source: string, language: Language): Token[] {
  const out: Token[] = [];
  const word = /[A-Za-z_0-9]+[!?]?/y;
  const swiftQuote = /(#*)("""|")/y;
  const elixirQuote = /("""|'''|"|')/y;
  const sigil = /~[A-Za-z]("""|'''|"|'|\/|\||\(|\[|\{|<)/y;
  const rubyQuote = /(["'`])/y;
  const percentLiteral = /%[qQwWiIrsx]?([^\w\s=])/y;
  const heredoc = /<<([-~]?)(?:(["'`])([^\r\n]+?)\2|([A-Za-z_]\w*))/y;
  const pendingHeredocs: { label: string; indented: boolean }[] = [];
  const closes: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };
  let line = 1;
  let i = 0;
  while (i < source.length) {
    const start = i;
    const char = source[i];
    const isSwift = language === 'swift' || language === 'scala';
    const isRuby = language === 'ruby';
    const isPython = language === 'python';
    const quote = isSwift ? swiftQuote : isRuby ? rubyQuote : elixirQuote;
    quote.lastIndex = sigil.lastIndex = word.lastIndex = percentLiteral.lastIndex = heredoc.lastIndex = i;
    let match: RegExpExecArray | null;
    if (isRuby && (i === 0 || source[i - 1] === '\n') && source.startsWith('__END__', i)
        && /^(?:\r?\n|$)/.test(source.slice(i + 7, i + 9))) {
      break;
    } else if (isRuby && (i === 0 || source[i - 1] === '\n') && source.startsWith('=begin', i)
        && /\s/.test(source[i + 6] || ' ')) {
      const end = /^=end(?:[^\S\n].*)?\r?$/gm;
      end.lastIndex = i + 6;
      i = end.exec(source) ? end.lastIndex : source.length;
    } else if (isRuby && char === '\n' && pendingHeredocs.length) {
      i++;
      for (const { label, indented } of pendingHeredocs) {
        while (i < source.length) {
          const end = source.indexOf('\n', i);
          const row = source.slice(i, end < 0 ? source.length : end).replace(/\r$/, '');
          i = end < 0 ? source.length : end + 1;
          if ((indented ? row.trimStart() : row) === label) break;
        }
      }
      pendingHeredocs.length = 0;
    } else if (isRuby && char === '<' && (match = heredoc.exec(source))) {
      pendingHeredocs.push({ label: match[3] || match[4], indented: !!match[1] });
      i = heredoc.lastIndex;
      out.push({ kind: 'opaque', value: '', line });
    } else if (isRuby && char === '/' && (out.at(-1)?.line !== line ||
        ['=', '~', '(', '[', '{', ',', ';', 'return', 'when', 'if', 'unless'].includes(out.at(-1)!.value))) {
      i = stringEnd(source, i + 1, '/', '\\', false);
      out.push({ kind: 'opaque', value: '', line });
    } else if (isRuby && char === '%' && (match = percentLiteral.exec(source))) {
      const open = match[1];
      const end = closes[open] || open;
      i = stringEnd(source, percentLiteral.lastIndex, end, '\\', false, 0,
        !['q', 'w', 'i', 's'].includes(source[start + 1]), closes[open] ? open : undefined);
      const value = source.slice(percentLiteral.lastIndex, i - end.length);
      const literal = (match[0].length === 2 || ['q', 'Q'].includes(source[start + 1])) &&
        source[i - 1] === end && !value.includes('\\') && !value.includes('#{');
      out.push(literal ? { kind: 'string', value, line } : { kind: 'opaque', value: '', line });
    } else if (/\s/.test(char)) {
      i++;
    } else if ((!isSwift && char === '#') || (isSwift && source.startsWith('//', i))) {
      i = source.indexOf('\n', i + 1);
      if (i < 0) i = source.length;
    } else if (isSwift && source.startsWith('/*', i)) {
      i = blockCommentEnd(source, i);
    } else if (language === 'elixir' && (match = sigil.exec(source))) {
      const open = match[1];
      i = stringEnd(source, sigil.lastIndex, closes[open] || open, '\\', false, 0,
        /[a-z]/.test(source[start + 1]), closes[open] ? open : undefined);
      out.push({ kind: 'opaque', value: '', line });
    } else if ((match = quote.exec(source))) {
      const delimiter = isSwift ? match[2] : match[1];
      const marks = isSwift ? match[1] : '';
      const close = delimiter + marks;
      i = stringEnd(source, quote.lastIndex, close, '\\' + marks, isSwift, 0, !isPython && (!isRuby || delimiter !== "'"));
      const value = source.slice(quote.lastIndex, i - close.length);
      const literal = (delimiter === '"' || ((isRuby || isPython) && delimiter === "'")) && source.slice(i - close.length, i) === close &&
        !value.includes('\\' + marks) && (isSwift || !value.includes('#{'));
      out.push(literal ? { kind: 'string', value, line } : { kind: 'opaque', value: '', line });
    } else if ((match = word.exec(source))) {
      i = word.lastIndex;
      out.push({ kind: 'word', value: match[0], line });
    } else {
      i++;
      out.push({ kind: 'symbol', value: char, line });
    }
    for (let j = start; j < i; j++) if (source[j] === '\n') line++;
  }
  return out;
}

/** End of a balanced call, list or tuple, ignoring delimiter characters inside literals. */
export function closing(items: Token[], start: number): number {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const stack = [pairs[items[start].value]];
  for (let i = start + 1; i < items.length; i++) {
    const token = items[i];
    if (token.kind !== 'symbol') continue;
    if (pairs[token.value]) stack.push(pairs[token.value]);
    else if (token.value === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return -1;
}
