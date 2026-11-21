import { packageComponent } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';

// Only a require directive declares a dependency. Other blocks have similar-looking entries.
function directModules(source: string): Map<string, string> {
  const modules = new Map<string, string>();
  let block: string | undefined;
  for (const raw of source.split(/\r?\n/)) {
    const comment = raw.indexOf('//');
    const line = (comment < 0 ? raw : raw.slice(0, comment)).trim();
    if (!line) continue;
    if (line === ')') { block = undefined; continue; }
    const open = /^([a-z]+)\s*\($/.exec(line);
    if (open) { block = open[1]; continue; }
    if (block && block !== 'require') continue;
    const declaration = block === 'require' ? line : /^require\s+(.+)$/.exec(line)?.[1];
    if (!declaration || (comment >= 0 && /^\/\/\s*indirect\b/.test(raw.slice(comment)))) continue;
    const fields = /^(?:"([^"\s]+)"|([^\s"]+))\s+(?:"(v[^"\s]+)"|(v[^\s"]+))$/.exec(declaration);
    if (fields) modules.set(fields[1] ?? fields[2], fields[3] ?? fields[4]);
  }
  return modules;
}

export const detectGolangLockfile: ComponentMatcher = async (files, provider) => {
  const file = files.find((item) => item.type === 'file' && !item.isSymbolicLink && item.name === 'go.mod');
  if (!file) return false;
  const content = await provider.open(file.fp);
  if (!content) return false;
  return packageComponent('virtual', file.fp, 'golang', directModules(content));
};
