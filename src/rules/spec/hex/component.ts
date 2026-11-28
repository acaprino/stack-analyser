import { Payload } from '../../../payload/index.js';
import { closing, sourceText, tokens } from '../manifestTokens.js';
import { packageComponent, projectPath } from '../packageManifest.js';

import type { ComponentMatcher } from '../../../types/rule.js';
import type { Token } from '../manifestTokens.js';

function dependency(
  items: Token[],
  start: number,
  stop: number,
  packages: Map<string, string>
): void {
  if (
    items[start + 1]?.value !== ':' ||
    items[start + 2]?.kind !== 'word' ||
    items[start + 3]?.value !== ','
  )
    return;
  let name = items[start + 2].value;
  const requirement = items[start + 4];
  let version = requirement?.kind === 'string' ? requirement.value : '';
  for (let i = start + 4; i + 2 < stop; i++) {
    if (items[i].kind !== 'word' || items[i + 1].value !== ':') continue;
    const key = items[i].value;
    if (key === 'path' || key === 'in_umbrella') return;
    if (key === 'hex' && items[i + 2].value === ':' && items[i + 3]?.kind === 'word')
      name = items[i + 3].value;
    if (!version && ['tag', 'ref', 'branch'].includes(key) && items[i + 2].kind === 'string')
      version = items[i + 2].value;
  }
  packages.set(name, version);
}

function readList(items: Token[], start: number, packages: Map<string, string>): number {
  const stop = closing(items, start);
  if (stop < 0) return start;
  for (let i = start + 1; i < stop; i++) {
    if (items[i].value !== '{' || items[i].kind !== 'symbol') continue;
    const end = closing(items, i);
    if (end < 0 || end >= stop) break;
    dependency(items, i, end, packages);
    i = end;
  }
  return stop;
}

function readManifest(content: string): { name: string; packages: Map<string, string> } {
  const items = tokens(content, 'elixir');
  const packages = new Map<string, string>();
  let name = 'virtual';
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind !== 'word') continue;
    if (
      items[i].value === 'app' &&
      items[i + 1]?.value === ':' &&
      items[i + 2]?.value === ':' &&
      items[i + 3]?.kind === 'word'
    )
      name = items[i + 3].value;
    if (items[i].value === 'deps' && items[i + 1]?.value === ':' && items[i + 2]?.value === '[') {
      i = readList(items, i + 2, packages);
    } else if (['defp', 'def'].includes(items[i].value) && items[i + 1]?.value === 'deps') {
      for (let j = i + 2; j < items.length; j++) {
        if (items[j].kind === 'word' && ['end', 'def', 'defp'].includes(items[j].value)) break;
        if (items[j].value === '[' && items[j].kind === 'symbol') j = readList(items, j, packages);
      }
    }
  }
  return { name, packages };
}

function lockedHex(content: string): Map<string, string> {
  const packages = new Map<string, string>();
  const items = tokens(content, 'elixir');
  for (let i = 0; i + 8 < items.length; i++) {
    // Each lock entry's value is {:hex, :published_name, "version", ...}.
    // The lock key can differ when a dependency uses the :hex alias option.
    if (
      items[i].value === '{' &&
      items[i + 1].value === ':' &&
      items[i + 2].value === 'hex' &&
      items[i + 3].value === ',' &&
      items[i + 4].value === ':' &&
      items[i + 5].kind === 'word' &&
      items[i + 6].value === ',' &&
      items[i + 7].kind === 'string'
    ) {
      packages.set(items[i + 5].value, items[i + 7].value);
    }
  }
  return packages;
}

export const detectHexComponent: ComponentMatcher = async (files, provider) => {
  const manifest = files.find((file) => file.type === 'file' && file.name === 'mix.exs');
  const lock = files.find((file) => file.type === 'file' && file.name === 'mix.lock');
  const payloads: Payload[] = [];
  if (manifest || lock) {
    const { name, packages } = readManifest(
      manifest ? (await provider.open(manifest.fp)) || '' : ''
    );
    if (lock) {
      for (const [id, version] of lockedHex((await provider.open(lock.fp)) || '')) {
        if (!manifest || packages.has(id)) packages.set(id, version);
      }
    }
    if (manifest || packages.size > 0) {
      const file = manifest || lock!;
      const pl = packageComponent(name, file.fp, 'hex', packages, file.fp);
      pl.addTech('elixir', {
        reason: ['Mix package: ' + projectPath(provider.basePath, file.fp)],
        evidence: [{ kind: 'file', value: file.name, path: file.fp }],
      });
      payloads.push(pl);
    }
  }
  for (const file of files) {
    if (file.type !== 'file' || !/\.exs?$/.test(file.name) || file === manifest) continue;
    const content = await sourceText(provider, file.fp);
    if (!content?.includes('ExUnit')) continue;
    const items = tokens(content, 'elixir');
    const pl = payloads[0] || new Payload({ name: 'virtual', folderPath: file.fp });
    for (let i = 0; i + 2 < items.length; i++) {
      if (items[i].kind !== 'word' || items[i].value !== 'ExUnit' || items[i - 1]?.value === '.')
        continue;
      if (items[i + 1].value !== '.' || items[i + 2].kind !== 'word') continue;
      if (
        (['start', 'configuration'].includes(items[i + 2].value) && items[i + 3]?.value === '(') ||
        (items[i - 1]?.value === 'use' && items[i + 2].value === 'Case')
      ) {
        pl.path.add(file.fp);
        pl.addTech('exunit', {
          reason: [
            'ExUnit.' +
              items[i + 2].value +
              ' at ' +
              projectPath(provider.basePath, file.fp) +
              ':' +
              items[i].line,
          ],
          evidence: [
            {
              kind: 'source',
              value: 'ExUnit.' + items[i + 2].value,
              path: file.fp,
              line: items[i].line,
            },
          ],
        });
      }
    }
    if (pl.techs.size > 0 && payloads.length === 0) payloads.push(pl);
  }
  return payloads.length > 0 ? payloads : false;
};
