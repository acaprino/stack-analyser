import path from 'node:path';

import { loadHcl } from './hcl.js';
import { l } from '../../../common/log.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { listIndexed } from '../../../register.js';
import { isRecord } from '../packageManifest.js';

import type { Dependency } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

/** The version of a provider's blocks, when they are written the way Terraform writes them. */
function providerVersion(blocks: unknown): string {
  const first: unknown = Array.isArray(blocks) ? blocks[0] : undefined;
  return (isRecord(first) && typeof first.version === 'string' && first.version) || 'latest';
}

const LOCKFILE = '.terraform.lock.hcl';
interface TerraformLockfile {
  provider: Record<string, { version?: string }[]>;
}

export const detectTerraformLockfile: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (file.name !== LOCKFILE) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let json: TerraformLockfile;
    // Outside the try: a parser that cannot load must stop the run, not pass for a bad file.
    const { parse } = await loadHcl();
    try {
      json = (await parse(file.fp, content)) as TerraformLockfile;
    } catch (err) {
      l.warn('Failed to parse HCL', file.fp, err);
      continue;
    }

    // HCL that parses is not yet a lockfile: `provider` can be missing or anything else.
    const providers: unknown = isRecord(json) ? json.provider : undefined;
    if (!isRecord(providers)) {
      continue;
    }

    const pl = new Payload({
      name: 'virtual',
      folderPath: path.dirname(file.fp),
    });
    const dependencies: Dependency[] = [];

    // We only register docker service with image and that we know
    for (const name of Object.keys(providers)) {
      const matched = [...matchDependencies([name], 'terraform')];
      dependencies.push(['terraform', name, providerVersion(providers[name])]);

      if (matched.length === 0) {
        continue;
      }

      const tech = matched[0];

      pl.addChild(
        new Payload({
          name: listIndexed[tech[0]].name,
          folderPath: file.fp,
          tech: tech[0],
          parent: pl,
          dependencies: [['terraform', name, providerVersion(providers[name])]],
          reason: tech[1][0],
          evidence: [{ kind: 'terraform', value: name, path: file.fp }],
        })
      );
    }
    pl.dependencies = dependencies;

    return pl;
  }

  return false;
};
