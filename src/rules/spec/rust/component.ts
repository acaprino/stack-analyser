import toml from '@iarna/toml';

import { l } from '../../../common/log.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';

import type { Analyser } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const FILES = new Set(['Cargo.toml']);

type Dependency = string | { package?: string; git?: string; rev?: string; branch?: string; path?: string; version?: string };

interface Dependencies {
  dependencies?: Record<string, Dependency>;
  'dev-dependencies'?: Record<string, Dependency>;
  'build-dependencies'?: Record<string, Dependency>;
}
interface RustCargo extends Dependencies {
  package?: {
    name: string;
    license?: string;
  };
  target?: Record<string, Dependencies>;
}

export const detectRustComponent: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (!FILES.has(file.name)) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let json: RustCargo;
    try {
      json = toml.parse(content) as unknown as RustCargo;
    } catch (err) {
      l.warn('Failed to parse Cargo.toml', file.fp, err);
      continue;
    }

    let pl: Payload;

    if (json.package) {
      pl = new Payload({
        name: json.package.name,
        folderPath: file.fp,
      });
    } else {
      pl = new Payload({ name: 'virtual', folderPath: file.fp });
    }

    const dependencies: Analyser['dependencies'] = [];
    const external = new Set<string>();
    // Workspace catalogs list available versions. Members declare what they actually use.
    for (const table of [json, ...Object.values(json.target ?? {})]) {
      for (const group of [table.dependencies, table['dev-dependencies'], table['build-dependencies']]) {
        for (const [alias, value] of Object.entries(group ?? {})) {
          const spec = typeof value === 'string' ? { version: value } : value;
          const name = spec.package ?? alias;
          let version = spec.version || 'latest';
          if (spec.path) {
            version = `path:${spec.path}${spec.version ? `:${spec.version}` : ''}`;
          } else {
            external.add(name);
            if (spec.git) version = `git:${spec.git}#${spec.branch || spec.rev || 'latest'}`;
          }
          dependencies.push(['rust', name, version]);
        }
      }
    }
    pl.addTechs(matchDependencies([...external], 'rust'));
    pl.addTech('cargo', ['matched file: Cargo.toml']);
    pl.dependencies = dependencies;

    if (json.package?.license) {
      const lic = detectLicense(json.package.license);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }

    return pl;
  }

  return false;
};
