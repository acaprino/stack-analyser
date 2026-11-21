import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { analyser } from '../analyser/index.js';
import { flatten } from '../payload/helpers.js';
import { FSProvider } from './fs.js';
import '../autoload.js';

it('keeps filesystem reads inside the selected root and respects ignored relative paths', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'specfy-provider-'));
  try {
    const project = path.join(temp, 'app');
    const sibling = path.join(temp, 'app-old');
    await fs.mkdir(project);
    await fs.mkdir(sibling);
    await fs.mkdir(path.join(project, 'generated'));
    await fs.writeFile(path.join(sibling, 'sample.json'), '{}');
    await fs.writeFile(path.join(project, 'visible.json'), '{}');
    await fs.writeFile(path.join(project, 'generated/data.json'), '{}');
    const provider = new FSProvider({ path: project, ignorePaths: ['generated'] });
    expect(await provider.open(path.join(project, 'visible.json'))).toBe('{}');
    expect((await provider.listDir(project)).map((file) => file.name)).toEqual(['visible.json']);
    expect(await provider.open(path.join(sibling, 'sample.json'))).toBeNull();
    expect(await provider.open(path.join(project, 'generated/data.json'))).toBeNull();
    expect(await provider.stat(path.join(sibling, 'sample.json'))).toBeNull();
    const realpath = fs.realpath.bind(fs);
    const link = path.join(project, 'alias.json');
    const file = path.join(sibling, 'sample.json');
    try {
      await fs.symlink(file, link, 'file');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err;
      // Hosts without symlink privileges can still exercise the same realpath decision.
      vi.spyOn(fs, 'realpath').mockImplementation((target) => target === link ? Promise.resolve(file) : realpath(target));
    }
    expect(await provider.open(link)).toBeNull();
    expect(await provider.stat(link)).toBeNull();
    expect(await new FSProvider({ path: project, maxFileBytes: 1 }).open(path.join(project, 'visible.json'))).toBeNull();
    expect(await new FSProvider({ path: project, maxFileBytes: 2 }).open(path.join(project, 'visible.json'))).toBe('{}');
  } finally {
    vi.restoreAllMocks();
    await fs.rm(temp, { recursive: true, force: true });
  }
});

it.each(['generated', '/generated', './generated', 'generated/', '/generated/'])('ignores a folder written as %s', async (rule) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'specfy-provider-'));
  try {
    await fs.mkdir(path.join(temp, 'generated'));
    await fs.mkdir(path.join(temp, 'generated-docs'));
    await fs.writeFile(path.join(temp, 'generated/data.json'), '{}');
    const provider = new FSProvider({ path: temp, ignorePaths: [rule] });
    // Only that folder: a folder whose name merely starts the same way is still read.
    expect((await provider.listDir(temp)).map((file) => file.name)).toEqual(['generated-docs']);
    expect(await provider.open(path.join(temp, 'generated/data.json'))).toBeNull();
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

it('lets the caller replace the list of skipped folders, and keeps the default list without it', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'specfy-provider-'));
  try {
    await fs.mkdir(path.join(temp, 'tests'));
    await fs.writeFile(path.join(temp, 'tests/package.json'), JSON.stringify({ name: 't', dependencies: { vitest: '1' } }));
    const found = async (skipDirs?: string[]) =>
      flatten(await analyser({ provider: new FSProvider({ path: temp, skipDirs }) }), { merge: true }).techs.has('vitest');
    expect(new FSProvider({ path: temp }).skipDirs).toBeUndefined();
    expect(new FSProvider({ path: temp, skipDirs: [] }).skipDirs).toEqual([]);
    expect(await found()).toBe(false);
    expect(await found([])).toBe(true);
    expect(await found(['tests'])).toBe(false);
    // `ignorePaths` still applies to a folder that `skipDirs` lets through.
    const ignored = new FSProvider({ path: temp, skipDirs: [], ignorePaths: ['tests'] });
    expect(flatten(await analyser({ provider: ignored }), { merge: true }).techs.has('vitest')).toBe(false);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
