import { Payload } from '../../../payload/index.js';
import { closing, sourceText, tokens } from '../manifestTokens.js';
import { isRecord, packageComponent, projectPath } from '../packageManifest.js';

import type { Token } from '../manifestTokens.js';
import type { ComponentMatcher } from '../../../types/rule.js';
import type { AllowedKeys } from '../../../types/techs.js';

const SDK_MODULES = new Map<string, AllowedKeys>([
  ['SwiftUI', 'swiftui'], ['UIKit', 'uikit'], ['MapKit', 'mapkit'], ['Flutter', 'flutter'],
  ['FirebaseCore', 'firebase'], ['FirebaseMessaging', 'firebase'],
]);
const IMPORT_KINDS = new Set(['typealias', 'struct', 'class', 'enum', 'protocol', 'let', 'var', 'func', 'operator']);

function repository(location: string): string | undefined {
  try {
    const url = new URL(location.replace(/^git@([^:]+):/, 'ssh://$1/'));
    if (!['https:', 'http:', 'git:', 'ssh:'].includes(url.protocol)) return undefined;
    const repo = url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '');
    return repo.length > 1 ? url.host.toLowerCase() + repo : undefined;
  } catch {
    return undefined;
  }
}

function literalArguments(items: Token[], start: number, end: number): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = start; i + 2 < end; i++) {
    if (items[i].kind === 'symbol' && ['(', '[', '{'].includes(items[i].value)) {
      const stop = closing(items, i);
      if (stop < 0) break;
      i = stop;
      continue;
    }
    if (items[i].kind !== 'word' || items[i + 1].value !== ':' || items[i + 2].kind !== 'string') continue;
    if (i + 3 !== end && items[i + 3].value !== ',') continue; // computed argument
    args.set(items[i].value, items[i + 2].value);
  }
  return args;
}

function requirements(items: Token[], remotes: Map<string, string>): { name: string; packages: Map<string, string> } {
  const packages = new Map<string, string>();
  let name = 'virtual';
  for (let i = 0; i + 2 < items.length; i++) {
    if (items[i].kind !== 'word' || items[i + 1].value !== '(') continue;
    if (items[i].value === 'Package' && items[i + 2]?.value === 'name' &&
        items[i + 3]?.value === ':' && items[i + 4]?.kind === 'string') {
      name = items[i + 4].value;
    } else if (items[i].value === 'package' && items[i - 1]?.value === '.' &&
               (items[i - 2]?.kind !== 'word' || items[i - 2]?.value === 'Dependency')) {
      const end = closing(items, i + 1);
      if (end < 0) continue;
      const args = literalArguments(items, i + 2, end);
      const repo = repository(args.get('url') || '');
      const identity = args.get('id')?.toLowerCase() || repo?.split('/').at(-1)?.toLowerCase();
      if (identity) {
        if (repo) remotes.set(identity, repo);
        const version = args.get('from') || args.get('exact') || args.get('branch') || args.get('revision') || '';
        packages.set(identity, version);
      }
      i = end;
    }
  }
  return { name, packages };
}

function pins(content: string): Map<string, { version: string; repo?: string }> {
  const packages = new Map<string, { version: string; repo?: string }>();
  let document: unknown;
  try { document = JSON.parse(content); } catch { return packages; }
  if (!isRecord(document)) return packages;
  // SwiftPM 1 nests pins under object, SwiftPM 2/3 stores them at the root.
  const list = isRecord(document.object) ? document.object.pins : document.pins;
  if (!Array.isArray(list)) return packages;
  for (const pin of list) {
    if (!isRecord(pin) || !isRecord(pin.state)) continue;
    if (pin.kind !== undefined && pin.kind !== 'remoteSourceControl' && pin.kind !== 'registry') continue;
    const location = pin.location || pin.repositoryURL;
    const repo = typeof location === 'string' ? repository(location) : undefined;
    const id = typeof pin.identity === 'string' ? pin.identity.toLowerCase() : repo?.split('/').at(-1)?.toLowerCase();
    const version = pin.state.version || pin.state.branch || pin.state.revision;
    if (id && typeof version === 'string') packages.set(id, { version, repo });
  }
  return packages;
}

export const detectSwiftComponent: ComponentMatcher = async (files, provider) => {
  const manifest = files.find((file) => file.type === 'file' && file.name === 'Package.swift');
  const resolved = files.find((file) => file.type === 'file' && file.name === 'Package.resolved');
  const payloads: Payload[] = [];
  if (manifest || resolved) {
    const remotes = new Map<string, string>();
    const { name, packages } = requirements(tokens(manifest ? (await provider.open(manifest.fp)) || '' : '', 'swift'), remotes);
    if (resolved) {
      for (const [id, pin] of pins((await provider.open(resolved.fp)) || '')) {
        if (manifest && !packages.has(id)) continue;
        if (pin.repo && remotes.has(id) && remotes.get(id) !== pin.repo) continue;
        packages.set(id, pin.version);
        if (pin.repo) remotes.set(id, pin.repo);
      }
    }
    if (manifest || packages.size) {
      const file = manifest || resolved!;
      const pl = packageComponent(name, file.fp, 'swiftpm', packages, file.fp);
      pl.addDependencyTechs([...remotes.values()], 'swiftpm', file.fp);
      pl.addTech(
        'swift',
        ['Swift package: ' + projectPath(provider.basePath, file.fp)],
        [{ kind: 'file', value: file.name, path: file.fp }]
      );
      payloads.push(pl);
    }
  }
  for (const file of files) {
    if (file.type !== 'file' || !file.name.endsWith('.swift') || file === manifest) continue;
    const content = await sourceText(provider, file.fp);
    if (!content?.includes('import')) continue;
    const items = tokens(content, 'swift');
    const pl = payloads[0] || new Payload({ name: 'virtual', folderPath: file.fp });
    for (let i = 0; i + 1 < items.length; i++) {
      if (items[i].kind !== 'word' || items[i].value !== 'import') continue;
      const module = items[i + (IMPORT_KINDS.has(items[i + 1].value) ? 2 : 1)];
      const id = module?.kind === 'word' ? SDK_MODULES.get(module.value) : undefined;
      if (id) {
        pl.path.add(file.fp);
        pl.addTech(
          id,
          ['Swift import ' + module.value + ' at ' + projectPath(provider.basePath, file.fp) + ':' + module.line],
          [{ kind: 'source', value: module.value, path: file.fp, line: module.line }]
        );
      }
    }
    if (pl.techs.size && !payloads.length) payloads.push(pl);
  }
  return payloads.length ? payloads : false;
};
