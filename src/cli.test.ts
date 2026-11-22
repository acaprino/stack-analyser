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

/**
 * Runs the CLI from source with the project in `<tmp>/proj`, the working folder in `<tmp>/work` and `<tmp>/out` free for an output.
 * `args` gets the temporary folder, so that a test can write the root and the output the way it needs to.
 */
async function runCliOver(args: (tmp: string) => string[], outputFile: (tmp: string) => string) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    for (const [name, content] of Object.entries({
      'proj/package.json': JSON.stringify({ name: 'app', dependencies: { react: '18' } }),
      'proj/web/package.json': JSON.stringify({ name: 'web', dependencies: { express: '4' } }),
    })) {
      await fs.mkdir(path.dirname(path.join(tmp, name)), { recursive: true });
      await fs.writeFile(path.join(tmp, name), content);
    }
    await fs.mkdir(path.join(tmp, 'work'));
    await fs.mkdir(path.join(tmp, 'out'));
    const file = path.join(import.meta.dirname, 'cli.ts');
    const result = await promisify(execFile)(process.execPath, [
      '--import', tsxImport, file, ...args(tmp),
    ], { cwd: path.join(tmp, 'work'), env: { ...process.env, LOG_LEVEL: 'info' } }).then(
      (done) => ({ code: 0, out: done.stdout + done.stderr }),
      (err: { code: number; stdout: string; stderr: string }) => ({ code: err.code, out: err.stdout + err.stderr })
    );
    const output = await fs.readFile(outputFile(tmp), 'utf8').then((json) => JSON.parse(json), () => null);
    return { ...result, output };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/** What the evidence of a project holds in `path`, each once. */
function evidencePaths(output: { evidence: { path: string }[] }): string[] {
  return [...new Set(output.evidence.map((item) => item.path))].sort();
}

const evidenceOfProj = ['/package.json', '/web/package.json'];

it('writes evidence paths relative to the root when the root ends with a separator', async () => {
  const { code, output } = await runCliOver(() => ['..' + path.sep + 'proj' + path.sep, '--flat'], (tmp) => path.join(tmp, 'work', 'output.json'));
  expect(code).toBe(0);
  expect(evidencePaths(output)).toEqual(evidenceOfProj);
}, 20_000);

it('writes evidence paths relative to the root when an absolute root goes through ..', async () => {
  const { code, output } = await runCliOver(
    (tmp) => [[tmp, 'work', '..', 'proj'].join(path.sep), '--flat'], (tmp) => path.join(tmp, 'work', 'output.json'));
  expect(code).toBe(0);
  expect(evidencePaths(output)).toEqual(evidenceOfProj);
}, 20_000);

it('writes the output where an absolute --output says', async () => {
  const { code, output } = await runCliOver(
    (tmp) => ['..' + path.sep + 'proj', '--flat', '--output', path.join(tmp, 'out', 'result.json')], (tmp) => path.join(tmp, 'out', 'result.json'));
  expect(code).toBe(0);
  expect(evidencePaths(output)).toEqual(evidenceOfProj);
}, 20_000);

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

it('exits with 1 and writes nothing when --declarations is given an empty value', async () => {
  const { code, out, output } = await runCli({ 'package.json': manifest }, ['--declarations', '']);
  expect(code).toBe(1);
  expect(out).toMatch(/Declarations/);
  expect(output).toBeNull();
}, 20_000);

