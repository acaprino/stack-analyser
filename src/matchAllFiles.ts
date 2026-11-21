import path from 'node:path';

import { rulesExtensions, rulesTechs } from './loader.js';
import { cleanPath } from './common/helpers.js';

import type { AllowedKeys, ProviderFile } from './index.js';

export function matchAllFiles(files: ProviderFile[], basePath: string): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();

  // Match files
  for (const rule of rulesTechs) {
    const res = rule(files, basePath);
    if (res === false) {
      continue;
    }

    matched.set(res[0].tech, [`matched file: ${cleanPath([res[1]], basePath)[0]}`]);
  }

  // Match extensions
  const exts = new Set<string>();
  for (const file of files) {
    if (file.type !== 'file' || file.isSymbolicLink) continue;
    const { ext, name } = path.parse(file.name);
    if (!ext) continue;
    exts.add(ext);
    // Keep compound extensions such as '.rs.in' without treating the directory name as evidence.
    const previous = path.extname(name);
    if (previous) exts.add(previous + ext);
  }
  for (const rule of rulesExtensions) {
    const res = rule(exts);
    if (res === false) {
      continue;
    }
    if (matched.has(res[0].tech)) {
      continue;
    }

    matched.set(res[0].tech, [`matched extension: ${res[1]}`]);
  }

  return matched;
}
