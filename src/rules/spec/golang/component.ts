import path from 'node:path';

import { Payload } from '../../../payload/index.js';

import type { ComponentMatcher } from '../../../types/rule.js';

export const detectGolangComponent: ComponentMatcher = (files) => {
  for (const file of files) {
    if (file.name !== 'main.go' || file.type !== 'file') {
      continue;
    }

    const folderName = path.basename(path.dirname(file.fp));
    const pl = new Payload({
      name: folderName,
      folderPath: file.fp,
      tech: 'golang',
      evidence: [{ kind: 'file', value: file.name, path: file.fp }],
    });

    return pl;
  }

  return false;
};
