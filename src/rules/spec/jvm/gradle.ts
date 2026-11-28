import { parse as parseToml } from 'smol-toml';

import { isRecord } from '../packageManifest.js';

import type { Dependency } from '../../../types/index.js';

type Catalog = Map<string, Dependency[]>;

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/** A text that is there and not empty. */
function filled(text?: string): text is string {
  return text !== undefined && text !== '';
}

/** Turns `alias-name` or `alias_name` into the `alias.name` accessor Gradle generates for it. */
function accessor(alias: string): string {
  return alias.replaceAll(/[-_]/g, '.');
}

function coordinate(value: string, version = ''): Dependency | undefined {
  const [coordinates = ''] = value.split('@');
  // A coordinate can stop before its version: the third part may be missing.
  const [group = '', artifact = '', pinned] = coordinates.split(':') as (string | undefined)[];
  if (!group || !artifact || !/^[\w.-]+$/.test(group) || !/^[\w.-]+$/.test(artifact)) return;
  return ['maven', `${group}:${artifact}`, pinned?.includes('$') ? '' : (pinned ?? version)];
}

function marker(id: string, version: string): Dependency | undefined {
  return /^[\w.-]+$/.test(id) ? ['maven', `${id}:${id}.gradle.plugin`, version] : undefined;
}

export function gradleCatalog(source: string): Catalog {
  const entries: Catalog = new Map();
  let data: Record<string, unknown>;
  try {
    data = parseToml(source);
  } catch {
    return entries;
  }
  const versions = record(data['versions']);
  for (const section of ['libraries', 'plugins']) {
    for (const [alias, item] of Object.entries(record(data[section]))) {
      const entry = record(item);
      const reference = record(entry['version'])['ref'];
      const version = typeof reference === 'string' ? versions[reference] : entry['version'];
      const pinned = typeof version === 'string' ? version : '';
      let dep: Dependency | undefined;
      if (section === 'plugins') {
        const [id, shorthandVersion] = (typeof item === 'string' ? item.split(':') : []) as (
          | string
          | undefined
        )[];
        const name = id ?? entry['id'];
        if (typeof name === 'string') dep = marker(name, shorthandVersion ?? pinned);
      } else {
        const module = typeof item === 'string' ? item : entry['module'];
        if (typeof module === 'string') dep = coordinate(module, pinned);
        else if (typeof entry['group'] === 'string' && typeof entry['name'] === 'string') {
          dep = coordinate(`${entry['group']}:${entry['name']}`, pinned);
        }
      }
      if (dep)
        entries.set(`${section === 'plugins' ? 'libs.plugins.' : 'libs.'}${accessor(alias)}`, [
          dep,
        ]);
    }
  }
  for (const [alias, members] of Object.entries(record(data['bundles']))) {
    if (Array.isArray(members))
      entries.set(
        `libs.bundles.${accessor(alias)}`,
        members.flatMap((member) =>
          typeof member === 'string' ? (entries.get(`libs.${accessor(member)}`) ?? []) : []
        )
      );
  }
  return entries;
}

// Read literal calls shared by the Groovy and Kotlin DSLs. Gradle scripts are executable:
// strings/comments are atomic and only immediate statements of the two top-level blocks count.
const tokens =
  /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*|"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'|[\w.$-]+|\r?\n|[^\s]/g;
const configuration =
  /^(?:(?:\w+(?:Api|Implementation|CompileOnly|RuntimeOnly|AnnotationProcessor))|api|implementation|compileOnly|compileOnlyApi|runtimeOnly|annotationProcessor|kapt\w*|ksp\w*|compile|runtime|testCompile|testRuntime)$/;

function literal(value?: string): string | undefined {
  const quote = value?.at(0);
  if (
    value === undefined ||
    quote === undefined ||
    !["'", '"'].includes(quote) ||
    value.length < 2 ||
    value.at(-1) !== quote
  )
    return;
  return value.slice(1, -1);
}

function moduleArguments(args: string[], catalog: Catalog): Dependency[] {
  // Gradle's Groovy map notation, e.g. implementation group: 'g', name: 'a', version: '1'.
  if (args[1] === ':' || args[1] === '=') {
    const fields = new Map<string, string>();
    for (let i = 0; i < args.length; i += 4) {
      const value = literal(args[i + 2]);
      if (
        value === undefined ||
        ![':', '='].includes(args[i + 1]) ||
        (args[i + 3] && args[i + 3] !== ',')
      )
        return [];
      fields.set(args[i], value);
    }
    const group = fields.get('group');
    const name = fields.get('name');
    const dep =
      filled(group) && filled(name)
        ? coordinate(`${group}:${name}`, fields.get('version'))
        : undefined;
    return dep ? [dep] : [];
  }
  if (args.some((v, i) => i % 2 === 1 && v !== ',')) return [];
  return args
    .filter((_, i) => i % 2 === 0)
    .flatMap((value) => {
      const name = literal(value);
      if (name !== undefined) {
        const dep = coordinate(name);
        return dep ? [dep] : [];
      }
      return value.startsWith('libs.') && !value.startsWith('libs.plugins.')
        ? (catalog.get(value) ?? [])
        : [];
    });
}

