import path from 'node:path';

import { parseProjectXml, xmlChildren } from '../../../common/xml.js';
import { isRecord, packageComponent, projectPath } from '../packageManifest.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const msbuildNamespaces = ['http://schemas.microsoft.com/developer/msbuild/2003'];

function rows(parent: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(parent)) return [];
  const values = parent[key];
  return (Array.isArray(values) ? values : [values]).filter(isRecord);
}

// Keep declarations for possible build targets. Only a literal guard can exclude an entire branch.
function condition(item: Record<string, unknown>): boolean | undefined {
  const raw = item['@_Condition'];
  if (raw === undefined || raw === '') return true;
  const value = String(raw).trim().toLowerCase();
  if (value === 'false' || value === "'false'") return false;
  if (value === 'true' || value === "'true'") return true;
  return undefined;
}

interface ItemGroup {
  node: Record<string, unknown>;
  unconditional: boolean;
}

function* itemGroups(project: Record<string, unknown>, certain = true): Generator<ItemGroup> {
  for (const [tag, node] of xmlChildren(project)) {
    if (!isRecord(node)) continue;
    if (tag === 'ItemGroup') {
      const guard = condition(node);
      if (guard !== false) yield { node, unconditional: certain && guard === true };
    } else if (tag === 'Choose') {
      let certainBranch = certain;
      for (const [kind, branch] of xmlChildren(node)) {
        if (!isRecord(branch) || (kind !== 'When' && kind !== 'Otherwise')) continue;
        const guard = kind === 'Otherwise' ? true : condition(branch);
        if (guard === false) continue;
        yield* itemGroups(branch, certainBranch && guard === true);
        if (guard === true) break;
        certainBranch = false;
      }
    }
  }
}

// Only a literal, unconditional project property establishes WinUI. A target or a
// conditional branch can conflict with that declaration, but cannot establish it.
function enablesWinUI(project: Record<string, unknown>): boolean {
  const pending = [project];
  let declared = false;
  while (pending.length > 0) {
    const container = pending.pop()!;
    for (const group of rows(container, 'PropertyGroup')) {
      for (const [name, values] of Object.entries(group)) {
        if (name.toLowerCase() !== 'usewinui') continue;
        for (const value of Array.isArray(values) ? values : [values]) {
          const literal = isRecord(value) ? value['#text'] : value;
          if (typeof literal !== 'string' || literal.toLowerCase() !== 'true') return false;
          if (
            container === project &&
            !group['@_Condition'] &&
            !(isRecord(value) && value['@_Condition'])
          )
            declared = true;
        }
      }
    }
    pending.push(...rows(container, 'Target'));
    for (const choice of rows(container, 'Choose')) {
      pending.push(...rows(choice, 'When'), ...rows(choice, 'Otherwise'));
    }
  }
  return declared;
}

function packageVersions(groups: Iterable<ItemGroup>, tag: string): Map<string, string> {
  const result = new Map<string, [string, string]>();
  for (const group of groups) {
    for (const item of rows(group.node, tag)) {
      const guard = condition(item);
      if (guard === false) continue;
      const removed = item['@_Remove'];
      if (typeof removed === 'string' && group.unconditional && guard === true) {
        for (const name of removed.split(';')) result.delete(name.trim().toLowerCase());
      }
      const include = item['@_Include'];
      if (typeof include !== 'string') continue;
      const version =
        item['@_VersionOverride'] ?? item.VersionOverride ?? item['@_Version'] ?? item.Version;
      for (const part of include.split(';')) {
        const id = part.trim();
        if (/^[\w.-]+$/.test(id))
          result.set(id.toLowerCase(), [id, typeof version === 'string' ? version : '']);
      }
    }
  }
  return new Map(result.values());
}

// An MSBuild project SDK is a NuGet package: `<Project Sdk="Name/Version">` (several split by `;`), `<Sdk Name>` and
// `<Import Sdk>`. Its version comes from global.json's `msbuild-sdks` or the attribute; the name is enough to match.
function projectSdks(project: Record<string, unknown>): string[] {
  const names = typeof project['@_Sdk'] === 'string' ? project['@_Sdk'].split(';') : [];
  for (const item of rows(project, 'Sdk'))
    if (typeof item['@_Name'] === 'string') names.push(item['@_Name']);
  for (const item of rows(project, 'Import'))
    if (typeof item['@_Sdk'] === 'string') names.push(item['@_Sdk']);
  return names.map((sdk) => sdk.split('/')[0].trim()).filter((sdk) => /^[\w.-]+$/.test(sdk));
}

function lockedPackages(content: string): Map<string, string> {
  const pinned = new Map<string, string>();
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return pinned;
  }
  if (!isRecord(data) || !isRecord(data.dependencies)) return pinned;
  for (const framework of Object.values(data.dependencies)) {
    if (!isRecord(framework)) continue;
    for (const [id, packageInfo] of Object.entries(framework)) {
      if (
        isRecord(packageInfo) &&
        packageInfo.type === 'Direct' &&
        typeof packageInfo.resolved === 'string'
      ) {
        pinned.set(id, packageInfo.resolved);
      }
    }
  }
  return pinned;
}

