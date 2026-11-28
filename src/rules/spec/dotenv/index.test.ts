import { describe, expect, it } from 'vitest';

import { analyser } from '../../../analyser/index.js';
import { rawList } from '../../../loader.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';

import '../../../autoload.js';

describe('dotenv', () => {
  it('should match all dependencies', async () => {
    const env: string[] = [];
    for (const item of rawList) {
      if (item.type !== 'dotenv' || !('dotenv' in item.ref)) {
        continue;
      }

      env.push(
        ...item.ref.dotenv.map((name) => `${name}${name.endsWith('_') ? 'KEY' : ''}=example`)
      );
    }

    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['.env.example'],
        },
        files: {
          '/.env.example': env.join('\n'),
        },
      }),
    });

    const merged = flatten(res, { merge: true });

    expect([...merged.techs].sort()).toMatchSnapshot();
    expect([...merged.dependencies].sort()).toMatchSnapshot();
  });

  it('only reads assigned keys, including public client prefixes and multiple templates', async () => {
    const provider = new FakeProvider({
      paths: { '/': ['.env.example', '.env.production.sample'] },
      files: {
        '/.env.example':
          '# OPENAI_API_KEY=x\nNOTE="STRIPE_TOKEN"\nNOT_REDIS_URL=x\nADD_PORT=3\nAPPLE_IDENTITY=x',
        '/.env.production.sample':
          'export NEXT_PUBLIC_SUPABASE_URL=demo\nROLLBAR_TOKEN=\nVITE_SENTRY_DSN=x',
      },
    });
    const hits = flatten(await analyser({ provider }), { merge: true }).techs;
    expect([...hits]).toEqual(expect.arrayContaining(['supabase', 'rollbar', 'sentry']));
    for (const other of ['openai', 'stripe', 'redis', 'datadog', 'apple'] as const)
      expect(hits.has(other)).toBe(false);
  });

  it('does not read a misspelt Rollbar variable', async () => {
    const provider = new FakeProvider({
      paths: { '/': ['.env.example'] },
      files: { '/.env.example': 'ROOLBAR_TOKEN=x' },
    });
    expect(flatten(await analyser({ provider }), { merge: true }).techs.has('rollbar')).toBe(false);
  });
});
