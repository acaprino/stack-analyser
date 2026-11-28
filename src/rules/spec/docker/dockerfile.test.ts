import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

import { tsxImport } from '../../../tests/tsx.js';

it('reads literal FROM repositories through the CLI and skips stages, comments and heredoc bodies', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'specfy-dockerfile-'));
  try {
    await fs.writeFile(
      path.join(cwd, 'Dockerfile'),
      [
        '# FROM rabbitmq:1',
        'ARG BASE',
        'FROM --platform=$BUILDPLATFORM docker.io/library/redis:7 AS cache',
        'FROM CACHE AS reuse',
        'FROM scratch AS empty',
        'FROM ${BASE} AS dynamic',
        'FROM registry.internal:5000/acme/mongo:2@sha256:abc AS private',
        'RUN <<EOF',
        'FROM mysql:8',
        'EOF',
      ].join('\n')
    );
    await fs.writeFile(path.join(cwd, 'Dockerfile.web'), 'FROM nginx:${TAG}\n');
    await fs.writeFile(path.join(cwd, 'Dockerfile.web.dockerignore'), 'FROM traefik:1\n');
    const cli = path.join(import.meta.dirname, '../../../cli.ts');
    await promisify(execFile)(process.execPath, ['--import', tsxImport, cli, '.', '--flat'], {
      cwd,
    });
    const result = JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8'));
    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies).toEqual(
      expect.arrayContaining([
        ['docker', 'redis', '7'],
        ['docker', 'registry.internal:5000/acme/mongo', '2@sha256:abc'],
        ['docker', 'nginx', '${TAG}'],
      ])
    );
    expect(result.techs).toEqual(expect.arrayContaining(['redis', 'nginx', 'docker']));
    for (const tech of ['mongodb', 'mysql', 'rabbitmq', 'traefik'])
      expect(result.techs).not.toContain(tech);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}, 20_000);
