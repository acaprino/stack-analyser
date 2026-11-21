import path from 'node:path';
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

it('toJson makes evidence paths relative and portable', () => {
  const base = path.resolve('repo'); // un percorso della piattaforma: con il separatore di Windows su Windows
  const root = new Payload({ name: 'main', folderPath: base });
  root.addTech('react', ['react matched: /^react$/'], [{ kind: 'package', value: 'react', path: path.join(base, 'web', 'package.json') }]);
  root.addEvidence('react', [{ kind: 'extension', value: '.tsx', path: base }]);
  expect(root.toJson(base).evidence).toEqual([
    { tech: 'react', kind: 'extension', value: '.tsx', path: '/', source: 'stack-analyser' },
    { tech: 'react', kind: 'package', value: 'react', path: '/web/package.json', source: 'stack-analyser' },
  ]);
});

it('gives the deduced component the evidence of the technology that implied it', () => {
  const root = new Payload({ name: 'api', folderPath: '/api' });
  root.addTech('postgresql', ['postgresql matched: /^pg$/'], [{ kind: 'package', value: 'pg', path: '/api/package.json' }]);
  expect(root.childs[0].tech).toBe('postgresql');
  expect(root.childs[0].evidence).toEqual([{ tech: 'postgresql', kind: 'package', value: 'pg', path: '/api/package.json', source: 'stack-analyser' }]);
});

it('flatten keeps the union of evidence', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  for (const folder of ['/a', '/b', '/a']) {
    const child = root.addChild(new Payload({ name: folder, folderPath: folder }));
    child.addTech('redis', ['redis client'], [{ kind: 'package', value: 'redis', path: `${folder}/package.json` }]);
  }
  const before = structuredClone(root.toJson());
  const redis = flatten(root, { merge: true }).childs.find((c) => c.tech === 'redis')!;
  expect(redis.evidence.map((e) => e.path).sort()).toEqual(['/a/package.json', '/b/package.json']);
  expect(root.toJson()).toEqual(before);
});

it('does not repeat evidence, keeps a declared source and ignores evidence of a Payload without tech', () => {
  const found = { kind: 'package', value: 'redis', path: '/package.json' } as const;
  const root = new Payload({ name: 'main', folderPath: '/', tech: 'redis', evidence: [found] });
  root.addEvidence('redis', [found, { ...found, source: 'declared' }, { kind: 'source', value: 'createClient', path: '/index.ts', line: 3 }]);
  expect(root.evidence).toEqual([
    { tech: 'redis', ...found, source: 'stack-analyser' },
    { tech: 'redis', ...found, source: 'declared' },
    { tech: 'redis', kind: 'source', value: 'createClient', path: '/index.ts', line: 3, source: 'stack-analyser' },
  ]);
  expect(new Payload({ name: 'plain', folderPath: '/', evidence: [found] }).evidence).toEqual([]);
});

it('gives the host component of a dotted technology the evidence of the service and merges it on the next one', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addTech('aws.s3', ['aws.s3 matched'], [{ kind: 'package', value: '@aws-sdk/client-s3', path: '/package.json' }]);
  root.addTech('aws.athena', ['aws.athena matched'], [{ kind: 'package', value: '@aws-sdk/client-athena', path: '/package.json' }]);
  const aws = root.childs.find((c) => c.tech === 'aws')!;
  expect([...aws.reason]).toEqual(['implicit: aws.s3', 'implicit: aws.athena']);
  expect(aws.evidence).toEqual([
    { tech: 'aws', kind: 'package', value: '@aws-sdk/client-s3', path: '/package.json', source: 'stack-analyser' },
    { tech: 'aws', kind: 'package', value: '@aws-sdk/client-athena', path: '/package.json', source: 'stack-analyser' },
  ]);
  expect(root.childs.find((c) => c.tech === 'aws.s3')!.evidence.map((e) => e.tech)).toEqual(['aws.s3']);

  const copy = aws.copy();
  expect(copy.evidence).toEqual(aws.evidence);
  copy.evidence.pop();
  expect(aws.evidence).toHaveLength(2);
});

it('dives into a folder the default list skips when the caller says so', async () => {
  const paths = { '/': ['tests/'], '/tests': ['package.json'] };
  const files = { '/tests/package.json': JSON.stringify({ name: 't', dependencies: { vitest: '1' } }) };
  const found = async (skipDirs?: string[]) =>
    flatten(await analyser({ provider: new FakeProvider({ paths, files, skipDirs }) }), { merge: true }).techs.has('vitest');
  expect(await found()).toBe(false);
  expect(await found([])).toBe(true);
  expect(await found(['tests'])).toBe(false);
});
