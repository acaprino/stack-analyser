import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { findHostMentions } from './index.js';
import { analyser } from '../../../analyser/index.js';
import { loadOne } from '../../../loader.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';

const host = 'api.telegram.org';

function fixture(files: Record<string, string>): FakeProvider {
  return new FakeProvider({
    paths: { '/': Object.keys(files) },
    files: Object.fromEntries(Object.entries(files).map(([k, v]) => [path.join('/', k), v])),
  });
}

describe('service endpoint mentions', () => {
  loadOne({ tech: 'telegram', name: 'Telegram', type: 'communication', hosts: [host] });

  it('should preserve source evidence through analysis and flattening without declaring a service edge', async () => {
    const provider = fixture({
      'transport.py':
        '# endpoint\nurl = f"https://API.TELEGRAM.ORG:443/bot{token}/sendMessage?a=private"\n',
      'config.yml': 'services:\n  api: https://api.telegram.org/path?q=private\n',
      '.env.example': 'ENDPOINT="https://api.telegram.org:443/bot"\n',
      'service.json': '{"endpoint":"https://api.telegram.org"}',
    });
    const result = await analyser({ provider });
    const expected = [
      { tech: 'telegram', host, path: '.env.example', line: 1 },
      { tech: 'telegram', host, path: 'config.yml', line: 2 },
      { tech: 'telegram', host, path: 'service.json', line: 1 },
      { tech: 'telegram', host, path: 'transport.py', line: 2 },
    ];

    expect(result.toJson().mentions).toStrictEqual(expected);
    expect(flatten(result, { merge: true }).toJson().mentions).toStrictEqual(expected);
    expect(result.techs.has('telegram')).toBe(false);
    expect(result.dependencies).toStrictEqual([]);
    expect(result.edges).toStrictEqual([]);
  });

  it('should ignore documentation, package metadata, lookalike URLs, comments and credentials', async () => {
    const provider = fixture({
      'guide.md': 'https://api.telegram.org',
      'package.json': '{"homepage":"https://api.telegram.org"}',
      'client.ts': [
        '// obsolete: "https://api.telegram.org"',
        '/* fetch("https://api.telegram.org") */',
        'const urls = ["https://api.telegram.org.example", "https://bad@api.telegram.org",',
        '  "http://elsewhere.test/?redirect=https://api.telegram.org", "https://api.telegram.org:70000"];',
        'const message = "see https://api.telegram.org";',
      ].join('\n'),
      'doc.py': '"""\nExample: "https://api.telegram.org"\n"""\n# "https://api.telegram.org"',
      'app.yaml': '# url: https://api.telegram.org\n"https://api.telegram.org": none',
      '.env.example': '#URL=https://api.telegram.org\nURL=https://proxy.test/api.telegram.org',
    });

    expect(await findHostMentions(await provider.listDir('/'), provider)).toStrictEqual([]);
  });

  it('should not read excluded paths or oversized files', async () => {
    const url = 'fetch("https://api.telegram.org")';
    const provider = fixture({ 'docs/help.ts': url, 'large.ts': url + ' '.repeat(600_000) });
    const open = vi.spyOn(provider, 'open');
    const files = await provider.listDir('/');

    expect(await findHostMentions(files, provider)).toStrictEqual([]);
    // The excluded path is never opened; the large file is refused by the provider, with the limit it was given.
    expect(open.mock.calls).toStrictEqual([['/large.ts', 500_000]]);
  });

  it('should recognize literal mobile and multi-document configuration endpoints while respecting the source syntax', async () => {
    const provider = fixture({
      'deployment.yaml': '---\nkind: Service\n---\nurl: https://api.telegram.org/v1\n',
      'client.py': 'n = count // 2; url = "https://api.telegram.org"\n',
      'client.swift':
        '// example: "https://api.telegram.org"\nlet base = "https://api.telegram.org"\n',
      'client.dart': 'const base = "https://api.telegram.org";\n',
      'broken.json': 'url: https://api.telegram.org',
    });
    const pinned = await findHostMentions(await provider.listDir('/'), provider);

    expect(pinned.map(({ path: file, line }) => [file, line])).toStrictEqual([
      ['client.dart', 1],
      ['client.py', 1],
      ['client.swift', 2],
      ['deployment.yaml', 4],
    ]);
  });

  it('should continue after a provider error while reading a source', async () => {
    const provider = fixture({
      'a.ts': '',
      'b.ts': '',
      'c.ts': 'fetch("https://api.telegram.org")',
    });
    vi.spyOn(provider, 'open').mockRejectedValueOnce(new Error('content unavailable'));
    const result = await analyser({ provider });

    expect(result.toJson().mentions).toStrictEqual([
      { tech: 'telegram', host, path: 'c.ts', line: 1 },
    ]);
  });
});
