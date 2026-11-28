import { describe, expect, it } from 'vitest';

import { analyser } from '../../../analyser/index.js';
import { rawList } from '../../../loader.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';
import '../../../autoload.js';

const dockerCompose: string[] = [
  `version: '3'
services:`,
];
for (const item of rawList) {
  if (item.type !== 'dependency' || item.ref.type !== 'docker') {
    continue;
  }

  const example = 'example' in item.ref ? item.ref.example : `${item.ref.name}:0.0.0`;
  const [name] = example.split(':');
  dockerCompose.push(`
  ${name}:
    image: ${example}
`);
}

describe('docker', () => {
  it('recognizes modern Compose build services and images inherited from extension anchors', async () => {
    const provider = new FakeProvider({
      paths: { '/': ['compose.yaml', 'docker-compose.override.yml'] },
      files: {
        '/compose.yaml':
          'x-cache: &cache\n  image: redis:7\nservices:\n  cache:\n    <<: *cache\n  api:\n    build: .\n',
        '/docker-compose.override.yml': 'services:\n  example:\n    address: postgres:15\n',
      },
    });
    const result = flatten(await analyser({ provider }), { merge: true });

    expect([...result.techs]).toEqual(expect.arrayContaining(['docker', 'redis']));
    expect(result.techs.has('postgresql')).toBe(false);

    const unrelated = new FakeProvider({
      paths: { '/': ['docker-compose.yml'] },
      files: {
        '/docker-compose.yml': 'services:\n  example:\n    address: postgres:15\n',
      },
    });

    expect(
      flatten(await analyser({ provider: unrelated }), { merge: true }).techs.has('docker')
    ).toBe(false);

    const build = new FakeProvider({
      paths: { '/': ['compose.yml'] },
      files: {
        '/compose.yml': 'services:\n  api:\n    build: .\n',
      },
    });

    expect(flatten(await analyser({ provider: build }), { merge: true }).techs.has('docker')).toBe(
      true
    );
  });

  it('should match everything', async () => {
    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['docker-compose.yml'],
        },
        files: {
          '/docker-compose.yml': dockerCompose.join(''),
        },
      }),
    });

    const merged = flatten(res, { merge: true });

    expect([...merged.techs].sort()).toMatchSnapshot();
    expect([...merged.dependencies].sort()).toMatchSnapshot();
  });

  it.each(['docker-compose.dev.yml', 'docker-compose-prod.yml', 'docker-compose.yaml'])(
    'should match: %s',
    async (filename) => {
      const res = await analyser({
        provider: new FakeProvider({
          paths: {
            '/': [filename],
          },
          files: {
            [`/${filename}`]: dockerCompose.join(''),
          },
        }),
      });

      expect([...flatten(res, { merge: true }).techs].length).toBeGreaterThan(0);
    }
  );

  it('should ignore file', async () => {
    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['docker-compose.yml.example'],
        },
        files: {
          '/docker-compose.yml.example': dockerCompose.join(''),
        },
      }),
    });

    expect([...flatten(res, { merge: true }).techs].sort()).toStrictEqual([]);
  });

  it('should not extract variables', async () => {
    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['docker-compose.yml'],
        },
        files: {
          '/docker-compose.yml': `version: '3'
services:
  boots:
    image: $BOOTS_IMAGE`,
        },
      }),
    });

    expect([...flatten(res, { merge: true }).dependencies].sort()).toStrictEqual([]);
  });

  it('should not match component without image', async () => {
    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['docker-compose.yml'],
        },
        files: {
          '/docker-compose.yml': `version: '3'
services:
  boots:
    build: .`,
        },
      }),
    });

    expect([...flatten(res, { merge: true }).dependencies].sort()).toStrictEqual([]);
  });
});