it('reads a declarations file that starts with a UTF-8 byte order mark', async () => {
  const declarations = '\uFEFF' + JSON.stringify([{ type: 'python', name: 'requests', path: 'setup.cfg', source: 'python-build' }]);
  const { code, output } = await runCli(
    { 'package.json': manifest, 'declarations.json': declarations }, ['--flat', '--declarations', 'declarations.json']);
  expect(code).toBe(0);
  expect(output.evidence).toContainEqual(
    { tech: 'requests', kind: 'package', value: 'requests', path: '/setup.cfg', source: 'python-build' });
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

it('leaves out a folder to --ignore however its path is written', async () => {
  const folders = { a: 'express', b: 'vue', c: 'fastify', d: 'mongoose' };
  const files = {
    'package.json': manifest,
    ...Object.fromEntries(Object.entries(folders).map(([folder, dep]) => [`${folder}/package.json`, JSON.stringify({ name: folder, dependencies: { [dep]: '1' } })])),
  };
  const { code, output } = await runCli(files, ['--flat', '--ignore', '/a, ./b, c/, d']);
  expect(code).toBe(0);
  const found = new Set<string>(output.techs);
  expect(['react', ...Object.values(folders)].filter((tech) => found.has(tech))).toEqual(['react']);
}, 20_000);

it.each([
  ['a path with a slash', 'tests,generated/sub', 'generated/sub'],
  ['a path with a backslash', 'tests,generated\\sub', 'generated\\sub'],
])('exits with 1 and writes nothing when --skip-dirs is given %s', async (_label, value, entry) => {
  const { code, out, output } = await runCli(tree, ['--skip-dirs', value]);
  expect(code).toBe(1);
  expect(out).toContain(`"${entry}"`);
  expect(out).toMatch(/--skip-dirs takes folder names, not paths/);
  expect(output).toBeNull();
}, 20_000);

it.each([
  ['a drive letter', 'generated, C:/generated', 'C:/generated'],
  ['a parent folder', 'generated,tests/../..', 'tests/../..'],
])('exits with 1 and writes nothing when --ignore is given %s', async (_label, value, entry) => {
  const { code, out, output } = await runCli(tree, ['--ignore', value]);
  expect(code).toBe(1);
  expect(out).toContain(`"${entry}"`);
  expect(out).toMatch(/--ignore takes paths inside the project/);
  expect(output).toBeNull();
}, 20_000);

/** The techs of `tree` that an output holds, in the order of `tree`. */
function techsOfTree(output: { techs: string[] }): string[] {
  const found = new Set<string>(output.techs);
  return ['react', 'express', 'vitest', 'vue', 'fastify'].filter((tech) => found.has(tech));
}

const perimeterTree = {
  ...tree,
  'docs/old/package.json': JSON.stringify({ name: 'old', dependencies: { vue: '3' } }),
  'docs/new/package.json': JSON.stringify({ name: 'new', dependencies: { fastify: '4' } }),
};

it('gives the same output from --perimeter as from --skip-dirs and --ignore', async () => {
  // `generated` is skipped by name, so `tests` is entered; `docs/old` is left out by path.
  const perimeter = JSON.stringify({ skipDirs: ['generated'], ignore: ['docs/old'] });
  // Both runs see the same project, the file included: it is a JSON file of the project like another.
  const files = { ...perimeterTree, 'perimeter.json': perimeter };
  const [options, file] = await Promise.all([
    runCli(files, ['--flat', '--skip-dirs', 'generated', '--ignore', 'docs/old']),
    runCli(files, ['--flat', '--perimeter', 'perimeter.json']),
  ]);
  expect(options.code).toBe(0);
  expect(file.code).toBe(0);
  expect(techsOfTree(options.output)).toEqual(['react', 'vitest', 'fastify']);
  expect(withoutIds(file.output)).toEqual(withoutIds(options.output));
}, 40_000);

it('keeps what an absent key means, and reads a perimeter that starts with a byte order mark', async () => {
  const [withoutSkipDirs, withoutIgnore] = await Promise.all([
    // No `skipDirs`: the default list, which holds `tests`.
    runCli({ ...perimeterTree, 'perimeter.json': JSON.stringify({ ignore: ['generated'] }) }, ['--flat', '--perimeter', 'perimeter.json']),
    // No `ignore`: nothing is left out by path. An empty `skipDirs`: no folder is skipped by name.
    runCli({ ...perimeterTree, 'perimeter.json': '\uFEFF' + JSON.stringify({ skipDirs: [] }) }, ['--flat', '--perimeter', 'perimeter.json']),
  ]);
  expect(withoutSkipDirs.code).toBe(0);
  expect(techsOfTree(withoutSkipDirs.output)).toEqual(['react', 'vue', 'fastify']);
  expect(withoutIgnore.code).toBe(0);
  expect(techsOfTree(withoutIgnore.output)).toEqual(['react', 'express', 'vitest', 'vue', 'fastify']);
}, 40_000);

it.each([['--ignore', 'generated'], ['--skip-dirs', 'tests']])(
  'exits with 1 when --perimeter is given with %s', async (option, value) => {
    const { code, out, output } = await runCli(
      { ...tree, 'perimeter.json': JSON.stringify({ ignore: ['generated'] }) }, ['--perimeter', 'perimeter.json', option, value]);
    expect(code).toBe(1);
    expect(out).toMatch(/--perimeter cannot be combined with --skip-dirs or --ignore/);
    expect(output).toBeNull();
  }, 20_000);

it.each([
  ['a file that is not JSON', 'skipDirs: tests', /Perimeter ".*perimeter\.json":/],
  ['a file that is an array', '["tests"]', /must be an object/],
  ['a key that is not known', '{"skipdirs": ["tests"]}', /unknown key "skipdirs"/],
  ['a list that holds a number', '{"skipDirs": ["tests", 1]}', /"skipDirs" must be an array of strings/],
  ['an ignore that is a string', '{"ignore": "generated"}', /"ignore" must be an array of strings/],
  ['a skipDirs entry that is a path', '{"skipDirs": ["tests", "generated/sub"]}', /"skipDirs" takes folder names, not paths: "generated\/sub"/],
  ['an ignore entry with a drive letter', '{"ignore": ["generated", "C:/generated"]}', /"ignore" takes paths inside the project, relative to its root: "C:\/generated"/],
  ['an ignore entry with a parent folder', '{"ignore": ["tests/../.."]}', /"ignore" takes paths inside the project.*"tests\/\.\.\/\.\."/],
  ['no file at all', undefined, /Perimeter ".*perimeter\.json":.*ENOENT/],
])('exits with 1 and writes nothing when the perimeter file is not the expected JSON: %s', async (_label, content, message) => {
  const files = content === undefined ? tree : { ...tree, 'perimeter.json': content };
  const { code, out, output } = await runCli(files, ['--perimeter', 'perimeter.json']);
  expect(code).toBe(1);
  // The message names the file, then what is wrong with it.
  expect(out).toMatch(/Perimeter ".*perimeter\.json":/);
  expect(out).toMatch(message);
  expect(output).toBeNull();
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
