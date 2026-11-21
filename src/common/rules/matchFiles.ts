import path from 'node:path';

import { listIndexed } from '../../register.js';
import { portablePath } from '../helpers.js';

import type { Rule } from '../../index.js';
import type { ProviderFile } from '../../provider/base.js';
import type { AllowedKeys } from '../../types/techs.js';

export function matchFiles({
  key,
  files,
  matches,
  matchFullPath,
  basePath,
}: {
  key: AllowedKeys;
  files: ProviderFile[];
  matches: string[];
  matchFullPath?: boolean;
  basePath?: string;
}): [Rule, string] | false {
  for (const file of files) {
    if (file.isSymbolicLink) continue;
    const name = matchFullPath ? portablePath(basePath ? path.relative(basePath, file.fp) : file.fp) : file.name;
    if (matches.includes(file.type === 'dir' ? name + '/' : name)) {
      return [listIndexed[key], matchFullPath ? file.fp : file.name];
    }
  }

  return false;
}

export function matchFilesRegex({
  key,
  files,
  match,
  matchFullPath,
  basePath,
}: {
  key: AllowedKeys;
  files: ProviderFile[];
  match: RegExp;
  matchFullPath?: boolean;
  basePath?: string;
}): [Rule, string] | false {
  for (const file of files) {
    if (file.type !== 'file' || file.isSymbolicLink) continue;
    const name = matchFullPath ? portablePath(basePath ? path.relative(basePath, file.fp) : file.fp) : file.name;
    match.lastIndex = 0;
    if (match.test(name)) {
      return [listIndexed[key], matchFullPath ? file.fp : file.name];
    }
  }

  return false;
}

export function matchExtensions({
  key,
  list,
  extensions,
}: {
  key: AllowedKeys;
  list: string[];
  extensions: Set<string>;
}): [Rule, string] | false {
  for (const ext of list) {
    if (extensions.has(ext)) {
      return [listIndexed[key], ext];
    }
  }

  return false;
}
