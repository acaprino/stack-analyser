import { Payload } from '../../payload/index.js';
import { register } from '../../register.js';
import { isRecord } from '../spec/packageManifest.js';

import type { ComponentMatcher } from '../../types/rule.js';

/**
 * No other way to detect Shadcn than checking the components.json file.
 * It's really unfortunate, and we will try no to have to do this for other techs.
 */
const detectShadcn: ComponentMatcher = async (files, provider) => {
  for (const file of files) {
    if (file.name !== 'components.json') {
      continue;
    }

    const content = await provider.open(file.fp);
    if (!content) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }

    // Valid JSON is not yet an object: `null` or a number parses too.
    if (!isRecord(parsed) || parsed.$schema !== 'https://ui.shadcn.com/schema.json') {
      continue;
    }

    const pl = new Payload({ name: 'virtual', folderPath: file.fp });
    pl.addTech('shadcn', {
      reason: ['components.json'],
      evidence: [{ kind: 'file', value: file.name, path: file.fp }],
    });
    return pl;
  }

  return false;
};

register({
  tech: 'shadcn',
  name: 'Shadcn',
  type: 'ui',
  detect: detectShadcn,
  dependencies: [
    { type: 'npm', name: 'shadcn-ui' },
    { type: 'npm', name: '@shadcn/ui' },
    { type: 'npm', name: 'shadcn' },
    { type: 'npm', name: 'shadcn-nuxt' },
    { type: 'npm', name: 'shadcn-svelte' },
    { type: 'npm', name: 'shadcn-vue' },
  ],
});
