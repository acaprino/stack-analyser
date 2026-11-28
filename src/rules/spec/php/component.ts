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

/**
 * Whether `name` matches a glob of `*` and `?`. It steps through both texts once and goes back only to the last `*`,
 * so a pattern written by the analysed project cannot make it backtrack the way a regular expression would.
 */
export function matchesGlob(pattern: string, name: string): boolean {
  let p = 0;
  let n = 0;
  let star = -1;
  let resume = 0;
  while (n < name.length) {
    if (p < pattern.length && (pattern[p] === '?' || pattern[p] === name[n])) {
      p++;
      n++;
    } else if (pattern[p] === '*') {
      star = p++;
      resume = n;
    } else if (star === -1) {
      return false;
    } else {
      p = star + 1;
      n = ++resume;
    }
  }
  while (pattern[p] === '*') p++;
  return p === pattern.length;
}

/** More wildcard folder levels than a real path repository uses would list the whole tree. */
const MAX_WILDCARD_LEVELS = 3;

async function folders(provider: BaseProvider, pattern: string): Promise<string[]> {
  // Composer expands a path repository's `url` with PHP's glob(): `*` and `?` within one folder name. A folder name is
  // text without grammar.
  const root = path.parse(pattern).root;
  const parts = pattern.slice(root.length).split(/[\\/]/).filter(Boolean);
  if (parts.filter((part) => /[*?]/.test(part)).length > MAX_WILDCARD_LEVELS) return [];
  let found = [root];
  for (const part of parts) {
    if (!/[*?]/.test(part)) {
      found = found.map((folder) => path.join(folder, part));
      continue;
    }
    const next: string[] = [];
    for (const folder of found) {
      for (const item of await provider.listDir(folder)) {
        if (item.type === 'dir' && !item.isSymbolicLink && matchesGlob(part, item.name))
          next.push(item.fp);
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
  { file, provider }: { file: string; provider: BaseProvider }
): Promise<Set<string>> {
  const names = new Set<string>();
  const repositories = isRecord(json.repositories)
    ? Object.values(json.repositories)
    : json.repositories;
  if (!Array.isArray(repositories)) return names;
  for (const repository of repositories) {
    if (!isRecord(repository) || repository.type !== 'path' || typeof repository.url !== 'string')
      continue;
    if (!insideProject(provider.basePath, { from: path.dirname(file), target: repository.url }))
      continue;
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
  const sections = [json.require, json['require-dev']].filter((section) => isRecord(section));
  if (!name && sections.length === 0) return false;

  const requirements = new Map<string, string>();
  for (const section of sections) {
    for (const [id, version] of Object.entries(section)) {
      if (typeof version === 'string') requirements.set(id, version);
    }
  }
  const fromFolders = await localPackages(json, { file: file.fp, provider });
  const local = new Set([...requirements.keys()].filter((id) => fromFolders.has(id.toLowerCase())));
  const component = packageComponent(name ?? (path.basename(path.dirname(file.fp)) || 'virtual'), {
    folderPath: file.fp,
    ecosystem: 'php',
    requirements,
    file: file.fp,
    local,
  });
  component.addTech('phpcomposer', {
    reason: ['matched file: composer.json'],
    evidence: [{ kind: 'file', value: file.name, path: file.fp }],
  });
  const licenses = Array.isArray(json.license) ? json.license : [json.license];
  for (const license of licenses) {
    if (typeof license !== 'string') continue;
    const detected = detectLicense(license);
    if (detected !== false) component.addLicenses(detected);
  }
  return component;
};
