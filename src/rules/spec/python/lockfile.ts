import path from 'node:path';

import toml from '@iarna/toml';

import { l } from '../../../common/log.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';

import type { ProviderFile } from '../../../provider/base.js';
import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const LOCKFILE = 'requirements.txt';
const PROJECT = 'pyproject.toml';
// A bare URL, directive or local path cannot establish a distribution name.
const requirement = /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:\[[\w., -]+\])?\s*(?=$|[<>=!~;@(])/;

interface Pyproject {
  project?: {
    license?: { file?: string; text?: string } | string;
    dependencies?: string[];
    'optional-dependencies'?: Record<string, string[]>;
  };
  'build-system'?: { requires?: string[] };
}

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

function addRequirements(lines: string[], pl: Payload): void {
  const dependencies: Dependency[] = [];
  for (const raw of lines) {
    if (typeof raw !== 'string') continue;
    const line = raw.trim().replace(/\s+#.*$/, '');
    const match = requirement.exec(line);
    if (!match) continue;
    const specifier = line.slice(match[0].length).split(';', 1)[0].trim();
    const version = /^[~!=<>]+\s*([^,\s)]+)/.exec(specifier)?.[1] || 'latest';
    dependencies.push(['python', match[1], version]);
  }
  pl.addTechs(matchDependencies(dependencies.map(([, name]) => name), 'python'));
  pl.dependencies = dependencies;
}

export function parseRequirementsTxt(content: string, pl: Payload): void {
  addRequirements(content.split(/\r?\n/), pl);
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
  let json: Pyproject;
  try {
    json = toml.parse(content) as unknown as Pyproject;
  } catch (err) {
    l.warn('Failed to parse pyproject.toml', file.fp, err);
    return false;
  }

  if (!json.project && !Array.isArray(json['build-system']?.requires)) {
    return false;
  }

  const prj = json.project ?? {};
  if ('license' in prj) {
    const tmp = typeof prj.license === 'string' ? prj.license : prj.license?.text;
    if (tmp) {
      const lic = detectLicense(tmp);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }
  }

  const groups = [prj.dependencies, json['build-system']?.requires, ...Object.values(prj['optional-dependencies'] ?? {})];
  addRequirements(groups.filter((group): group is string[] => Array.isArray(group)).flat(), pl);
  return true;
}
