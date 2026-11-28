import path from 'node:path';

import { LineCounter, parseAllDocuments, visit } from 'yaml';

import { endpointHosts } from '../../../loader.js';
import { envTemplate } from '../dotenv/index.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { HostMention } from '../../../types/index.js';

const sourceFile = /\.(?:[cm]?[jt]sx?|py|rb|php|exs?|rs|go|cs|kts?|java|swift|dart|vue)$/i;
const configFile = /\.(?:json|ya?ml)$/i;
const excluded =
  /(?:^|\/)(?:docs?|examples?|fixtures?|tests?|__tests__|__fixtures__|node_modules|vendor|generated)(?:\/|$)|(?:[.-](?:test|spec|min|generated)|(?:^|\/)test_[^/]*)\.[^.]+$|(?:lock|shrinkwrap)\.(?:json|ya?ml)$|(?:^|\/)(?:package|composer)\.json$/i;
const maxFileSize = 500_000;

// Consume comments and complete strings so that a quoted URL in a comment, docstring or
// another string cannot become a standalone endpoint. Hash comments depend on the language.
/** Receives each candidate value with the line it starts on. */
type Emit = (value: string, line: number) => void;

function sourceValues(content: string, { name, emit }: { name: string; emit: Emit }): void {
  const hash = /\.(?:py|rb|php|exs?)$/i.test(name);
  const slashComments = !/\.(?:py|rb|exs?)$/i.test(name);
  const literals =
    /"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[^\n]|[^"\\\r\n])*"|'(?:\\[^\n]|[^'\\\r\n])*'|\u0060(?:\\[\s\S]|[^\u0060\\])*\u0060/;
  const comments = /<!--[\s\S]*?(?:-->|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/;
  const tokens = new RegExp(
    (hash ? String.raw`#[^\n]*|` : '') +
      (slashComments ? comments.source + '|' : '') +
      literals.source,
    'g'
  );
  let line = 1;
  let cursor = 0;
  for (const match of content.matchAll(tokens)) {
    for (; cursor < match.index; cursor++) {
      if (content[cursor] === '\n') line++;
    }
    if (/^["'\u0060]https?:\/\//i.test(match[0])) {
      emit(match[0].slice(1, -1), line);
    }
  }
}

function configValues(content: string, { name, emit }: { name: string; emit: Emit }): void {
  if (name.toLowerCase().endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch {
      return;
    }
  }
  const lineCounter = new LineCounter();
  let docs: ReturnType<typeof parseAllDocuments>;
  try {
    docs = parseAllDocuments(content, { lineCounter, logLevel: 'silent' });
  } catch {
    // The parser recurses: a file nested deep enough overflows its stack. Such a file names no endpoint.
    return;
  }
  for (const doc of docs) {
    if (doc.errors.length > 0) continue;
    visit(doc, {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- the node type name the yaml visitor expects
      Scalar: (key, node) => {
        if (key !== 'key' && typeof node.value === 'string' && node.range) {
          emit(node.value, lineCounter.linePos(node.range[0]).line);
        }
      },
    });
  }
}

function envValues(content: string, emit: Emit): void {
  for (const [index, line] of content.split('\n').entries()) {
    const match = /^\s*(?:export\s+)?[\w.-]+\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/.exec(line);
    if (!match) continue;
    // Only the group of the quoting that matched is set.
    const [, double, single, bare] = match as (string | undefined)[];
    emit(double ?? single ?? bare ?? '', index + 1);
  }
}

/** Files read at the same time: enough to hide the latency of each read, few enough to stay far from the descriptor limit. */
const concurrentReads = 16;

async function readCandidate(file: ProviderFile, provider: BaseProvider): Promise<null | string> {
  try {
    const stat = await provider.stat(file.fp);
    if (!stat || stat.size > maxFileSize) return null;
    return await provider.open(file.fp);
  } catch {
    // A provider can list a source but be unable to read its metadata or content.
    return null;
  }
}

interface Candidate {
  file: ProviderFile;
  relative: string;
  env: boolean;
  config: boolean;
}

function scanContent(
  content: null | string,
  { file: { name }, relative, env, config }: Candidate
): HostMention[] {
  const results: HostMention[] = [];
  if (!content || content.length > maxFileSize || content.includes('\0')) return results;
  let possible = false;
  for (const candidate of content.matchAll(/https?:\/\/([a-z\d.-]+)/gi)) {
    if (endpointHosts.has(candidate[1].toLowerCase())) {
      possible = true;
      break;
    }
  }
  if (!possible) return results;

  const seen = new Set<string>();
  const emit: Emit = (value, line) => {
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
  else if (config) configValues(content, { name, emit });
  else sourceValues(content, { name, emit });
  return results;
}

export async function findHostMentions(
  files: ProviderFile[],
  provider: BaseProvider
): Promise<HostMention[]> {
  const results: HostMention[] = [];
  if (endpointHosts.size === 0) return results;

  const candidates: Candidate[] = [];
  for (const file of files) {
    const { name } = file;
    const env = envTemplate.test(name);
    const config = configFile.test(name);
    if (file.type !== 'file' || (!env && !config && !sourceFile.test(name))) continue;
    const relative = path.relative(provider.basePath, file.fp).split(path.sep).join('/');
    if (relative.startsWith('../') || path.isAbsolute(relative) || excluded.test(relative))
      continue;
    candidates.push({ file, relative, env, config });
  }

  // A batch is scanned before the next is read, so at most `concurrentReads` contents are held at once.
  // Results keep the order of the listing, whatever order the reads finished in.
  for (let start = 0; start < candidates.length; start += concurrentReads) {
    const batch = candidates.slice(start, start + concurrentReads);
    const contents = await Promise.all(batch.map(({ file }) => readCandidate(file, provider)));
    for (const [index, candidate] of batch.entries())
      results.push(...scanContent(contents[index], candidate));
  }
  return results;
}
