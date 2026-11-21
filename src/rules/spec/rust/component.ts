import path from 'node:path';

import { parse as parseToml } from 'smol-toml';

import { l } from '../../../common/log.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';
import { isRecord } from '../packageManifest.js';

import type { BaseProvider } from '../../../provider/base.js';
import type { Analyser } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const FILES = new Set(['Cargo.toml']);

type Dependency = string | { package?: string; git?: string; rev?: string; branch?: string; path?: string; version?: string; workspace?: boolean };

interface Dependencies {
  dependencies?: Record<string, Dependency>;
  'dev-dependencies'?: Record<string, Dependency>;
  'build-dependencies'?: Record<string, Dependency>;
}
interface RustCargo extends Dependencies {
  package?: {
    name: string;
    workspace?: string;
    license?: unknown;
  };
  target?: Record<string, Dependencies>;
  workspace?: Dependencies;
}

async function inheritedDependencies(member: RustCargo, folder: string, provider: BaseProvider): Promise<Record<string, unknown>> {
  if (member.workspace) return member.workspace.dependencies ?? {};
  const root = path.resolve(provider.basePath);
  const explicit = typeof member.package?.workspace === 'string' ? path.resolve(folder, member.package.workspace) : undefined;
  let dir = folder;
  while (path.resolve(dir) !== root && path.dirname(dir) !== dir) {
    dir = path.dirname(dir);
    const relative = path.relative(root, path.resolve(dir));
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) break;
    if (explicit && explicit !== path.resolve(dir)) continue;
    const manifest = (await provider.listDir(dir)).find((item) => item.type === 'file' && !item.isSymbolicLink && item.name === 'Cargo.toml');
    if (!manifest) continue;
    const content = await provider.open(manifest.fp);
    if (!content) continue;
    try {
      const data = parseToml(content) as unknown as RustCargo;
      if (isRecord(data.workspace)) return isRecord(data.workspace.dependencies) ? data.workspace.dependencies : {};
    } catch {
      // A malformed parent does not identify an inherited package.
      return {};
    }
  }
  return {};
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
      json = parseToml(content) as unknown as RustCargo;
    } catch (err) {
      l.warn('Failed to parse Cargo.toml', file.fp, err);
      continue;
    }

    let pl: Payload;

    if (typeof json.package?.name === 'string') {
      pl = new Payload({
        name: json.package.name,
        folderPath: file.fp,
      });
    } else {
      pl = new Payload({ name: 'virtual', folderPath: file.fp });
    }

    const dependencies: Analyser['dependencies'] = [];
    const external = new Set<string>();
    let inherited: Record<string, unknown> | undefined;
    // Workspace catalogs list available versions. Members declare what they actually use.
    for (const table of [json, ...Object.values(json.target ?? {})]) {
      if (!isRecord(table)) continue;
      for (const group of [table.dependencies, table['dev-dependencies'], table['build-dependencies']]) {
        if (!isRecord(group)) continue;
        for (const [alias, initial] of Object.entries(group)) {
          let value = initial;
          if (isRecord(value) && value.workspace === true) {
            inherited ??= await inheritedDependencies(json, path.dirname(file.fp), provider);
            value = Object.hasOwn(inherited, alias) ? inherited[alias] : undefined;
            if (value === undefined) {
              dependencies.push(['rust', alias, 'workspace']);
              continue;
            }
          }
          if (typeof value !== 'string' && !isRecord(value)) continue;
          const spec = typeof value === 'string' ? { version: value } : value;
          const name = typeof spec.package === 'string' ? spec.package : alias;
          let version = typeof spec.version === 'string' ? spec.version : 'latest';
          if (typeof spec.path === 'string') {
            version = `path:${spec.path}${spec.version ? `:${spec.version}` : ''}`;
          } else {
            external.add(name);
            if (spec.git) version = `git:${spec.git}#${spec.branch || spec.rev || 'latest'}`;
          }
          dependencies.push(['rust', name, version]);
        }
      }
    }
    pl.addDependencyTechs([...external], 'rust', file.fp);
    pl.addTech('cargo', ['matched file: Cargo.toml'], [{ kind: 'file', value: file.name, path: file.fp }]);
    pl.dependencies = dependencies;

    if (typeof json.package?.license === 'string') {
      const lic = detectLicense(json.package.license);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }

    return pl;
  }

  return false;
};