// MSBuild uses the nearest Directory.Packages.props. A version in that file is only evidence
// for an actual PackageReference in the consuming project.
async function centralVersions(
  file: ProviderFile,
  files: ProviderFile[],
  provider: BaseProvider
): Promise<Map<string, string>> {
  let dir = path.dirname(file.fp);
  const base = path.resolve(provider.basePath);
  let siblings = files;
  for (;;) {
    const props = siblings.find(
      (item) => item.type === 'file' && item.name === 'Directory.Packages.props'
    );
    if (props) {
      const root = parseProjectXml((await provider.open(props.fp)) || '', {
        namespaces: msbuildNamespaces,
        preserveOrder: true,
      })?.Project;
      if (isRecord(root)) {
        const versions = packageVersions(itemGroups(root), 'PackageVersion');
        return new Map([...versions].map(([name, version]) => [name.toLowerCase(), version]));
      }
      break;
    }
    if (path.resolve(dir) === base || path.dirname(dir) === dir) break;
    dir = path.dirname(dir);
    const relative = path.relative(base, path.resolve(dir));
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
      break;
    siblings = await provider.listDir(dir);
  }
  return new Map();
}

export const detectNugetComponent: ComponentMatcher = async (files, provider) => {
  const manifests = files.filter(
    (file) => file.type === 'file' && /\.(cs|fs|vb)proj$/i.test(file.name)
  );
  const namedFile = (name: string): ProviderFile | undefined =>
    files.find((file) => file.type === 'file' && file.name.toLowerCase() === name);
  const legacy = namedFile('packages.config');
  const lock = namedFile('packages.lock.json');
  if (manifests.length === 0 && !legacy && !lock) return false;

  const pinned = lock
    ? lockedPackages((await provider.open(lock.fp)) || '')
    : new Map<string, string>();
  const installed = new Map<string, string>();
  if (legacy) {
    const xml = parseProjectXml((await provider.open(legacy.fp)) || '');
    for (const item of rows(xml?.packages, 'package')) {
      if (typeof item['@_id'] === 'string' && typeof item['@_version'] === 'string') {
        installed.set(item['@_id'], item['@_version']);
      }
    }
  }
  const payloads = [];
  for (const file of manifests) {
    const project = parseProjectXml((await provider.open(file.fp)) || '', {
      namespaces: msbuildNamespaces,
      preserveOrder: true,
    })?.Project;
    if (!isRecord(project)) continue;
    const groups = [...itemGroups(project)];
    const requirements = packageVersions(groups, 'PackageReference');
    if (manifests.length === 1) {
      for (const [id, version] of installed) requirements.set(id, version);
      const byId = new Map([...pinned].map(([id, version]) => [id.toLowerCase(), version]));
      for (const [id, version] of requirements) {
        const resolved = byId.get(id.toLowerCase());
        if (!version && resolved) requirements.set(id, resolved);
      }
    }
    if ([...requirements.values()].includes('')) {
      const versions = await centralVersions(file, files, provider);
      for (const [id, version] of requirements) {
        const supplied = versions.get(id.toLowerCase());
        if (!version && supplied) requirements.set(id, supplied);
      }
    }
    const payload = packageComponent(
      path.parse(file.name).name,
      file.fp,
      'nuget',
      requirements,
      file.fp
    );
    payload.addTech('nuget', {
      reason: [`MSBuild project: ${projectPath(provider.basePath, file.fp)}`],
      evidence: [{ kind: 'file', value: file.name, path: file.fp }],
    });
    if (enablesWinUI(project)) {
      payload.addTech('winui', {
        reason: [`MSBuild UseWinUI=true in ${projectPath(provider.basePath, file.fp)}`],
        evidence: [{ kind: 'file', value: file.name, path: file.fp }],
      });
    }
    const frameworks = packageVersions(groups, 'FrameworkReference');
    if (
      typeof project['@_Sdk'] === 'string' &&
      project['@_Sdk']
        .split(';')
        .some((sdk) => sdk.split('/')[0].trim() === 'Microsoft.NET.Sdk.Web')
    ) {
      frameworks.set('Microsoft.AspNetCore.App', '');
    }
    payload.addDependencyTechs([...frameworks.keys(), ...projectSdks(project)], {
      type: 'nuget',
      file: file.fp,
    });
    payloads.push(payload);
  }
  if (payloads.length > 0) return payloads;
  const source = legacy || lock;
  if (!source || (installed.size === 0 && pinned.size === 0)) return false;
  return packageComponent(
    'virtual',
    source.fp,
    'nuget',
    new Map([...installed, ...pinned]),
    source.fp
  );
};
