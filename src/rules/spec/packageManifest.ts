import path from 'node:path';

import { Payload } from '../../payload/index.js';

import type { BaseProvider } from '../../provider/base.js';
import type { SupportedDeps } from '../../types/rule.js';

export function projectPath(base: string, file: string): string {
  return path.relative(base, file).split(path.sep).join('/');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const shared = new WeakMap<BaseProvider, Map<string, Promise<unknown>>>();

/**
 * What `read` gives, computed once for each `key` of an analysis. A file shared by many modules (a version catalog, a
 * workspace root) is asked for by each of them: it is opened and parsed for the first only. The result is not to be changed.
 */
export function oncePerRun<T>(
  provider: BaseProvider,
  { key, read }: { key: string; read: () => Promise<T> }
): Promise<T> {
  let known = shared.get(provider);
  if (!known) {
    known = new Map<string, Promise<unknown>>();
    shared.set(provider, known);
  }
  let result = known.get(key) as Promise<T> | undefined;
  if (!result) {
    result = read();
    known.set(key, result);
  }
  return result;
}

/** Whether `target` (absolute, or relative to `from`, a folder) stays inside the analysed copy of the project. */
export function insideProject(
  base: string,
  { from, target }: { from: string; target: string }
): boolean {
  const relative = path.relative(path.resolve(base), path.resolve(from, target));
  return !(relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative));
}

/**
 * `file` is the manifest that holds the requirements: it is the evidence of every technology they match. A requirement
 * in `local` comes from a folder of the project itself: it stays a dependency and matches no technology.
 */
export function packageComponent(
  name: string,
  {
    folderPath,
    ecosystem,
    requirements,
    file,
    local = new Set(),
  }: {
    folderPath: string;
    ecosystem: SupportedDeps;
    requirements: Map<string, string>;
    file: string;
    local?: ReadonlySet<string>;
  }
): Payload {
  const payload = new Payload({ name, folderPath });
  payload.dependencies = [...requirements].map(([pkg, version]) => [ecosystem, pkg, version]);
  payload.addDependencyTechs(
    [...requirements.keys()].filter((pkg) => !local.has(pkg)),
    { type: ecosystem, file }
  );
  return payload;
}
