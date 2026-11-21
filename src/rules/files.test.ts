/* eslint-disable vitest/no-conditional-expect */
import { describe, expect, it } from 'vitest';

import { analyser } from '../analyser/index.js';
import { FakeProvider } from '../provider/fake.js';
import { matchAllFiles } from '../matchAllFiles.js';
import { registeredRules } from '../register.js';

import '../autoload.js';

describe('all', () => {
  it('recognizes actual filenames, directory markers and repository-root configuration', () => {
    const cases: Array<[string, 'file' | 'dir', string, boolean]> = [
      ['Jenkinsfile', 'file', 'jenkins', true],
      ['Caddyfile', 'file', 'caddy', true],
      ['dev.Caddyfile', 'file', 'caddy', true],
      ['.golangci.yml', 'file', 'golangcilint', true],
      ['bitbucket-pipelines.yml', 'file', 'atlassian.bitbucketpipelines', true],
      ['bitbucket-pipeline.yml', 'file', 'atlassian.bitbucketpipelines', false],
      ['tsconfig.build.test.json', 'file', 'typescript', true],
      ['tsconfigXjson.bak', 'file', 'typescript', false],
      ['loader.mts', 'file', 'typescript', true],
      ['folder.ts', 'dir', 'typescript', false],
      ['cypress.config.js.bak', 'file', 'cypressci', false],
      ['.github/dependabot.yaml', 'file', 'dependabot', true],
      ['notgithub/dependabot.yaml.bak', 'file', 'dependabot', false],
      ['examples/.github/dependabot.yml', 'file', 'dependabot', false],
      ['.storybook', 'dir', 'storybook', true],
      ['.storybook', 'file', 'storybook', false],
      ['_config.yml', 'file', 'github.pages', false],
      ['main.rs.in', 'file', 'rust', true],
    ];
    for (const [relative, type, tech, expected] of cases) {
      const name = relative.split('/').pop()!;
      const found = [...matchAllFiles([{ fp: '/repo/' + relative, name, type }], '/repo').keys()];
      expect(found.includes(tech as typeof found[number]), relative).toBe(expected);
    }
  });

  it('should not list multiple times the same files', () => {
    const files = new Set<string>();
    for (const rule of registeredRules) {
      if (!rule.files) {
        continue;
      }
      if (rule.files instanceof RegExp) {
        const str = rule.files.toString();
        if (files.has(str)) {
          expect(rule.files).toBe(false);

          continue;
        }

        files.add(str);
        continue;
      }

      for (const file of rule.files) {
        if (files.has(file)) {
          expect(file).toBe(false);

          continue;
        }

        files.add(file);
      }
    }
  });

  it('should not match case insensitive', async () => {
    const res = await analyser({
      provider: new FakeProvider({
        paths: {
          '/': ['oPenApi.yaml'],
        },
        files: {
          '/oPenApi.yaml': '',
        },
      }),
    });

    expect(res.toJson('').techs).toStrictEqual([]);
  });
});
