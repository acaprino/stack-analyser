import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyser } from '../../analyser/index.js';
import { writeAtomically } from '../../common/write.js';
import { FakeProvider } from '../../provider/fake.js';
import '../../autoload.js';

import type { Payload } from '../../payload/index.js';

/** Analyses a tree given as `path: content`; folders are made from the paths. */
function analyse(files: Record<string, string>): Promise<Payload> {
  const paths: Record<string, string[]> = { '/': [] };
  for (const name of Object.keys(files)) {
    const parts = name.split('/');
    let folder = '/';
    for (const [i, part] of parts.entries()) {
      const entry = i === parts.length - 1 ? part : `${part}/`;
      if (!paths[folder].includes(entry)) paths[folder].push(entry);
      folder = path.posix.join(folder, part);
      if (i < parts.length - 1) paths[folder] ??= [];
    }
  }
  const contents = Object.fromEntries(Object.entries(files).map(([k, v]) => [`/${k}`, v]));
  return analyser({ provider: new FakeProvider({ paths, files: contents }) });
}

describe('files of an untrusted repository', () => {
  it.each(['null', '1', '"x"', '[]'])(
    'should finish when a manifest holds the JSON value %s',
    async (content) => {
      const result = await analyse({ 'deno.lock': content, 'components.json': content });

      expect(result.techs.has('shadcn')).toBe(false);
    }
  );

  it('should finish when Terraform files do not have the expected shape', async () => {
    const result = await analyse({
      '.terraform.lock.hcl': 'provider "a" "b" {}\n',
      'main.tf': 'resource = null\n',
    });

    expect(result.childs).toStrictEqual([]);
  });

  it('should finish when a YAML file nests deeper than the parser can follow', async () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);
    const result = await analyse({
      '.maestro/flow.yaml': deep,
      'config.yml': `url: https://api.telegram.org\nnested: ${deep}\n`,
    });

    expect(result.techs.has('maestro')).toBe(false);
  });

  it('should read a workflow whose action path has many segments without backtracking', async () => {
    const uses = `a/b${'/c'.repeat(60)}`;
    const start = performance.now();
    const result = await analyse({
      '.github/workflows/ci.yml': `on: push\njobs:\n  x:\n    uses: ${uses}\n  y:\n    uses: actions/aws/sub/path@v1\n`,
    });

    expect(performance.now() - start).toBeLessThan(2000);
    // A path without a version is not an action reference; one with a version still is.
    expect(result.dependencies).toContainEqual(['githubAction', 'actions/aws/sub/path', 'v1']);
  });

  it('should expand a Composer path repository with many wildcards without backtracking', async () => {
    const start = performance.now();
    const result = await analyse({
      'composer.json': JSON.stringify({
        name: 'a/b',
        require: { 'local/pkg': '*' },
        repositories: [
          { type: 'path', url: `p/${'*a'.repeat(20)}!` },
          { type: 'path', url: 'packages/*' },
          { type: 'path', url: '*/*/*/*/*' },
        ],
      }),
      [`p/${'a'.repeat(60)}/composer.json`]: '{"name":"x/y"}',
      'packages/pkg/composer.json': '{"name":"local/pkg"}',
    });

    expect(performance.now() - start).toBeLessThan(2000);
    // `packages/*` still finds the local package, which stays a dependency and matches no technology.
    expect(result.childs.flatMap((child) => child.dependencies)).toContainEqual([
      'php',
      'local/pkg',
      '*',
    ]);
  });
});

describe('writing the output', () => {
  it('should replace a link to a file instead of writing through it', async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-write-'));
    try {
      const outside = path.join(temp, 'outside.txt');
      const output = path.join(temp, 'repo', 'output.json');
      await fs.mkdir(path.dirname(output));
      await fs.writeFile(outside, 'keep');
      try {
        await fs.symlink(outside, output, 'file');
      } catch (err) {
        // A host without the privilege to make links cannot show the case.
        if ((err as NodeJS.ErrnoException).code === 'EPERM') return;
        throw err;
      }
      await writeAtomically(output, '{}');

      expect(await fs.readFile(outside, 'utf8')).toBe('keep');
      expect(await fs.readFile(output, 'utf8')).toBe('{}');

      const written = await fs.lstat(output);

      expect(written.isSymbolicLink()).toBe(false);
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  });

  it('should write a new file and replace an existing one', async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-write-'));
    try {
      const output = path.join(temp, 'output.json');
      await writeAtomically(output, 'one');
      await writeAtomically(output, 'two');

      expect(await fs.readFile(output, 'utf8')).toBe('two');
      expect(await fs.readdir(temp)).toStrictEqual(['output.json']);
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  });
});

describe('long inputs', () => {
  it('should read a requirements file with one very long run of spaces in linear time', async () => {
    const start = performance.now();
    const result = await analyse({
      'requirements.txt': `django==5.0 ${' '.repeat(200_000)}x\nflask==3.0   # web\n`,
    });

    expect(performance.now() - start).toBeLessThan(2000);
    expect(result.dependencies).toContainEqual(['python', 'flask', '3.0']);
  });

  it('should read a setup.py that opens a list a hundred thousand times in linear time', async () => {
    const start = performance.now();
    await analyse({ 'setup.py': 'install_requires=[ '.repeat(100_000) });

    expect(performance.now() - start).toBeLessThan(5000);
  });
});
