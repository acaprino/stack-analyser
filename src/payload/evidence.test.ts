import { expect, it } from 'vitest';
import { flatten } from './helpers.js';
import { Payload } from './index.js';
import { analyser } from '../analyser/index.js';
import { FakeProvider } from '../provider/fake.js';
import '../autoload.js';

it('flatten can be repeated without changing the source graph or double-counting languages', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addLang('JavaScript');
  const child = root.addChild(new Payload({ name: 'api', folderPath: '/api' }));
  child.addLang('JavaScript', 2);
  const local = child.addChild(new Payload({ name: 'client', folderPath: '/api/client' }));
  local.addLang('JavaScript', 3);
  const original = structuredClone(root.toJson());
  const first = flatten(root, { merge: true }).toJson();
  const second = flatten(root, { merge: true }).toJson();
  expect(first.languages).toEqual({ JavaScript: 6 });
  expect(second.languages).toEqual(first.languages);
  expect(root.toJson()).toEqual(original);
});

it('connects repeated service evidence to a real component and keeps technologies with colliding names', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addTech('redis', ['redis client']);
  root.addTech('redis', ['redis build']);
  expect(root.edges).toHaveLength(1);
  expect(root.edges[0].target).toBe(root.childs[0]);
  expect([...root.childs[0].reason]).toEqual(['redis client', 'redis build']);
  root.addChild(new Payload({ name: root.childs[0].name, folderPath: '/pg', tech: 'postgresql' }));
  expect(new Set(flatten(root, { merge: true }).childs.map((c) => c.tech))).toEqual(new Set(['redis', 'postgresql']));
});

it('keeps cloud SDK recognition while assigning hosting only from deployment configuration', async () => {
  const manifest = JSON.stringify({ name: 'api', dependencies: { 'aws-sdk': '2', vercel: '36' } });
  async function application(files: Record<string, string>) {
    const provider = new FakeProvider({ paths: { '/': Object.keys(files).map((f) => f.slice(1)) }, files });
    return (await analyser({ provider })).childs.find((c) => c.name === 'api')!;
  }
  const sdkOnly = await application({ '/package.json': manifest });
  expect([...sdkOnly.techs]).toEqual(expect.arrayContaining(['aws', 'vercel']));
  expect(sdkOnly.inComponent).toBeNull();
  const configured = await application({ '/package.json': manifest, '/vercel.json': '{}' });
  expect(configured.inComponent?.tech).toBe('vercel');
});

it('keeps unowned folder evidence visible when multiple manifests share a directory', async () => {
  const provider = new FakeProvider({
    paths: { '/': ['package.json', 'Cargo.toml', 'adapter.py'] },
    files: {
      '/package.json': '{"name":"ui"}', '/Cargo.toml': '[package]\nname="worker"\nversion="1"',
      '/adapter.py': 'service = "https://api.telegram.org/"',
    },
  });
  const result = await analyser({ provider });
  expect(result.mentions.map((m) => m.path)).toContain('adapter.py');
  expect(result.childs.flatMap((c) => c.mentions)).toEqual([]);
});
