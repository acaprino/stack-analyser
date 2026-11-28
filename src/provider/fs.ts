import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { portablePath } from '../common/helpers.js';
import { l } from '../common/log.js';

import type { BaseProvider, ProviderFile } from './base.js';
import type { Stats } from 'node:fs';

export interface FSProviderOptions {
  path: string;
  /** Repository-relative names or regular expressions. Ignoring a directory excludes its descendants. */
  ignorePaths?: (RegExp | string)[];
  /** Largest single file that can be read. Increase for unusually large dependency lockfiles. */
  maxFileBytes?: number;
  /** Folder names that are not entered, at any depth. Replaces the default list; an empty array skips nothing. */
  skipDirs?: string[];
}

export class FSProvider implements BaseProvider {
  readonly opts: FSProviderOptions;
  readonly basePath: string;
  readonly skipDirs?: readonly string[];
  private root?: Promise<string>;
  private readonly maxFileBytes: number;
  /** The string rules, written once the way a path is compared, so that a lookup costs the same however many there are. */
  private readonly ignoredPaths = new Set<string>();
  private readonly ignoredPatterns: RegExp[] = [];

  constructor(opts: FSProviderOptions) {
    this.opts = opts;
    this.basePath = path.resolve(opts.path);
    this.skipDirs = opts.skipDirs && [...opts.skipDirs];
    for (const rule of opts.ignorePaths ?? []) {
      // `/gen`, `./gen`, `gen/` and `gen` all name the same folder, relative to the root.
      if (typeof rule === 'string')
        this.ignoredPaths.add(
          portablePath(rule)
            .replace(/^(?:\.?\/)+/, '')
            .replace(/\/+$/, '')
        );
      else this.ignoredPatterns.push(rule);
    }
    this.maxFileBytes = opts.maxFileBytes ?? 32 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxFileBytes) || this.maxFileBytes <= 0) {
      throw new RangeError('maxFileBytes must be a positive integer');
    }
  }

  async listDir(directory: string): Promise<ProviderFile[]> {
    try {
      const resolved = await this.resolve(directory);
      if (!resolved) return [];
      const entries = await fs.readdir(resolved, { withFileTypes: true });
      const files: ProviderFile[] = [];
      for (const entry of entries) {
        const fp = path.join(directory, entry.name);
        if (!this.allowed(this.basePath, fp)) continue;
        if (entry.isFile() || entry.isDirectory()) {
          files.push({ name: entry.name, type: entry.isFile() ? 'file' : 'dir', fp });
        } else if (entry.isSymbolicLink()) {
          // File aliases inside the repository are valid manifests. Do not recurse into directory aliases.
          const info = await this.stat(fp);
          if (info?.isFile())
            files.push({ name: entry.name, type: 'file', fp, isSymbolicLink: true });
        }
      }
      return files;
    } catch (err) {
      if (path.resolve(directory) === this.basePath) throw err;
      l.warn('Could not list directory', directory);
      return [];
    }
  }

  async stat(target: string): Promise<null | Stats> {
    try {
      const resolved = await this.resolve(target);
      return resolved ? await fs.stat(resolved) : null;
    } catch {
      return null;
    }
  }

  async open(target: string): Promise<null | string> {
    try {
      const resolved = await this.resolve(target);
      if (!resolved) return null;
      // Reject non-regular files before opening. Nonblocking mode also covers changes between stat and open.
      const found = await fs.stat(resolved);
      if (!found.isFile()) return null;
      // Windows has neither flag: Node leaves them undefined there, whatever the types say.
      const nonBlocking = (constants.O_NONBLOCK as number | undefined) ?? 0;
      const noFollow = (constants.O_NOFOLLOW as number | undefined) ?? 0;
      const handle = await fs.open(resolved, constants.O_RDONLY | nonBlocking | noFollow);
      try {
        const info = await handle.stat();
        if (!info.isFile()) return null;
        if (info.size > this.maxFileBytes) {
          l.warn('File exceeds maxFileBytes', target);
          return null;
        }
        // A growing input must not turn a bounded manifest read into an unbounded allocation.
        const bytes = Buffer.allocUnsafe(info.size + 1);
        let offset = 0;
        while (offset < bytes.length) {
          const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
          if (!bytesRead) break;
          offset += bytesRead;
        }
        return offset === info.size ? bytes.toString('utf8', 0, offset) : null;
      } finally {
        await handle.close();
      }
    } catch {
      l.warn('Could not read file', target);
      return null;
    }
  }

  private allowed(base: string, target: string): boolean {
    const relative = path.relative(base, target);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
      return false;
    if (!relative || !(this.ignoredPaths.size > 0 || this.ignoredPatterns.length > 0)) return true;
    let prefix = '';
    for (const part of portablePath(relative).split('/')) {
      prefix = prefix ? `${prefix}/${part}` : part;
      if (this.ignoredPaths.has(prefix)) return false;
      for (const pattern of this.ignoredPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(prefix)) return false;
      }
    }
    return true;
  }

  private async resolve(target: string): Promise<null | string> {
    if (!this.allowed(this.basePath, target)) return null;
    this.root ??= fs.realpath(this.basePath);
    const [base, file] = await Promise.all([this.root, fs.realpath(target)]);
    return this.allowed(base, file) ? file : null;
  }
}
