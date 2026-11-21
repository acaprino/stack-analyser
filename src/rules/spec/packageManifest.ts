import path from 'node:path';

import { matchDependencies } from '../../matchDependencies.js';
import { Payload } from '../../payload/index.js';

import type { SupportedDeps } from '../../types/rule.js';

export function projectPath(base: string, file: string): string {
  return path.relative(base, file).split(path.sep).join('/');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function packageComponent(
  name: string,
  folderPath: string,
  ecosystem: SupportedDeps,
  requirements: Map<string, string>
): Payload {
  const payload = new Payload({ name, folderPath });
  payload.dependencies = [...requirements].map(([pkg, version]) => [ecosystem, pkg, version]);
  payload.addTechs(matchDependencies([...requirements.keys()], ecosystem));
  return payload;
}
