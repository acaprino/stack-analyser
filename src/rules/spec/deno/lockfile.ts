import { l } from '../../../common/log.js';
import { Payload } from '../../../payload/index.js';
import { isRecord } from '../packageManifest.js';

import type { Analyser } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const FILES = new Set(['deno.lock']);

interface Lockfile {
  version: string;
  remote?: Record<string, string>;
}

export const detectDenoLockfile: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (!FILES.has(file.name)) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      l.warn('Failed to parse deno.lock', file.fp, err);
      continue;
    }

    // Valid JSON is not yet a lockfile: `null` or a list parses too.
    if (
      !isRecord(parsed) ||
      [undefined, null, ''].includes(parsed.version as null | string | undefined)
    ) {
      continue;
    }
    const json = parsed as unknown as Lockfile;

    const deps = {
      ...json.remote,
    };

    const depsFlatten: Analyser['dependencies'] = Object.entries(deps).map((dep) => {
      return ['deno', dep[0], dep[1]];
    });

    const pl = new Payload({
      name: 'virtual',
      folderPath: file.fp,
      dependencies: depsFlatten,
    });
    pl.addDependencyTechs(Object.keys(deps), { type: 'deno', file: file.fp });

    return pl;
  }

  return false;
};
