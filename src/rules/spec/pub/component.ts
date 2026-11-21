import { parse } from 'yaml';

import { l } from '../../../common/log.js';
import { isRecord, packageComponent, projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

function manifestRequirements(data: Record<string, unknown>): Map<string, string> {
  const packages = new Map<string, string>();
  for (const group of [data.dev_dependencies, data.dependencies]) {
    if (!isRecord(group)) continue;
    for (const [key, spec] of Object.entries(group)) {
      if (spec === null || typeof spec === 'string') {
        packages.set(key, spec || 'any');
      } else if (isRecord(spec) && !('path' in spec)) {
        const name = isRecord(spec.hosted) && typeof spec.hosted.name === 'string' ? spec.hosted.name : key;
        const version = typeof spec.version === 'string' ? spec.version : undefined;
        const git = isRecord(spec.git) && typeof spec.git.ref === 'string' ? spec.git.ref : undefined;
        packages.set(name, version || git || (typeof spec.sdk === 'string' ? `sdk:${spec.sdk}` : 'any'));
      }
    }
  }
  if (isRecord(data.dependency_overrides)) {
    for (const [name, spec] of Object.entries(data.dependency_overrides)) {
      if (isRecord(spec) && typeof spec.path === 'string') packages.delete(name);
    }
  }
  return packages;
}

export const detectPubComponent: ComponentMatcher = async (files, provider) => {
  const manifest = files.find((file) => file.type === 'file' && file.name === 'pubspec.yaml');
  const lock = files.find((file) => file.type === 'file' && file.name === 'pubspec.lock');
  if (!manifest && !lock) return false;

  let name = 'virtual';
  let requirements = new Map<string, string>();
  for (const file of [manifest, lock]) {
    if (!file) continue;
    const text = await provider.open(file.fp);
    if (!text) continue;
    try {
      const data: unknown = parse(text);
      if (!isRecord(data)) continue;
      if (file === manifest) {
        if (typeof data.name === 'string') name = data.name;
        requirements = manifestRequirements(data);
      } else if (isRecord(data.packages)) {
        for (const [key, spec] of Object.entries(data.packages)) {
          if (!isRecord(spec)) continue;
          if (spec.source === 'path') {
            requirements.delete(key);
            continue;
          }
          if (typeof spec.version !== 'string') continue;
          if (spec.dependency !== 'direct main' && spec.dependency !== 'direct dev') continue;
          // A workspace-wide lock can describe another member's own direct requirements.
          if (!manifest || requirements.has(key)) requirements.set(key, spec.version);
        }
      }
    } catch (err) {
      l.warn('Failed to parse Dart package file', file.fp, err);
    }
  }
  if (name === 'virtual' && !requirements.size) return false;
  const source = manifest || lock!;
  const payload = packageComponent(name, source.fp, 'pub', requirements);
  payload.addTech('dart', [`Dart package: ${projectPath(provider.basePath, source.fp)}`]);
  return payload;
};
