import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from 'vitest';

import { catalogue } from './catalogue.js';
import { rules } from './index.js';
import { tsxImport } from './tests/tsx.js';
import './autoload.js';

import type { AnalyserJson } from './types/index.js';

/** What a CLI run printed, its exit code and the output file it wrote, if any. */
interface CliRun {
  code: number;
  out: string;
  err: string;
  output: AnalyserJson | null;
}

test('writes a stack for a Maven project using the normal CLI', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    await fs.writeFile(
      path.join(cwd, 'pom.xml'),
      `<project><modelVersion>4.0.0</modelVersion>
      <groupId>sample</groupId><artifactId>app</artifactId><version>1</version>
      <dependencies><dependency><groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>`
    );
    const file = path.join(import.meta.dirname, 'cli.ts');
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ['--import', tsxImport, file, '.', '--flat'],
      { cwd, env: { ...process.env, LOG_LEVEL: 'info' } }
    );

    expect(stdout).toContain('Output');

    const output = JSON.parse(
      await fs.readFile(path.join(cwd, 'output.json'), 'utf8')
    ) as AnalyserJson;

    expect(output.techs).toContain('spring-boot');
    expect(output.dependencies).toContainEqual([
      'maven',
      'org.springframework.boot:spring-boot-starter-web',
      '',
    ]);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}, 20_000);

async function runCli(files: Record<string, string>, args: string[]): Promise<CliRun> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
      await fs.writeFile(path.join(cwd, name), content);
    }
    const file = path.join(import.meta.dirname, 'cli.ts');
    const result = await promisify(execFile)(
      process.execPath,
      ['--import', tsxImport, file, '.', ...args],
      { cwd, env: { ...process.env, LOG_LEVEL: 'info' } }
    ).then(
      (done) => ({ code: 0, out: done.stdout + done.stderr, err: done.stderr }),
      (err: { code: number; stdout: string; stderr: string }) => ({
        code: err.code,
        out: err.stdout + err.stderr,
        err: err.stderr,
      })
    );
    const output = await fs.readFile(path.join(cwd, 'output.json'), 'utf8').then(
      (json) => JSON.parse(json) as AnalyserJson,
      () => null
    );
    return { ...result, output };
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

/**
 * Runs the CLI from source with the project in `<tmp>/proj`, the working folder in `<tmp>/work` and `<tmp>/out` free for an output.
 * `args` gets the temporary folder, so that a test can write the root and the output the way it needs to.
 */
