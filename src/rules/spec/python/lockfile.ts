import path from 'node:path';

import { parse as parseToml } from 'smol-toml';

import { l } from '../../../common/log.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';
import { isRecord } from '../packageManifest.js';

import type { ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const LOCKFILE = 'requirements.txt';
const PROJECT = 'pyproject.toml';
// A bare URL, directive or local path cannot establish a distribution name.
const requirement = /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:\[[\w., -]+\])?\s*(?=$|[<>=!~;@(])/;

export const detectPythonLockfile: ComponentMatcher = async (files, provider) => {
  const manifests: Payload[] = [];
  for (const file of files) {
    if (file.name === PROJECT) {
      const content = await provider.open(file.fp);
      if (!content) {
        continue;
      }

      const pl = new Payload({
        name: 'virtual',
        folderPath: path.dirname(file.fp),
      });
      const res = parsePyproject({ content, pl, file });
      if (!res) {
        continue;
      }

      manifests.push(pl);
    } else if (file.name === LOCKFILE) {
      const content = await provider.open(file.fp);
      if (!content) {
        continue;
      }

      const pl = new Payload({
        name: 'virtual',
        folderPath: path.dirname(file.fp),
      });
      parseRequirementsTxt(content, pl);

      manifests.push(pl);
    } else {
      continue;
    }
  }

  return manifests.length ? manifests : false;
};

function requirements(lines: unknown[]): Dependency[] {
  const dependencies: Dependency[] = [];
  for (const raw of lines) {
    if (typeof raw !== 'string') continue;
    const line = raw.trim().replace(/\s+#.*$/, '');
    const match = requirement.exec(line);
    if (!match) continue;
    const specifier = line.slice(match[0].length).split(';', 1)[0].trim();
    const version = /^\(?\s*[~!=<>]+\s*([^,\s)]+)/.exec(specifier)?.[1] || 'latest';
    dependencies.push(['python', match[1], version]);
  }
  return dependencies;
}

export function parseRequirementsTxt(content: string, pl: Payload): void {
  const lines = content.replace(/\\\r?\n/g, ' ').split(/\r?\n/).map((line) => line.replace(/\s+--hash[=\s].*$/, ''));
  pl.dependencies = requirements(lines);
  pl.addTechs(matchDependencies(pl.dependencies.map(([, name]) => name), 'python'));
}

export function parsePyproject({
  content,
  pl,
  file,
}: {
  content: string;
  pl: Payload;
  file: ProviderFile;
}): boolean {
  let json: Record<string, unknown>;
  try {
    json = parseToml(content);
  } catch (err) {
    l.warn('Failed to parse pyproject.toml', file.fp, err);
    return false;
  }

  const prj = isRecord(json.project) ? json.project : {};
  const build = json['build-system'];
  const groups: unknown[] = [prj.dependencies, isRecord(build) ? build.requires : undefined];
  for (const table of [prj['optional-dependencies'], json['dependency-groups']]) {
    if (isRecord(table)) groups.push(...Object.values(table));
  }
  const dependencies = requirements(groups.filter(Array.isArray).flat());
  const poetry = isRecord(json.tool) ? json.tool.poetry : undefined;
  if (isRecord(poetry)) {
    const tables: unknown[] = [poetry.dependencies, poetry['dev-dependencies']];
    if (isRecord(poetry.group)) {
      for (const group of Object.values(poetry.group)) if (isRecord(group)) tables.push(group.dependencies);
    }
    for (const table of tables) {
      if (!isRecord(table)) continue;
      for (const [name, constraint] of Object.entries(table)) {
        if (name.toLowerCase() === 'python') continue;
        for (const entry of Array.isArray(constraint) ? constraint : [constraint]) {
          if (typeof entry === 'string') dependencies.push(['python', name, entry]);
          else if (isRecord(entry) && !('path' in entry)) {
            dependencies.push(['python', name, typeof entry.version === 'string' ? entry.version : 'latest']);
          }
        }
      }
    }
  }
  if (!isRecord(json.project) && !dependencies.length) return false;
  if ('license' in prj) {
    const tmp = isRecord(prj.license) ? prj.license.text : prj.license;
    if (typeof tmp === 'string' && tmp) {
      const lic = detectLicense(tmp);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }
  }

  pl.dependencies = [...new Map(dependencies.map((dep) => [JSON.stringify(dep), dep])).values()];
  pl.addTechs(matchDependencies(pl.dependencies.map(([, name]) => name), 'python'));
  return true;
}
