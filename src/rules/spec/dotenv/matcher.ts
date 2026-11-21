import { listIndexed } from '../../../register.js';

import type { Rule } from '../../../types/rule';
import type { AllowedKeys } from '../../../types/techs';

export function matchDotEnv({
  key,
  list,
  variables,
}: {
  key: AllowedKeys;
  list: string[];
  variables: readonly string[];
}): [Rule, string] | false {
  for (const pattern of list) {
    for (const name of variables) {
      if (name === pattern || (pattern.endsWith('_') && name.startsWith(pattern))) {
        return [listIndexed[key], pattern];
      }
    }
  }

  return false;
}
