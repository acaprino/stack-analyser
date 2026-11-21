import { dependencies } from './loader.js';
import { imageReference } from './common/packageIdentity.js';

import type { AllowedKeys, SupportedDeps } from './index.js';

export function matchDependencies(pkgs: string[], type: SupportedDeps): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();
  for (const dep of pkgs) {
    const name = type === 'docker' ? imageReference(dep).name : dep;
    for (const ref of dependencies[type]) {
      // Third-party rules may use a global or sticky expression.
      ref.match.lastIndex = 0;
      if (ref.match.test(name)) {
        if (matched.has(ref.tech)) {
          matched.set(ref.tech, [...matched.get(ref.tech)!, `matched: ${ref.tech}`]);
        } else {
          matched.set(ref.tech, [`${ref.tech} matched: ${ref.match}`]);
        }
      }
    }
  }

  return matched;
}
