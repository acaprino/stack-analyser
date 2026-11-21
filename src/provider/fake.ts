import path from 'node:path';

import type { BaseProvider, ProviderFile } from './base.js';

function fixturePath(value: string): string {
  return value.replaceAll('\\', '/');
}

export class FakeProvider implements BaseProvider {
  basePath: string;
  readonly skipDirs?: readonly string[];
  private paths;
  private files;

  constructor(opts: { paths: Record<string, string[]>; files: Record<string, string>; skipDirs?: string[] }) {
    this.paths = Object.fromEntries(Object.entries(opts.paths).map(([key, value]) => [fixturePath(key), value]));
    this.files = Object.fromEntries(Object.entries(opts.files).map(([key, value]) => [fixturePath(key), value]));
    this.basePath = '/';
    this.skipDirs = opts.skipDirs && [...opts.skipDirs];
  }

  listDir(pathRelative: string): Promise<ProviderFile[]> {
    pathRelative = fixturePath(pathRelative);
    if (!(pathRelative in this.paths)) {
      return Promise.resolve([]);
    }

    const files = this.paths[pathRelative].sort();
    return Promise.resolve(
      files.map((file) => {
        const isDir = file.endsWith('/');
        return {
          name: isDir ? file.slice(0, Math.max(0, file.length - 1)) : file,
          type: isDir ? 'dir' : 'file',
          fp: path.posix.join(pathRelative, file),
        };
      })
    );
  }

  stat(): Promise<{ size: number }> {
    return Promise.resolve({ size: 1000 });
  }

  open(pathRelative: string): Promise<string> {
    pathRelative = fixturePath(pathRelative);
    if (!(pathRelative in this.files)) {
      throw new Error(`not found "${pathRelative}"`);
    }

    return Promise.resolve(this.files[pathRelative]);
  }
}
