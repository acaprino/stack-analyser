import path from 'node:path';

import { cleanPath } from './common/helpers.js';
import { rulesExtensions, rulesTechs } from './loader.js';

import type { AllowedKeys, ProviderFile } from './index.js';
import type { EvidenceItem } from './types/index.js';

/** What matched a technology in a folder: the reason sentences and the evidence behind them. */
export interface TechMatch {
  reason: string[];
  evidence: EvidenceItem[];
}

/**
 * Same matching as `matchAllFiles`, with the evidence.
 * A file rule gives a `file` evidence on the file (or directory) it found,
 * an extension rule gives an `extension` evidence on `folder`.
 */
export function matchAllFilesWithEvidence(
  files: ProviderFile[],
  basePath: string,
  folder: string
): Map<AllowedKeys, TechMatch> {
  const matched = new Map<AllowedKeys, TechMatch>();

  // Match files
  for (const rule of rulesTechs) {
    const res = rule(files, basePath);
    if (res === false) {
      continue;
    }

    const name = cleanPath([res[1]], basePath)[0];
    matched.set(res[0].tech, {
      reason: [`matched file: ${name}`],
      evidence: [{ kind: 'file', value: name, path: res[2] }],
    });
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

    matched.set(res[0].tech, {
      reason: [`matched extension: ${res[1]}`],
      evidence: [{ kind: 'extension', value: res[1], path: folder }],
    });
  }

  return matched;
}

export function matchAllFiles(files: ProviderFile[], basePath: string): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();
  for (const [tech, match] of matchAllFilesWithEvidence(files, basePath, basePath)) {
    matched.set(tech, match.reason);
  }

  return matched;
}
