import path from 'node:path';

import { Payload } from '../../payload/index.js';

import type { SupportedDeps } from '../../types/rule.js';

export function projectPath(base: string, file: string): string {
  return path.relative(base, file).split(path.sep).join('/');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