async function runCliOver(
  args: (tmp: string) => string[],
  outputFile: (tmp: string) => string
): Promise<CliRun> {
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
    const result = await promisify(execFile)(
      process.execPath,
      ['--import', tsxImport, file, ...args(tmp)],
      { cwd: path.join(tmp, 'work'), env: { ...process.env, LOG_LEVEL: 'info' } }
    ).then(
      (done) => ({ code: 0, out: done.stdout + done.stderr, err: done.stderr }),
      (err: { code: number; stdout: string; stderr: string }) => ({
        code: err.code,
        out: err.stdout + err.stderr,
        err: err.stderr,
      })
    );
    const output = await fs.readFile(outputFile(tmp), 'utf8').then(
      (json) => JSON.parse(json) as AnalyserJson,
      () => null
    );
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

test('writes evidence paths relative to the root when the root ends with a separator', async () => {
  const { code, output } = await runCliOver(
    () => ['..' + path.sep + 'proj' + path.sep, '--flat'],
    (tmp) => path.join(tmp, 'work', 'output.json')
  );

  expect(code).toBe(0);
  expect(evidencePaths(output!)).toStrictEqual(evidenceOfProj);
}, 20_000);

test('writes evidence paths relative to the root when an absolute root goes through ..', async () => {
  const { code, output } = await runCliOver(
    (tmp) => [[tmp, 'work', '..', 'proj'].join(path.sep), '--flat'],
    (tmp) => path.join(tmp, 'work', 'output.json')
  );

  expect(code).toBe(0);
  expect(evidencePaths(output!)).toStrictEqual(evidenceOfProj);
}, 20_000);

test('writes the output where an absolute --output says', async () => {
  const { code, output } = await runCliOver(
    (tmp) => ['..' + path.sep + 'proj', '--flat', '--output', path.join(tmp, 'out', 'result.json')],
    (tmp) => path.join(tmp, 'out', 'result.json')
  );

  expect(code).toBe(0);
  expect(evidencePaths(output!)).toStrictEqual(evidenceOfProj);
}, 20_000);

const manifest = JSON.stringify({ name: 'app', dependencies: { react: '18' } });

test('reads declarations from a file and keep their source', async () => {
  const declarations = JSON.stringify([
    {
      type: 'python',
      name: 'requests',
      version: '>=2',
      path: 'setup.cfg',
      line: 4,
      source: 'python-build',
    },
  ]);
  const { code, output } = await runCli(
    { 'package.json': manifest, 'declarations.json': declarations },
    ['--flat', '--declarations', 'declarations.json']
  );

  expect(code).toBe(0);
  expect(output!.evidence).toContainEqual({
    tech: 'requests',
    kind: 'package',
    value: 'requests',
    path: '/setup.cfg',
    line: 4,
    source: 'python-build',
  });
}, 20_000);

test.each([
  ['a file that is not an array', '{"type":"npm"}', /must be an array/],
  ['a file that is not JSON', 'type: npm', /Declarations/],
  [
    'an invalid entry',
    JSON.stringify([
      { type: 'npm', name: 'react', path: 'package.json', source: 'x' },
      { type: 'cobol', name: 'a', path: 'b', source: 'x' },
    ]),
    /declaration 1/,
  ],
  [
    'a path outside the root',
    JSON.stringify([{ type: 'npm', name: 'react', path: '../package.json', source: 'x' }]),
    /declaration 0/,
  ],
])(
  'exits with 1 and writes nothing for %s',
  async (...[, content, message]) => {
    const { code, out, output } = await runCli(
      { 'package.json': manifest, 'declarations.json': content },
      ['--declarations', 'declarations.json']
    );

    expect(code).toBe(1);
    expect(out).toMatch(message);
    expect(output).toBeNull();
  },
  20_000
);

test('exits with 1 and writes nothing when the declarations file does not exist', async () => {
  const { code, output } = await runCli({ 'package.json': manifest }, [
    '--declarations',
    'missing.json',
  ]);

  expect(code).toBe(1);
  expect(output).toBeNull();
}, 20_000);

test('exits with 1 and writes nothing when --declarations is given an empty value', async () => {
  const { code, out, output } = await runCli({ 'package.json': manifest }, ['--declarations', '']);

  expect(code).toBe(1);
  expect(out).toMatch(/Declarations/);
  expect(output).toBeNull();
}, 20_000);

test('reads a declarations file that starts with a UTF-8 byte order mark', async () => {
  const declarations =
    '\uFEFF' +
    JSON.stringify([
      { type: 'python', name: 'requests', path: 'setup.cfg', source: 'python-build' },
    ]);
  const { code, output } = await runCli(
    { 'package.json': manifest, 'declarations.json': declarations },
    ['--flat', '--declarations', 'declarations.json']
  );

  expect(code).toBe(0);
  expect(output!.evidence).toContainEqual({
    tech: 'requests',
    kind: 'package',
    value: 'requests',
    path: '/setup.cfg',
    source: 'python-build',
  });
}, 20_000);

const tree = {
  'package.json': manifest,
  'tests/package.json': JSON.stringify({ name: 't', dependencies: { vitest: '1' } }),
  'generated/package.json': JSON.stringify({ name: 'g', dependencies: { express: '4' } }),
};

test.each([
  ['no option keeps the default list', [], ['react', 'express']],
  ['an empty list skips nothing', ['--skip-dirs', ''], ['react', 'express', 'vitest']],
  [
    'a list replaces the default one, and its entries are trimmed',
    ['--skip-dirs', ' generated , ,'],
    ['react', 'vitest'],
  ],
  ['a folder listed by name is skipped', ['--skip-dirs', 'tests,generated'], ['react']],
  ['a path to ignore is left out with its content', ['--ignore', 'generated'], ['react']],
  ['paths to ignore are trimmed', ['--ignore', ' generated, '], ['react']],
  ['both options together', ['--skip-dirs', '', '--ignore', 'generated'], ['react', 'vitest']],
])(
  '%s',
  async (...[, args, expected]) => {
    const { code, output } = await runCli(tree, ['--flat', ...args]);

    expect(code).toBe(0);

    const found = new Set<string>(output!.techs);

    expect(['react', 'express', 'vitest'].filter((tech) => found.has(tech))).toStrictEqual(
      expected
    );
  },
  20_000
);

test('leaves out a folder to --ignore however its path is written', async () => {
  const folders = { a: 'express', b: 'vue', c: 'fastify', d: 'mongoose' };
  const files = {
    'package.json': manifest,
    ...Object.fromEntries(
      Object.entries(folders).map(([folder, dep]) => [
        `${folder}/package.json`,
        JSON.stringify({ name: folder, dependencies: { [dep]: '1' } }),
      ])
    ),
  };
  const { code, output } = await runCli(files, ['--flat', '--ignore', '/a, ./b, c/, d']);

  expect(code).toBe(0);

  const found = new Set<string>(output!.techs);

  expect(['react', ...Object.values(folders)].filter((tech) => found.has(tech))).toStrictEqual([
    'react',
  ]);
}, 20_000);

test.each([
  ['a path with a slash', 'tests,generated/sub', 'generated/sub'],
  ['a path with a backslash', String.raw`tests,generated\sub`, String.raw`generated\sub`],
])(
  'exits with 1 and writes nothing when --skip-dirs is given %s',
  async (...[, value, entry]) => {
    const { code, out, output } = await runCli(tree, ['--skip-dirs', value]);

    expect(code).toBe(1);
    expect(out).toContain(`"${entry}"`);
    expect(out).toMatch(/--skip-dirs takes folder names, not paths/);
    expect(output).toBeNull();
  },
  20_000
);

test.each([
  ['a drive letter', 'generated, C:/generated', 'C:/generated'],
  ['a drive-relative path', 'generated, C:generated', 'C:generated'],
  ['a parent folder', 'generated,tests/../..', 'tests/../..'],
])(
  'exits with 1 and writes nothing when --ignore is given %s',
  async (...[, value, entry]) => {
    const { code, err, output } = await runCli(tree, ['--ignore', value]);

    expect(code).toBe(1);
    // An error goes to stderr, so that a caller reading stdout does not take it for progress.
    expect(err).toContain(`"${entry}"`);
    expect(err).toMatch(/--ignore takes paths inside the project/);
    expect(output).toBeNull();
  },
  20_000
);

test('exits with 1 and writes nothing when --output is empty', async () => {
  const { code, err, output } = await runCli(tree, ['--output', '']);

  expect(code).toBe(1);
  expect(err).toMatch(/--output needs a file name/);
  expect(output).toBeNull();
}, 20_000);

test('exits with 1 before analysing when the folder of --output does not exist', async () => {
  const { code, out, err } = await runCli(tree, ['--output', path.join('missing', 'out.json')]);

  expect(code).toBe(1);
  expect(err).toMatch(/the folder .*missing does not exist/);
  expect(out).not.toContain('Analysed');
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

test('gives the same output from --perimeter as from --skip-dirs and --ignore', async () => {
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
  expect(techsOfTree(options.output!)).toStrictEqual(['react', 'vitest', 'fastify']);
  expect(withoutIds(file.output!)).toStrictEqual(withoutIds(options.output!));
}, 40_000);

test('keeps what an absent key means, and reads a perimeter that starts with a byte order mark', async () => {
  const [withoutSkipDirs, withoutIgnore] = await Promise.all([
    // No `skipDirs`: the default list, which holds `tests`.
    runCli({ ...perimeterTree, 'perimeter.json': JSON.stringify({ ignore: ['generated'] }) }, [
      '--flat',
      '--perimeter',
      'perimeter.json',
    ]),
    // No `ignore`: nothing is left out by path. An empty `skipDirs`: no folder is skipped by name.
    runCli({ ...perimeterTree, 'perimeter.json': '\uFEFF' + JSON.stringify({ skipDirs: [] }) }, [
      '--flat',
      '--perimeter',
      'perimeter.json',
    ]),
  ]);

  expect(withoutSkipDirs.code).toBe(0);
  expect(techsOfTree(withoutSkipDirs.output!)).toStrictEqual(['react', 'vue', 'fastify']);
  expect(withoutIgnore.code).toBe(0);
  expect(techsOfTree(withoutIgnore.output!)).toStrictEqual([
    'react',
    'express',
    'vitest',
    'vue',
    'fastify',
  ]);
}, 40_000);

test.each([
  ['--ignore', 'generated'],
  ['--skip-dirs', 'tests'],
])(
  'exits with 1 when --perimeter is given with %s',
  async (option, value) => {
    const { code, out, output } = await runCli(
      { ...tree, 'perimeter.json': JSON.stringify({ ignore: ['generated'] }) },
      ['--perimeter', 'perimeter.json', option, value]
    );

    expect(code).toBe(1);
    expect(out).toMatch(/--perimeter cannot be combined with --skip-dirs or --ignore/);
    expect(output).toBeNull();
  },
  20_000
);

test.each([
  ['a file that is not JSON', 'skipDirs: tests', /Perimeter ".*perimeter\.json":/],
  ['a file that is an array', '["tests"]', /must be an object/],
  ['a key that is not known', '{"skipdirs": ["tests"]}', /unknown key "skipdirs"/],
  [
    'a list that holds a number',
    '{"skipDirs": ["tests", 1]}',
    /"skipDirs" must be an array of strings/,
  ],
  ['an ignore that is a string', '{"ignore": "generated"}', /"ignore" must be an array of strings/],
  [
    'a skipDirs entry that is a path',
    '{"skipDirs": ["tests", "generated/sub"]}',
    /"skipDirs" takes folder names, not paths: "generated\/sub"/,
  ],
  [
    'an ignore entry with a drive letter',
    '{"ignore": ["generated", "C:/generated"]}',
    /"ignore" takes paths inside the project, relative to its root: "C:\/generated"/,
  ],
  [
    'an ignore entry with a parent folder',
    '{"ignore": ["tests/../.."]}',
    /"ignore" takes paths inside the project.*"tests\/\.\.\/\.\."/,
  ],
  ['no file at all', undefined, /Perimeter ".*perimeter\.json":.*ENOENT/],
])(
  'exits with 1 and writes nothing when the perimeter file is not the expected JSON: %s',
  async (...[, content, message]) => {
    const files = content === undefined ? tree : { ...tree, 'perimeter.json': content };
    const { code, out, output } = await runCli(files, ['--perimeter', 'perimeter.json']);

    expect(code).toBe(1);
    // The message names the file, then what is wrong with it.
    expect(out).toMatch(/Perimeter ".*perimeter\.json":/);
    expect(out).toMatch(message);
    expect(output).toBeNull();
  },
  20_000
);

/** Every file below `dir`, as paths relative to it written with `/`, sorted. */
async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory())
      found.push(...(await listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
    else found.push(prefix + entry.name);
  }
  return found.sort();
}

/**
 * Runs the CLI from source in a folder holding `files`, with `args` and no project argument unless `args` holds one.
 * `written` is the file, relative to the folder, whose bytes to read once it has run; `files` is what the folder holds after.
 */
async function runCatalogueCli(
  args: string[],
  { inputs, written }: { inputs: Record<string, string>; written?: string }
): Promise<{ code: number; out: string; bytes: Buffer | null; files: string[] }> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    for (const [name, content] of Object.entries(inputs)) {
      await fs.mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
      await fs.writeFile(path.join(cwd, name), content);
    }
    const result = await promisify(execFile)(
      process.execPath,
      ['--import', tsxImport, path.join(import.meta.dirname, 'cli.ts'), ...args],
      { cwd, env: { ...process.env, LOG_LEVEL: 'info' } }
    ).then(
      (done) => ({ code: 0, out: done.stdout + done.stderr }),
      (err: { code: number; stdout: string; stderr: string }) => ({
        code: err.code,
        out: err.stdout + err.stderr,
      })
    );
    const bytes =
      written === undefined ? null : await fs.readFile(path.join(cwd, written)).catch(() => null);
    return { ...result, bytes, files: await listFiles(cwd) };
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

test('writes the catalogue of the rules without a project, and leaves nothing else behind', async () => {
  // A project in the folder it runs in, which must not be read, and a folder that already holds a file.
  const { code, out, bytes, files } = await runCatalogueCli(['--catalogue', 'out/rules.json'], {
    inputs: { 'package.json': manifest, 'out/keep.txt': 'keep' },
    written: 'out/rules.json',
  });

  expect(code).toBe(0);
  expect(out).toContain('rules.json');
  // Nothing was analysed (no output.json) and the temporary file, which was in the same folder, was renamed.
  expect(files).toStrictEqual(['out/keep.txt', 'out/rules.json', 'package.json']);
  expect(bytes).not.toBeNull();
  // UTF-8 without a byte order mark: the first byte is the bracket of the array.
  expect(bytes![0]).toBe('['.codePointAt(0));

  const text = bytes!.toString('utf8');

  expect(text).toBe(JSON.stringify(catalogue(rules.list), undefined, 2));

  const entries = JSON.parse(text) as { tech: string }[];

  expect(entries).toHaveLength(rules.list.length);
  expect(entries.find((entry) => entry.tech === 'spring-mvc')).toMatchObject({
    dependencies: expect.arrayContaining([
      { type: 'maven', name: 'org.springframework.boot:spring-boot-starter-web' },
    ]),
  });
}, 20_000);

test('exits with 1 and writes nothing when --catalogue is given with a project or with another option', async () => {
  const inputs = { 'package.json': manifest };
  const [all, project, output] = await Promise.all([
    // Every option at once: the message names each of them, and none of the files they point at is read.
    runCatalogueCli(
      [
        '.',
        '--catalogue',
        'rules.json',
        '--output',
        'out.json',
        '--flat',
        '--declarations',
        'd.json',
        '--perimeter',
        'p.json',
        '--skip-dirs',
        'tests',
        '--ignore',
        'gen',
      ],
      { inputs, written: 'rules.json' }
    ),
    runCatalogueCli(['.', '--catalogue', 'rules.json'], { inputs, written: 'rules.json' }),
    // `--output` has a default value, so only an `--output` that was typed is a conflict, even one that says the default.
    runCatalogueCli(['--catalogue', 'rules.json', '--output', 'output.json'], {
      inputs,
      written: 'rules.json',
    }),
  ]);
  for (const result of [all, project, output]) {
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/--catalogue stands alone/);
    expect(result.bytes).toBeNull();
    expect(result.files).toStrictEqual(['package.json']);
  }
  for (const name of [
    'the project',
    '--output',
    '--flat',
    '--declarations',
    '--perimeter',
    '--skip-dirs',
    '--ignore',
  ]) {
    expect(all.out).toContain(name);
  }

  expect(project.out).toContain('the project');
  expect(output.out).toContain('--output');
}, 40_000);

test('exits with 1 and names the file when the catalogue cannot be written, and when nothing is asked; --help names the package', async () => {
  const [missingFolder, aFolder, nothing, help] = await Promise.all([
    runCatalogueCli(['--catalogue', 'no/such/folder/rules.json'], {
      inputs: { 'package.json': manifest },
    }),
    // The target is a folder: the rename fails, and the temporary file is removed.
    runCatalogueCli(['--catalogue', 'out'], { inputs: { 'out/keep.txt': 'keep' } }),
    // Making the project optional leaves it required when there is no `--catalogue`.
    runCatalogueCli([], { inputs: { 'package.json': manifest } }),
    // The program is named after the package, not after the original project.
    runCatalogueCli(['--help'], { inputs: {} }),
  ]);

  expect(missingFolder.code).toBe(1);
  expect(missingFolder.out).toMatch(/Catalogue ".*rules\.json"/);
  expect(missingFolder.files).toStrictEqual(['package.json']);
  expect(aFolder.code).toBe(1);
  expect(aFolder.out).toMatch(/Catalogue ".*out"/);
  expect(aFolder.files).toStrictEqual(['out/keep.txt']);
  expect(nothing.code).toBe(1);
  expect(nothing.out).toMatch(/missing required argument 'path'/);
  expect(nothing.files).toStrictEqual(['package.json']);
  expect(help.code).toBe(0);
  expect(help.out).toContain('Usage: stack-analyser-daodan ');
}, 40_000);

const dist = path.join(import.meta.dirname, '..', 'dist');
const fixtures = path.join(import.meta.dirname, '..', 'tests', '__fixtures__');
const hasBuild = existsSync(path.join(dist, 'cli.js')) && existsSync(path.join(dist, 'cli.mjs'));

interface FlatNode {
  id: string;
  inComponent: null | string;
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
    await promisify(execFile)(process.execPath, [path.join(dist, file), fixtures, '--flat'], {
      cwd,
    });
    return JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8')) as FlatNode;
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

// The build is not committed, so a fresh checkout has nothing to compare: the title says when the test is skipped.
test.skipIf(!hasBuild)(
  'gives the same output from the one-file bundle as from the compiled modules (skipped until npm run build)',
  async () => {
    const [modules, bundle] = await Promise.all([runBuilt('cli.js'), runBuilt('cli.mjs')]);

    expect(modules.childs.length).toBeGreaterThan(0);
    expect(withoutIds(bundle)).toStrictEqual(withoutIds(modules));
  },
  60_000
);

async function catalogueBuilt(file: string): Promise<Buffer> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-built-'));
  try {
    await promisify(execFile)(
      process.execPath,
      [path.join(dist, file), '--catalogue', 'rules.json'],
      { cwd }
    );
    return await fs.readFile(path.join(cwd, 'rules.json'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

test.skipIf(!hasBuild)(
  'gives the same catalogue from the bundle as from the modules (skipped until npm run build)',
  async () => {
    const [modules, bundle] = await Promise.all([
      catalogueBuilt('cli.js'),
      catalogueBuilt('cli.mjs'),
    ]);

    expect(JSON.parse(modules.toString('utf8'))).toHaveLength(rules.list.length);
    // The same bytes, not only the same entries.
    expect(bundle.equals(modules)).toBe(true);
  },
  60_000
);
