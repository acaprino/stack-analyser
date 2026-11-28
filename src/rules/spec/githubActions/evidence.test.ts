import { describe, expect, it } from 'vitest';

import { analyser } from '../../../analyser/index.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';
import '../../../autoload.js';

function scan(files: Record<string, string>) {
  const paths: Record<string, string[]> = { '/': [] };
  for (const pathname of Object.keys(files)) {
    const parts = pathname.slice(1).split('/');
    let dir = '/';
    for (const [i, name] of parts.entries()) {
      const entry = i === parts.length - 1 ? name : name + '/';
      if (!paths[dir].includes(entry)) paths[dir].push(entry);
      dir = (dir === '/' ? dir : dir + '/') + name;
      paths[dir] ??= [];
    }
  }
  return analyser({ provider: new FakeProvider({ paths, files }) }).then((pl) =>
    flatten(pl, { merge: true })
  );
}

describe('github workflow evidence', () => {
  it('should keep each active workflow, reusable workflow and Docker image intact', async () => {
    const result = await scan({
      '/.github/workflows/build.yml':
        'on: push\njobs:\n  build:\n    container: {image: "docker.io/library/redis:7"}\n    services:\n      db: {image: "registry.example:5000/acme/postgres:4@sha256:abc"}\n',
      '/.github/workflows/deploy.yaml':
        'on: push\njobs:\n  shared:\n    uses: org/shared/.github/workflows/build.yml@v2\n  steps:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: docker://nginx:1.27\n    - uses: actions/setup-node@v4\n',
    });

    expect([...result.techs]).toStrictEqual(
      expect.arrayContaining(['github.actions', 'redis', 'nginx', 'nodejs'])
    );
    expect(result.techs.has('postgresql')).toBe(false);
    expect(result.dependencies).toStrictEqual(
      expect.arrayContaining([
        ['docker', 'redis', '7'],
        ['docker', 'registry.example:5000/acme/postgres', '4@sha256:abc'],
        ['githubAction', 'org/shared/.github/workflows/build.yml', 'v2'],
        ['docker', 'nginx', '1.27'],
        ['githubAction', 'actions/setup-node', 'v4'],
      ])
    );
  });

  it('should not count example workflows, backups, nested directories or unrelated YAML', async () => {
    const workflow = 'on: push\njobs:\n  deploy:\n    container: redis:7\n';
    const result = await scan({
      '/template/.github/workflows/main.yml': workflow,
      '/notgithub/workflows/main.yml': workflow,
      '/.github/workflows/main.yaml.bak': workflow,
      '/.github/workflows/sub/nested.yml': workflow,
      '/.github/workflows/config.yaml': 'jobs: null\n',
    });

    expect(result.dependencies).toStrictEqual([]);
    expect(result.techs.has('github.actions')).toBe(false);
  });

  it('should continue across incomplete jobs, steps and services', async () => {
    const result = await scan({
      '/.github/workflows/main.yaml':
        'on: push\njobs:\n  disabled:\n  good:\n    steps: [null, {uses: 3}, {uses: "actions/setup-node@v4"}]\n    services: {unused: null}\n',
    });

    expect(result.dependencies).toContainEqual(['githubAction', 'actions/setup-node', 'v4']);
  });
});
