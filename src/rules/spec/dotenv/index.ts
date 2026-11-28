import { parse } from 'dotenv';

import { rulesDotEnv } from '../../../loader.js';
import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';

/**
 * A `.env` file meant to be committed: `.env.example`, `.env.local.example`, `.env.example.local`.
 * One definition for the variables and for the endpoints read from it.
 */
export const envTemplate = /^\.env(?:\.[\w-]+)?\.(?:example|sample|template)(?:\.[\w-]+)?$/;
const clientPrefix =
  /^(?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|VUE_APP_|NUXT_PUBLIC_|GATSBY_|PUBLIC_)/;

export const detectInDotEnv = async (
  files: ProviderFile[],
  provider: BaseProvider
): Promise<false | Payload> => {
  let payload: Payload | undefined;
  for (const file of files) {
    if (file.type !== 'file' || !envTemplate.test(file.name)) {
      continue;
    }

    const content = await sourceText(provider, file.fp);
    if (!content) {
      continue;
    }

    const names = Object.keys(parse(content));
    const variables = names.flatMap((name) => {
      const unprefixed = name.replace(clientPrefix, '');
      return name === unprefixed ? [name] : [name, unprefixed];
    });
    payload ??= new Payload({ name: 'virtual', folderPath: file.fp });
    payload.path.add(file.fp);

    for (const rule of rulesDotEnv) {
      const matched = rule(variables);
      if (matched !== false) {
        payload.addTech(matched[0].tech, {
          reason: [`${matched[0].tech} matched env: ${matched[1]}`],
          evidence: [{ kind: 'env', value: matched[1], path: file.fp }],
        });
      }
    }
  }
  return payload ?? false;
};
