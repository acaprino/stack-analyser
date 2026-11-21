import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

import { tsxImport } from './tests/tsx.js';

it('writes a stack for a Maven project using the normal CLI', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    await fs.writeFile(path.join(cwd, 'pom.xml'), `<project><modelVersion>4.0.0</modelVersion>
      <groupId>sample</groupId><artifactId>app</artifactId><version>1</version>
      <dependencies><dependency><groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>`);
    const file = path.join(import.meta.dirname, 'cli.ts');
    const { stdout } = await promisify(execFile)(process.execPath, [
      '--import', tsxImport, file, '.', '--flat',
    ], { cwd, env: { ...process.env, LOG_LEVEL: 'info' } });
    expect(stdout).toContain('Output');
    const output = JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8'));
    expect(output.techs).toContain('spring-boot');
    expect(output.dependencies).toContainEqual(['maven', 'org.springframework.boot:spring-boot-starter-web', '']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}, 20_000);

async function runCli(files: Record<string, string>, args: string[]) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
      await fs.writeFile(path.join(cwd, name), content);
    }
    const file = path.join(import.meta.dirname, 'cli.ts');
    const result = await promisify(execFile)(process.execPath, [
      '--import', tsxImport, file, '.', ...args,
    ], { cwd, env: { ...process.env, LOG_LEVEL: 'info' } }).then(
      (done) => ({ code: 0, out: done.stdout + done.stderr }),
      (err: { code: number; stdout: string; stderr: string }) => ({ code: err.code, out: err.stdout + err.stderr })
    );
    const output = await fs.readFile(path.join(cwd, 'output.json'), 'utf8').then((json) => JSON.parse(json), () => null);
    return { ...result, output };
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

const manifest = JSON.stringify({ name: 'app', dependencies: { react: '18' } });

it('reads declarations from a file and keeps their source', async () => {
  const declarations = JSON.stringify([
    { type: 'python', name: 'requests', version: '>=2', path: 'setup.cfg', line: 4, source: 'python-build' },
  ]);
  const { code, output } = await runCli(
    { 'package.json': manifest, 'declarations.json': declarations }, ['--flat', '--declarations', 'declarations.json']);
  expect(code).toBe(0);
  expect(output.evidence).toContainEqual(
    { tech: 'requests', kind: 'package', value: 'requests', path: '/setup.cfg', line: 4, source: 'python-build' });
}, 20_000);

it.each([
  ['a file that is not an array', '{"type":"npm"}', /must be an array/],
  ['a file that is not JSON', 'type: npm', /Declarations/],
  ['an invalid entry', JSON.stringify([{ type: 'npm', name: 'react', path: 'package.json', source: 'x' }, { type: 'cobol', name: 'a', path: 'b', source: 'x' }]), /declaration 1/],
  ['a path outside the root', JSON.stringify([{ type: 'npm', name: 'react', path: '../package.json', source: 'x' }]), /declaration 0/],
])('exits with 1 and writes nothing for %s', async (_label, content, message) => {
  const { code, out, output } = await runCli(
    { 'package.json': manifest, 'declarations.json': content }, ['--declarations', 'declarations.json']);
  expect(code).toBe(1);
  expect(out).toMatch(message);
  expect(output).toBeNull();
}, 20_000);

it('exits with 1 and writes nothing when the declarations file does not exist', async () => {
  const { code, output } = await runCli({ 'package.json': manifest }, ['--declarations', 'missing.json']);
  expect(code).toBe(1);
  expect(output).toBeNull();
}, 20_000);

const tree = {
  'package.json': manifest,
  'tests/package.json': JSON.stringify({ name: 't', dependencies: { vitest: '1' } }),
  'generated/package.json': JSON.stringify({ name: 'g', dependencies: { express: '4' } }),
};

it.each([
  ['no option keeps the default list', [], ['react', 'express']],
  ['an empty list skips nothing', ['--skip-dirs', ''], ['react', 'express', 'vitest']],
  ['a list replaces the default one, and its entries are trimmed', ['--skip-dirs', ' generated , ,'], ['react', 'vitest']],
  ['a folder listed by name is skipped', ['--skip-dirs', 'tests,generated'], ['react']],
  ['a path to ignore is left out with its content', ['--ignore', 'generated'], ['react']],
  ['paths to ignore are trimmed', ['--ignore', ' generated, '], ['react']],
  ['both options together', ['--skip-dirs', '', '--ignore', 'generated'], ['react', 'vitest']],
])('%s', async (_label, args, expected) => {
  const { code, output } = await runCli(tree, ['--flat', ...args]);
  expect(code).toBe(0);
  const found = new Set<string>(output.techs);
  expect(['react', 'express', 'vitest'].filter((tech) => found.has(tech))).toEqual(expected);
}, 20_000);

const dist = path.join(import.meta.dirname, '..', 'dist');
const fixtures = path.join(import.meta.dirname, '..', 'tests', '__fixtures__');
const hasBuild = existsSync(path.join(dist, 'cli.js')) && existsSync(path.join(dist, 'cli.mjs'));

interface FlatNode {
  id: string;
  inComponent: string | null;
  edges: { target: string; read: boolean; write: boolean }[];
  childs: FlatNode[];
}

/** Blanks the random ids, and every field that points at one, so that two runs of the same analysis can be compared. */
function withoutIds(node: FlatNode): unknown {
  return {
    ...node,
    id: undefined,
    inComponent: undefined,
    edges: node.edges.map((edge) => ({ ...edge, target: undefined })),
    childs: node.childs.map((child) => withoutIds(child)),
  };
}

async function runBuilt(file: string): Promise<FlatNode> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-built-'));
  try {
    await promisify(execFile)(process.execPath, [path.join(dist, file), fixtures, '--flat'], { cwd });
    return JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8')) as FlatNode;
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

// The build is not committed, so a fresh checkout has nothing to compare: the title says why the test is skipped.
it.skipIf(!hasBuild)(
  hasBuild
    ? 'gives the same output from the one-file bundle as from the compiled modules'
    : 'gives the same output from the bundle as from the compiled modules (skipped: dist/cli.js or dist/cli.mjs is missing, run npm run build)',
  async () => {
    const [modules, bundle] = await Promise.all([runBuilt('cli.js'), runBuilt('cli.mjs')]);
    expect(modules.childs.length).toBeGreaterThan(0);
    expect(withoutIds(bundle)).toEqual(withoutIds(modules));
  },
  60_000
);
