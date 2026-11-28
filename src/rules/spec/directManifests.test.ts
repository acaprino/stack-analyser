import { describe, expect, it } from 'vitest';

import { analyser } from '../../analyser/index.js';
import { flatten } from '../../payload/helpers.js';
import { FakeProvider } from '../../provider/fake.js';
import '../../autoload.js';

async function scan(name: string, content: string) {
  const provider = new FakeProvider({ paths: { '/': [name] }, files: { ['/' + name]: content } });
  return flatten(await analyser({ provider }), { merge: true });
}

describe('direct manifest dependencies', () => {
  it('reads single-line and grouped Go requirements and ignores other blocks', async () => {
    const result = await scan(
      'go.mod',
      [
        'module sample.example/project',
        'go 1.22',
        'require github.com/gin-gonic/gin v1.10.0 // web API',
        'require (',
        '    "go.uber.org/zap" v1.0.0',
        '  github.com/go-redis/redis v1.0.0 // indirect',
        ')',
        'exclude (',
        '\tgithub.com/getsentry/sentry-go v1.0.0',
        ')',
        'replace old.example/lib => github.com/getsentry/sentry-go v1.0.0',
      ].join('\n')
    );
    expect(result.dependencies).toEqual([
      ['golang', 'github.com/gin-gonic/gin', 'v1.10.0'],
      ['golang', 'go.uber.org/zap', 'v1.0.0'],
    ]);
    expect(result.techs.has('sentry')).toBe(false);
  });

  it('reads unnamed Composer root requirements and ignores suggestions, replacements and malformed requirements', async () => {
    const result = await scan(
      'composer.json',
      JSON.stringify({
        require: { 'laravel/framework': '^11.0', 'sentry/sentry': false },
        'require-dev': { 'phpunit/phpunit': '^10' },
        suggest: { 'sentry/sentry': 'optional' },
        replace: { 'sentry/sdk': '*' },
        license: ['MIT', 'Apache-2.0'],
      })
    );
    expect(result.dependencies).toEqual([
      ['php', 'laravel/framework', '^11.0'],
      ['php', 'phpunit/phpunit', '^10'],
    ]);
    expect(result.techs.has('phpcomposer')).toBe(true);
    expect(result.techs.has('sentry')).toBe(false);
    expect([...result.licenses].sort()).toEqual(['Apache-2.0', 'MIT']);
  });

  it('isolates an invalid Composer root from the other detectors', async () => {
    expect((await scan('composer.json', 'null')).dependencies).toEqual([]);
  });
});
