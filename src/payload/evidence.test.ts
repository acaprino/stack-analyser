import path from 'node:path';

import { expect, test } from 'vitest';

import { flatten } from './helpers.js';
import { Payload } from './index.js';
import { analyser } from '../analyser/index.js';
import { FakeProvider } from '../provider/fake.js';
import '../autoload.js';

test('flatten can be repeated without changing the source graph or double-counting languages', () => {
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

test('connects repeated service evidence to a real component and keeps technologies with colliding names', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addTech('redis', ['redis client']);
  root.addTech('redis', ['redis build']);

  expect(root.edges).toHaveLength(1);
  expect(root.edges[0].target).toBe(root.childs[0]);
  expect([...root.childs[0].reason]).toEqual(['redis client', 'redis build']);

  root.addChild(new Payload({ name: root.childs[0].name, folderPath: '/pg', tech: 'postgresql' }));

  expect(new Set(flatten(root, { merge: true }).childs.map((c) => c.tech))).toEqual(
    new Set(['redis', 'postgresql'])
  );
});

test('keeps cloud SDK recognition while assigning hosting only from deployment configuration', async () => {
  const manifest = JSON.stringify({ name: 'api', dependencies: { 'aws-sdk': '2', vercel: '36' } });
  async function application(files: Record<string, string>) {
    const provider = new FakeProvider({
      paths: { '/': Object.keys(files).map((f) => f.slice(1)) },
      files,
    });
    return (await analyser({ provider })).childs.find((c) => c.name === 'api')!;
  }
  const sdkOnly = await application({ '/package.json': manifest });

  expect([...sdkOnly.techs]).toEqual(expect.arrayContaining(['aws', 'vercel']));
  expect(sdkOnly.inComponent).toBeNull();

  const configured = await application({ '/package.json': manifest, '/vercel.json': '{}' });

  expect(configured.inComponent?.tech).toBe('vercel');
});

test('keeps unowned folder evidence visible when multiple manifests share a directory', async () => {
  const provider = new FakeProvider({
    paths: { '/': ['package.json', 'Cargo.toml', 'adapter.py'] },
    files: {
      '/package.json': '{"name":"ui"}',
      '/Cargo.toml': '[package]\nname="worker"\nversion="1"',
      '/adapter.py': 'service = "https://api.telegram.org/"',
    },
  });
  const result = await analyser({ provider });

  expect(result.mentions.map((m) => m.path)).toContain('adapter.py');
  expect(result.childs.flatMap((c) => c.mentions)).toEqual([]);
});

test('toJson makes evidence paths relative and portable', () => {
  const base = path.resolve('repo'); // a path of the platform: with the Windows separator on Windows
  const root = new Payload({ name: 'main', folderPath: base });
  root.addTech(
    'react',
    ['react matched: /^react$/'],
    [{ kind: 'package', value: 'react', path: path.join(base, 'web', 'package.json') }]
  );
  root.addEvidence('react', [{ kind: 'extension', value: '.tsx', path: base }]);

  expect(root.toJson(base).evidence).toEqual([
    { tech: 'react', kind: 'extension', value: '.tsx', path: '/', source: 'stack-analyser' },
    {
      tech: 'react',
      kind: 'package',
      value: 'react',
      path: '/web/package.json',
      source: 'stack-analyser',
    },
  ]);
});

test('gives the deduced component the evidence of the technology that implied it', () => {
  const root = new Payload({ name: 'api', folderPath: '/api' });
  root.addTech(
    'postgresql',
    ['postgresql matched: /^pg$/'],
    [{ kind: 'package', value: 'pg', path: '/api/package.json' }]
  );

  expect(root.childs[0].tech).toBe('postgresql');
  expect(root.childs[0].evidence).toEqual([
    {
      tech: 'postgresql',
      kind: 'package',
      value: 'pg',
      path: '/api/package.json',
      source: 'stack-analyser',
    },
  ]);
});

test('flatten keeps the union of evidence', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  for (const folder of ['/a', '/b', '/a']) {
    const child = root.addChild(new Payload({ name: folder, folderPath: folder }));
    child.addTech(
      'redis',
      ['redis client'],
      [{ kind: 'package', value: 'redis', path: `${folder}/package.json` }]
    );
  }
  const before = structuredClone(root.toJson());
  const redis = flatten(root, { merge: true }).childs.find((c) => c.tech === 'redis')!;

  expect(redis.evidence.map((e) => e.path).sort()).toEqual(['/a/package.json', '/b/package.json']);
  expect(root.toJson()).toEqual(before);
});

test('does not repeat evidence, keeps a declared source and ignores evidence of a Payload without tech', () => {
  const found = { kind: 'package', value: 'redis', path: '/package.json' } as const;
  const root = new Payload({ name: 'main', folderPath: '/', tech: 'redis', evidence: [found] });
  root.addEvidence('redis', [
    found,
    { ...found, source: 'declared' },
    { kind: 'source', value: 'createClient', path: '/index.ts', line: 3 },
  ]);

  expect(root.evidence).toEqual([
    { tech: 'redis', ...found, source: 'stack-analyser' },
    { tech: 'redis', ...found, source: 'declared' },
    {
      tech: 'redis',
      kind: 'source',
      value: 'createClient',
      path: '/index.ts',
      line: 3,
      source: 'stack-analyser',
    },
  ]);
  expect(new Payload({ name: 'plain', folderPath: '/', evidence: [found] }).evidence).toEqual([]);
});

