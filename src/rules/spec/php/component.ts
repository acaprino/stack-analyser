import path from 'node:path';

import { l } from '../../../common/log.js';
import { detectLicense } from '../licenses/index.js';
import { insideProject, isRecord, packageComponent } from '../packageManifest.js';

import type { BaseProvider } from '../../../provider/base.js';
import type { ComponentMatcher } from '../../../types/rule.js';

export interface ComposerJson {
  name?: string;
  license?: string | string[];
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
}

async function folders(provider: BaseProvider, pattern: string): Promise<string[]> {
  // Composer expands a path repository's `url` with PHP's glob(): `*` and `?` within one folder name. A folder name is
  // text without grammar.
  const root = path.parse(pattern).root;
  let found = [root];
  for (const part of pattern.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    if (!/[*?]/.test(part)) {
      found = found.map((folder) => path.join(folder, part));
      continue;
    }
    const name = new RegExp(
      '^' +
        part
          .replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
          .replaceAll('*', '.*')
          .replaceAll('?', '.') +
        '$'
    );
    const next: string[] = [];
    for (const folder of found) {
      for (const item of await provider.listDir(folder)) {
        if (item.type === 'dir' && !item.isSymbolicLink && name.test(item.name)) next.push(item.fp);
      }
    }
    found = next;
  }
  return found;
}

/**
 * The names of the packages that `repositories` entries of type `path` take from a folder inside the copy: the `name`
 * of the composer.json in each folder of the `url`. Those that leave the copy are read as before.
 */
async function localPackages(
  json: Record<string, unknown>,
  file: string,
  provider: BaseProvider
): Promise<Set<string>> {
  const names = new Set<string>();
  const repositories = isRecord(json.repositories)
    ? Object.values(json.repositories)
    : json.repositories;
  if (!Array.isArray(repositories)) return names;
  for (const repository of repositories) {
    if (!isRecord(repository) || repository.type !== 'path' || typeof repository.url !== 'string')
      continue;
    if (!insideProject(provider.basePath, path.dirname(file), repository.url)) continue;
    for (const folder of await folders(
      provider,
      path.resolve(path.dirname(file), repository.url)
    )) {
      let manifest: unknown;
      try {
        manifest = JSON.parse((await provider.open(path.join(folder, 'composer.json'))) ?? '');
      } catch {
        continue;
      }
      if (isRecord(manifest) && typeof manifest.name === 'string')
        names.add(manifest.name.toLowerCase());
    }
  }
  return names;
}

export const detectPhpComponent: ComponentMatcher = async (files, provider) => {
  const file = files.find(
    (item) => item.name === 'composer.json' && item.type === 'file' && !item.isSymbolicLink
  );
  if (!file) return false;
  const content = await provider.open(file.fp);
  if (!content) return false;

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (err) {
    l.warn('Failed to parse composer.json', file.fp, err);
    return false;
  }
  if (!isRecord(json)) return false;
  const name = typeof json.name === 'string' && json.name.trim() ? json.name : undefined;
  const sections = [json.require, json['require-dev']].filter(isRecord);
  if (!name && sections.length === 0) return false;

  const requirements = new Map<string, string>();
  for (const section of sections) {
    for (const [id, version] of Object.entries(section)) {
      if (typeof version === 'string') requirements.set(id, version);
    }
  }
  const fromFolders = await localPackages(json, file.fp, provider);
  const local = new Set([...requirements.keys()].filter((id) => fromFolders.has(id.toLowerCase())));
  const component = packageComponent(
    name ?? (path.basename(path.dirname(file.fp)) || 'virtual'),
    file.fp,
    'php',
    requirements,
    file.fp,
    local
  );
  component.addTech(
    'phpcomposer',
    ['matched file: composer.json'],
    [{ kind: 'file', value: file.name, path: file.fp }]
  );
  const licenses = Array.isArray(json.license) ? json.license : [json.license];
  for (const license of licenses) {
    if (typeof license !== 'string') continue;
    const detected = detectLicense(license);
    if (detected) component.addLicenses(detected);
  }
  return component;
};
