import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { FSProvider } from './fs.js';

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
