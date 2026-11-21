import { l } from '../../../common/log.js';
import { matchDependencies } from '../../../matchDependencies.js';
import { Payload } from '../../../payload/index.js';
import { detectLicense } from '../licenses/index.js';
import { isRecord } from '../packageManifest.js';

import type { Analyser } from '../../../types/index.js';
import type { ComponentMatcher } from '../../../types/rule.js';

const FILES = new Set(['package.json']);

export const detectNodeComponent: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (!FILES.has(file.name)) {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (err) {
      l.warn('Failed to parse package.json', file.fp, err);
      continue;
    }

    if (!isRecord(json)) continue;
    const deps = new Map<string, string>();
    for (const table of [json.peerDependencies, json.devDependencies, json.dependencies, json.optionalDependencies]) {
      if (!isRecord(table)) continue;
      for (const [key, version] of Object.entries(table)) {
        if (typeof version === 'string') deps.set(key, version);
      }
    }
    const name = typeof json.name === 'string' && json.name ? json.name : 'virtual';
    if (name === 'virtual' && !deps.size) continue;
    const declared: Analyser['dependencies'] = [];
    const external = new Set<string>();
    for (const [key, version] of deps) {
      declared.push(['npm', key, version]);
      const spec = version.trim();
      if (/^(?:file:|link:|workspace:|portal:|\.{1,2}[/\\]|[/\\]|[A-Za-z]:[/\\]|~\/)/i.test(spec)) continue;
      if (spec.startsWith('npm:')) {
        const target = /^npm:((?:@[\w.-]+\/)?[\w.-]+)(?:@[^\s]*)?$/.exec(spec)?.[1];
        if (target) external.add(target);
      } else {
        external.add(key);
      }
    }

    const pl = new Payload({
      name,
      folderPath: file.fp,
      dependencies: declared,
    });
    pl.addTechs(matchDependencies([...external], 'npm'));

    if (json.license && typeof json.license === 'string') {
      const lic = detectLicense(json.license);
      if (lic !== false) {
        pl.addLicenses(lic);
      }
    }

    return pl;
  }

  return false;
};
