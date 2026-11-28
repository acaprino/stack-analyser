import path from 'node:path';

import { dependencies } from '../loader.js';
import { Payload } from '../payload/index.js';

import type { BaseProvider } from '../provider/base.js';
import type { Declaration } from '../types/index.js';
import type { SupportedDeps } from '../types/rule.js';

export interface AnalyserOptions {
  provider: BaseProvider;
  /** Packages, images and actions another tool already read from the project. They go through the same rules. */
  declarations?: Declaration[];
}

/** A declaration `path` as a normalized path inside the analysed root, or `null` when it is not one. */
function insideRoot(value: string): null | string {
  // Either kind of separator, and either kind of absolute path, whatever the platform running the analysis.
  const posix = value.replaceAll('\\', '/');
  if (path.posix.isAbsolute(posix) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value))
    return null;
  const normalized = path.posix.normalize(posix);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) return null;
  return normalized;
}

/** The declaration an entry stands for, or what is wrong with it. */
function readDeclaration(entry: unknown): Declaration | string {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
    return 'expected an object';
  const fields = entry as Record<string, unknown>;

  for (const field of ['type', 'name', 'path', 'source']) {
    if (fields[field] === undefined) return `missing "${field}"`;
    if (typeof fields[field] !== 'string' || fields[field] === '')
      return `"${field}" must be a non-empty string`;
  }
  const [type, name, file, source] = ['type', 'name', 'path', 'source'].map(
    (field) => fields[field] as string
  );
  const { version, line } = fields;
  if (!Object.hasOwn(dependencies, type)) {
    return `"type" must be one of ${Object.keys(dependencies).join(', ')}, got "${type}"`;
  }
  const inside = insideRoot(file);
  if (inside === null) return `"path" must be a file relative to the analysed root, got "${file}"`;
  if (version !== undefined && typeof version !== 'string') return '"version" must be a string';
  if (line !== undefined && !(Number.isInteger(line) && (line as number) > 0))
    return '"line" must be a positive integer';

  return {
    type: type as SupportedDeps,
    name,
    ...(version !== undefined && { version }),
    path: inside,
    ...(line !== undefined && { line: line as number }),
    source,
  };
}

/**
 * Check declarations that come from outside; this is the only place that does.
 * An entry that is not valid throws an error that starts with `declaration <index>`.
 */
export function parseDeclarations(value: unknown): Declaration[] {
  if (!Array.isArray(value)) throw new TypeError('declarations must be an array');

  return value.map((entry: unknown, index) => {
    const declaration = readDeclaration(entry);
    if (typeof declaration === 'string')
      throw new TypeError(`declaration ${index}: ${declaration}`);
    return declaration;
  });
}

/**
 * A path inside the project, written the way the provider writes its own: a provider rooted at `C:\repo`
 * gives `C:\repo\sub\package.json`, one rooted at `/` gives `/sub/package.json`.
 */
function underBase(base: string, relative: string): string {
  const join = /^[A-Za-z]:|\\/.test(base) ? path.win32.join : path.posix.join;
  return join(base, relative);
}

export async function analyser(opts: AnalyserOptions): Promise<Payload> {
  const provider = opts.provider;
  const declarations = opts.declarations === undefined ? [] : parseDeclarations(opts.declarations);
  const pl = new Payload({ name: 'main', folderPath: '/' });

  await pl.recurse(provider, provider.basePath);

  // They go on the root component: nothing says which module of the project another tool meant.
  for (const { type, name, path: file, line, source } of declarations) {
    pl.addDependencyTechs([name], type, underBase(provider.basePath, file), { line, source });
  }

  return pl;
}
