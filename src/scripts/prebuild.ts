import fs from 'node:fs/promises';
import path from 'node:path';

import { registeredRules } from '../register.js';

async function ensureIndexFiles(rulesFolder: string): Promise<void> {
  const folders = await fs.readdir(rulesFolder, { withFileTypes: true });
  for (const folder of folders) {
    if (!folder.isDirectory()) {
      continue;
    }
    if (folder.name === '__snapshots__' || folder.name === 'spec') {
      continue;
    }

    const folderPath = path.join(rulesFolder, folder.name);
    const entries = await fs.readdir(folderPath);
    const files = entries.sort();
    let imports = '';

    for (const file of files) {
      if (file !== 'index.ts' && file.endsWith('.ts')) {
        imports += `import './${file.replace('.ts', '.js')}';\n`;
      }
    }

    const indexPath = path.join(folderPath, 'index.ts');
    await fs.writeFile(indexPath, imports);
  }
}

// Ensure all rules folders have proper index.ts files
await ensureIndexFiles(path.join(import.meta.dirname, '../rules'));
await import('../rules/index.js');

await (async (): Promise<void> => {
  const list: string[] = registeredRules
    .sort((a, b) => (a.tech > b.tech ? 1 : -1))
    .map(({ tech, name, type }) => {
      return `listTech.push({ key: ${JSON.stringify(tech)}, name: ${JSON.stringify(name)}, type: ${JSON.stringify(type)} });`;
    });

  await fs.writeFile(
    './src/common/techs.generated.ts',
    `import type { AllowedKeys, TechItem } from '../types/techs.js';

export const listTech: TechItem[] = [];
${list.join('\n')}

export const listIndexed = {} as Record<AllowedKeys, TechItem>;
for (const v of Object.values(listTech)) {
  listIndexed[v.key] = v;
}
`
  );
})();
