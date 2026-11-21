import path from 'node:path';

import { LineCounter, parseAllDocuments, visit } from 'yaml';

import { endpointHosts } from '../../../loader.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { HostMention } from '../../../types/index.js';

const sourceFile = /\.(?:[cm]?[jt]sx?|py|rb|php|exs?|rs|go|cs|kts?|java|swift|dart|vue)$/i;
const configFile = /\.(?:json|ya?ml)$/i;
const exampleEnv = /^\.env\.(?:example|sample|template)(?:\.|$)/;
const excluded = /(?:^|\/)(?:docs?|examples?|fixtures?|tests?|__tests__|__fixtures__|node_modules|vendor|generated)(?:\/|$)|(?:[.-](?:test|spec|min|generated)|(?:^|\/)test_[^/]*)\.[^.]+$|(?:lock|shrinkwrap)\.(?:json|ya?ml)$|(?:^|\/)(?:package|composer)\.json$/i;
const maxFileSize = 500_000;

// Consume comments and complete strings so that a quoted URL in a comment, docstring or
// another string cannot become a standalone endpoint. Hash comments depend on the language.
function sourceValues(content: string, name: string, emit: (value: string, line: number) => void) {
  const hash = /\.(?:py|rb|php|exs?)$/i.test(name);
  const slashComments = !/\.(?:py|rb|exs?)$/i.test(name);
  const literals = /"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[^\n]|[^"\\\r\n])*"|'(?:\\[^\n]|[^'\\\r\n])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60/;
  const comments = /<!--[\s\S]*?(?:-->|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/;
  const tokens = new RegExp((hash ? '#[^\\n]*|' : '') + (slashComments ? comments.source + '|' : '') + literals.source, 'g');
  let line = 1;
  let cursor = 0;
  for (const match of content.matchAll(tokens)) {
    for (; cursor < match.index; cursor++) {
      if (content[cursor] === '\n') line++;
    }
    if (/^["'\x60]https?:\/\//i.test(match[0])) {
      emit(match[0].slice(1, -1), line);
    }
  }
}

function configValues(content: string, name: string, emit: (value: string, line: number) => void) {
  if (name.toLowerCase().endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch {
      return;
    }
  }
  const lineCounter = new LineCounter();
  for (const doc of parseAllDocuments(content, { lineCounter, logLevel: 'silent' })) {
    if (doc.errors.length) continue;
    visit(doc, {
      Scalar(key, node) {
        if (key !== 'key' && typeof node.value === 'string' && node.range) {
          emit(node.value, lineCounter.linePos(node.range[0]).line);
        }
      },
    });
  }
}

function envValues(content: string, emit: (value: string, line: number) => void) {
  for (const [index, line] of content.split('\n').entries()) {
    const match = /^\s*(?:export\s+)?[\w.-]+\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/.exec(line);
    if (match) emit(match[1] ?? match[2] ?? match[3], index + 1);
  }
}

export async function findHostMentions(files: ProviderFile[], provider: BaseProvider): Promise<HostMention[]> {
  const results: HostMention[] = [];
  if (endpointHosts.size === 0) return results;

  for (const file of files) {
    const { name } = file;
    const env = exampleEnv.test(name);
    const config = configFile.test(name);
    if (file.type !== 'file' || file.isSymbolicLink || (!env && !config && !sourceFile.test(name))) continue;
    const relative = path.relative(provider.basePath, file.fp).split(path.sep).join('/');
    if (relative.startsWith('../') || path.isAbsolute(relative) || excluded.test(relative)) continue;

    let content: string | null;
    try {
      const stat = await provider.stat(file.fp);
      if (!stat || stat.size > maxFileSize) continue;
      content = await provider.open(file.fp);
    } catch {
      // A provider can list a source but be unable to read its metadata or content.
      continue;
    }
    if (!content || content.length > maxFileSize || content.includes('\0')) continue;
    let possible = false;
    for (const candidate of content.matchAll(/https?:\/\/([a-z\d.-]+)/gi)) {
      if (endpointHosts.has(candidate[1].toLowerCase())) {
        possible = true;
        break;
      }
    }
    if (!possible) continue;

    const seen = new Set<string>();
    const emit = (value: string, line: number) => {
      // Inspect only the literal authority. Reject escaped or computed hosts, userinfo and
      // lookalike suffixes. Never put paths, queries, fragments or credentials in the output.
      const authority = /^https?:\/\/([a-z\d.-]+)(?::(\d{1,5}))?(?:[/?#]|$)/i.exec(value);
      if (!authority || (authority[2] && Number(authority[2]) > 65_535)) return;
      const host = authority[1].toLowerCase();
      if (seen.has(host)) return;
      seen.add(host);
      for (const tech of endpointHosts.get(host) ?? []) {
        results.push({ tech, host, path: relative, line });
      }
    };

    if (env) envValues(content, emit);
    else if (config) configValues(content, name, emit);
    else sourceValues(content, name, emit);
  }
  return results;
}
