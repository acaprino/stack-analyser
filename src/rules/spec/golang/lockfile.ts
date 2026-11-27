import path from 'node:path';

import { insideProject, packageComponent } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

interface Replacement { module: string; version?: string; target: string }

const unquote = (value: string): string => value.replace(/^"(.*)"$/, '$1');

// Only a require directive declares a dependency; a replace directive can send one to a folder. Other blocks have
// similar-looking entries.
function goMod(source: string): { modules: Map<string, string>; replacements: Replacement[] } {
  const modules = new Map<string, string>();
  const replacements: Replacement[] = [];
  let block: string | undefined;
  for (const raw of source.split(/\r?\n/)) {
    const comment = raw.indexOf('//');
    const line = (comment < 0 ? raw : raw.slice(0, comment)).trim();
    if (!line) continue;
    if (line === ')') { block = undefined; continue; }
    const open = /^([a-z]+)\s*\($/.exec(line);
    if (open) { block = open[1]; continue; }
    const directive = block ?? /^([a-z]+)\s/.exec(line)?.[1];
    const declaration = block ? line : line.slice(directive?.length ?? 0).trim();
    if (directive === 'replace') {
      const fields = /^(\S+)(?:\s+(\S+))?\s*=>\s*(\S+)(?:\s+\S+)?$/.exec(declaration);
      if (fields) replacements.push({ module: unquote(fields[1]), version: fields[2] && unquote(fields[2]), target: unquote(fields[3]) });
      continue;
    }
    if (directive !== 'require' || (comment >= 0 && /^\/\/\s*indirect\b/.test(raw.slice(comment)))) continue;
    const fields = /^(?:"([^"\s]+)"|([^\s"]+))\s+(?:"(v[^"\s]+)"|(v[^\s"]+))$/.exec(declaration);
    if (fields) modules.set(fields[1] ?? fields[2], fields[3] ?? fields[4]);
  }
  return { modules, replacements };
}

export const detectGolangLockfile: ComponentMatcher = async (files, provider) => {
  const file = files.find((item) => item.type === 'file' && !item.isSymbolicLink && item.name === 'go.mod');
  if (!file) return false;
  const content = await provider.open(file.fp);
  if (!content) return false;
  const { modules, replacements } = goMod(content);
  // A replacement by a path (`./` or `../`, Go's own rule) that stays inside the copy is a module of the project, not an
  // external dependency; one that leaves the copy is read as before.
  const local = new Set<string>();
  for (const { module, version, target } of replacements) {
    if (!/^\.\.?[\\/]/.test(target) || !modules.has(module)) continue;
    if (version && modules.get(module) !== version) continue;
    if (!insideProject(provider.basePath, path.dirname(file.fp), target)) continue;
    modules.set(module, target);
    local.add(module);
  }
  return packageComponent('virtual', file.fp, 'golang', modules, file.fp, local);
};