test('gives the host component of a dotted technology the evidence of the service and merges it on the next one', () => {
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addTech(
    'aws.s3',
    ['aws.s3 matched'],
    [{ kind: 'package', value: '@aws-sdk/client-s3', path: '/package.json' }]
  );
  root.addTech(
    'aws.athena',
    ['aws.athena matched'],
    [{ kind: 'package', value: '@aws-sdk/client-athena', path: '/package.json' }]
  );
  const aws = root.childs.find((c) => c.tech === 'aws')!;

  expect([...aws.reason]).toEqual(['implicit: aws.s3', 'implicit: aws.athena']);
  expect(aws.evidence).toEqual([
    {
      tech: 'aws',
      kind: 'package',
      value: '@aws-sdk/client-s3',
      path: '/package.json',
      source: 'stack-analyser',
    },
    {
      tech: 'aws',
      kind: 'package',
      value: '@aws-sdk/client-athena',
      path: '/package.json',
      source: 'stack-analyser',
    },
  ]);
  expect(root.childs.find((c) => c.tech === 'aws.s3')!.evidence.map((e) => e.tech)).toEqual([
    'aws.s3',
  ]);

  const copy = aws.copy();

  expect(copy.evidence).toEqual(aws.evidence);

  copy.evidence.pop();

  expect(aws.evidence).toHaveLength(2);
});

test('dives into a folder the default list skips when the caller says so', async () => {
  const paths = { '/': ['tests/'], '/tests': ['package.json'] };
  const files = {
    '/tests/package.json': JSON.stringify({ name: 't', dependencies: { vitest: '1' } }),
  };
  const found = async (skipDirs?: string[]) =>
    flatten(await analyser({ provider: new FakeProvider({ paths, files, skipDirs }) }), {
      merge: true,
    }).techs.has('vitest');

  expect(await found()).toBe(false);
  expect(await found([])).toBe(true);
  expect(await found(['tests'])).toBe(false);
});

/** `count` folders, each with one manifest that names the same known packages. */
function manyManifests(manifest: string, content: (index: number) => string, count: number) {
  const paths: Record<string, string[]> = { '/': [] };
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    paths['/'].push(`m${i}/`);
    paths[`/m${i}`] = [manifest];
    files[`/m${i}/${manifest}`] = content(i);
  }
  return new FakeProvider({ paths, files });
}

const knownPythonPackages = [
  'django',
  'flask',
  'fastapi',
  'celery',
  'redis',
  'psycopg2',
  'sqlalchemy',
  'pytest',
  'numpy',
  'pandas',
  'boto3',
  'pymongo',
  'sentry-sdk',
  'elasticsearch',
  'gunicorn',
  'requests',
  'pydantic',
  'openai',
  'stripe',
  'twilio',
];
const knownNpmPackages = [
  'react',
  'express',
  'vue',
  'next',
  'jest',
  'eslint',
  'typescript',
  'webpack',
  'redis',
  'pg',
  'mongoose',
  'prisma',
  'fastify',
  'vitest',
  'tailwindcss',
  'stripe',
  'mysql2',
  'socket.io',
  '@sentry/node',
  'aws-sdk',
];

// The work used to grow with the square of the evidence already found: the first of these took about 16 seconds.
// Now they take 1 to 3 seconds, and up to 7 with the whole suite running, so the bound leaves room for a loaded machine.
const bound = 10_000;

test('analyses 800 Python manifests with 20 known packages each without the time growing with the square', async () => {
  const provider = manyManifests(
    'requirements.txt',
    () => knownPythonPackages.map((name) => `${name}>=1`).join('\n'),
    800
  );
  const start = performance.now();
  const json = (await analyser({ provider })).toJson('/');
  const elapsed = performance.now() - start;

  expect(json.evidence.length).toBeGreaterThanOrEqual(800 * 20);
  expect(elapsed).toBeLessThan(bound);
}, 60_000);

test('flattens 400 npm packages with 20 known dependencies each without the time growing with the square', async () => {
  const provider = manyManifests(
    'package.json',
    (i) =>
      JSON.stringify({
        name: `pkg${i}`,
        dependencies: Object.fromEntries(knownNpmPackages.map((name) => [name, '1'])),
      }),
    400
  );
  const start = performance.now();
  const json = flatten(await analyser({ provider }), { merge: true }).toJson('/');
  const elapsed = performance.now() - start;

  expect(json.evidence.length).toBeGreaterThan(400 * 20);
  expect(elapsed).toBeLessThan(bound);
}, 60_000);

test('keeps what a copy has already seen apart from the original', () => {
  const found = { kind: 'package', value: 'redis', path: '/package.json' } as const;
  const other = { kind: 'package', value: 'ioredis', path: '/package.json' } as const;
  const root = new Payload({ name: 'main', folderPath: '/' });
  root.addEvidence('redis', [found]);
  const copy = root.copy();
  copy.addEvidence('redis', [found, other]);

  expect(copy.evidence.map((e) => e.value)).toEqual(['redis', 'ioredis']);

  root.addEvidence('redis', [other]);

  expect(root.evidence.map((e) => e.value)).toEqual(['redis', 'ioredis']);
});