// Gradle shares Java's unbraced control flow. A newline after "if (condition)" (or "else")
// does not start a new independent declaration.
// A trailing comma continues the argument list on the next line, in both DSLs.
function awaitsBody(statement: string[]): boolean {
  if (statement.at(-1) === 'else' || statement.at(-1) === ',') return true;
  const guard = Math.max(...['if', 'for', 'while'].map((word) => statement.lastIndexOf(word)));
  if (guard < 0 || statement[guard + 1] !== '(') return false;
  let depth = 1;
  for (let i = guard + 2; i < statement.length; i++) {
    if (statement[i] === '(') depth++;
    if (statement[i] === ')') {
      depth--;
      if (depth === 0) return i === statement.length - 1;
    }
  }
  return false;
}

export function gradleDependencies(source: string, catalog: Catalog): Dependency[] {
  const result: Dependency[] = [];
  const blocks: string[] = [];
  let statement: string[] = [];
  let parens = 0;
  let lineBreak = false;
  function read(): void {
    // A branch of `if`/`else` in the top-level block declares a possible build target, braced or not: its guard goes.
    let parts = statement;
    while (
      blocks[0] === 'dependencies' &&
      (parts[0] === 'else' || (parts[0] === 'if' && parts[1] === '('))
    ) {
      if (parts[0] === 'else') {
        parts = parts.slice(1);
        continue;
      }
      let depth = 0;
      const end = parts.findIndex(
        (token) => (depth += token === '(' ? 1 : token === ')' ? -1 : 0) === 0 && token === ')'
      );
      if (end === -1) return;
      parts = parts.slice(end + 1);
    }
    const [call, ...rest] = parts;
    if (!call) return;
    const args = rest.filter((t) => t !== '(' && t !== ')');
    if (
      blocks.length === 0 &&
      call === 'apply' &&
      args.length === 3 &&
      args[0] === 'plugin' &&
      [':', '='].includes(args[1])
    ) {
      const id = literal(args[2]);
      const dep = filled(id) ? marker(id, '') : undefined;
      if (dep) result.push(dep);
      return;
    }
    if (
      blocks.length === 1 &&
      blocks[0] === 'plugins' &&
      ['id', 'alias', 'kotlin'].includes(call)
    ) {
      if (args.length > 1 && !['version', '.version', 'apply', '.apply'].includes(args[1])) return;
      const applyAt = args.findIndex((arg) => arg === 'apply' || arg === '.apply');
      if (applyAt !== -1 && args[applyAt + 1] !== 'true') return;
      if (call === 'alias') {
        if (args[0]?.startsWith('libs.plugins.')) result.push(...(catalog.get(args[0]) ?? []));
      } else {
        const id = literal(args[0]);
        const versionAt = args.findIndex((arg) => arg === 'version' || arg === '.version');
        const version = versionAt === -1 ? '' : literal(args[versionAt + 1]);
        const entry = filled(id)
          ? marker(call === 'kotlin' ? `org.jetbrains.kotlin.${id}` : id, version ?? '')
          : undefined;
        if (entry) result.push(entry);
      }
    } else if (configuration.test(call) || call === 'add') {
      const topLevel =
        blocks[0] === 'dependencies' && blocks.slice(1).every((block) => block === 'branch');
      const kotlinSet =
        blocks[0] === 'kotlin' &&
        blocks[1] === 'sourceSets' &&
        ((blocks.length === 3 && /^\w+\.dependencies$/.test(blocks[2])) ||
          (blocks.length === 4 && blocks[2] === 'source set' && blocks[3] === 'dependencies'));
      if (!topLevel && !kotlinSet) return;
      if (call === 'add' && (literal(args[0]) === undefined || args[1] !== ',')) return;
      result.push(...moduleArguments(call === 'add' ? args.slice(2) : args, catalog));
    }
  }
  for (const [token] of source.matchAll(tokens)) {
    if (token.startsWith('//') || token.startsWith('/*')) continue;
    if (token.endsWith('\n')) {
      if (parens === 0) lineBreak = true;
      continue;
    }
    if (lineBreak) {
      // A plugin declaration can continue on the next line with .version(...) or .apply(false).
      const pluginContinuation =
        blocks.length === 1 &&
        blocks[0] === 'plugins' &&
        ['.version', 'version', '.apply', 'apply'].includes(token);
      if (!pluginContinuation && !awaitsBody(statement)) {
        read();
        statement = [];
      }
      lineBreak = false;
    }
    if (token === '{') {
      read();
      let block = statement.length === 1 ? statement[0] : '';
      if (blocks[0] === 'dependencies' && ['if', 'else'].includes(statement[0])) block = 'branch';
      if (blocks.length === 2 && blocks[0] === 'kotlin' && blocks[1] === 'sourceSets') {
        const delegate =
          statement.length === 4 &&
          statement[0] === 'val' &&
          statement[2] === 'by' &&
          ['getting', 'creating'].includes(statement[3]);
        if (delegate || /^\w+(?:Main|Test)$/.test(block)) block = 'source set';
      }
      blocks.push(block);
      statement = [];
    } else if (token === '}' || token === ';') {
      read();
      statement = [];
      if (token === '}') blocks.pop();
    } else {
      if (token === '(') parens++;
      if (token === ')') parens = Math.max(0, parens - 1);
      statement.push(token);
    }
  }
  read();
  return result;
}
