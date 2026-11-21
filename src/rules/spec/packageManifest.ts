import path from 'node:path';

import { Payload } from '../../payload/index.js';

import type { SupportedDeps } from '../../types/rule.js';

export function projectPath(base: string, file: string): string {
  return path.relative(base, file).split(path.sep).join('/');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** `file` is the manifest that holds the requirements: it is the evidence of every technology they match. */
export function packageComponent(
  name: string,
  folderPath: string,
  ecosystem: SupportedDeps,
  requirements: Map<string, string>,
  file: string
): Payload {
  const payload = new Payload({ name, folderPath });
  payload.dependencies = [...requirements].map(([pkg, version]) => [ecosystem, pkg, version]);
  payload.addDependencyTechs([...requirements.keys()], ecosystem, file);
  return payload;
}
