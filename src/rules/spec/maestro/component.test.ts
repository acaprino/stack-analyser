import { describe, expect, it } from 'vitest';

import '../../../autoload.js';
import { analyser } from '../../../analyser/index.js';
import { FakeProvider } from '../../../provider/fake.js';

const flow =
  'tags: [mobile]\nappId: ${MAESTRO_APP_ID}\n---\n- runFlow: ../login.yml\n- tapOn:\n    id: settings\n';

describe('maestro mobile flows', () => {
  it.each([
    ['detox/maestro/flows/account/attach_logs.yml', flow, true],
    ['.maestro/smoke.yaml', 'appId: com.example\n---\n- launchApp\n', true],
    ['deploy/flows/sample.yml', flow, false],
    ['config/maestro/example.yml', flow, false],
    ['.maestro/config.yml', 'appId: com.example\ncommands: [launchApp]\n', false],
    ['.maestro/smoke.yml', 'name: smoke\n---\n- launchApp\n', false],
    ['.maestro/unrelated.yml', 'appId: com.example\n---\n- build: release\n', false],
    ['.maestro/comment.yml', 'appId: sample\n---\n- note: tapOn\n# - launchApp\n', false],
    ['.maestro/broken.yml', 'appId: [\n---\n- launchApp\n', false],
  ] as const)(
    'should read %s as a Maestro flow only when it is one',
    async (...[file, content, found]) => {
      const provider = new FakeProvider({
        paths: { '/': [file] },
        files: { ['/' + file]: content },
      });
      const result = await analyser({ provider });

      expect(result.techs.has('maestro')).toBe(found);
    }
  );
});
