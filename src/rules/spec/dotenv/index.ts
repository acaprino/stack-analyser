import { parse } from 'dotenv';

import { rulesDotEnv } from '../../../loader.js';
import { Payload } from '../../../payload/index.js';
import { sourceText } from '../manifestTokens.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';

const template = /^\.env(?:\.[\w-]+)?\.(?:example|sample|template)$/;
const clientPrefix = /^(?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|VUE_APP_|NUXT_PUBLIC_|GATSBY_|PUBLIC_)/;

export const detectInDotEnv = async (
  files: ProviderFile[],
  provider: BaseProvider
): Promise<false | Payload> => {
  let payload: Payload | undefined;
  for (const file of files) {
    if (file.type !== 'file' || file.isSymbolicLink || !template.test(file.name)) {
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
        payload.addTech(
          matched[0].tech,
          [`${matched[0].tech} matched env: ${matched[1]}`],
          [{ kind: 'env', value: matched[1], path: file.fp }]
        );
      }
    }
  }
  return payload ?? false;
};
