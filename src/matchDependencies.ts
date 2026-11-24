import { dependencies } from './loader.js';
import { imageReference, imageRepository } from './common/packageIdentity.js';

import type { AllowedKeys, EvidenceKind, SupportedDeps } from './index.js';

type DependencyRule = (typeof dependencies)[SupportedDeps][number];

/**
 * Every rule that matches one of the names, in input order then rule order.
 * `name` is the name as it was given, an image without its tag or digest. The rules are tested against an image
 * reduced to its repository, and against any other name as it is.
 */
function matchRules(pkgs: string[], type: SupportedDeps): { name: string; ref: DependencyRule }[] {
  const hits: { name: string; ref: DependencyRule }[] = [];
  for (const dep of pkgs) {
    const name = type === 'docker' ? imageRepository(dep) : dep;
    const compared = type === 'docker' ? imageReference(dep).name : dep;
    for (const ref of dependencies[type]) {
      // Third-party rules may use a global or sticky expression.
      ref.match.lastIndex = 0;
      if (ref.match.test(compared)) {
        hits.push({ name, ref });
      }
    }
  }

  return hits;
}

type Hits = ReturnType<typeof matchRules>;

function reasonsOf(hits: Hits): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();
  for (const { ref } of hits) {
    if (matched.has(ref.tech)) {
      matched.set(ref.tech, [...matched.get(ref.tech)!, `matched: ${ref.tech}`]);
    } else {
      matched.set(ref.tech, [`${ref.tech} matched: ${ref.match}`]);
    }
  }

  return matched;
}

function namesOf(hits: Hits): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();
  for (const { name, ref } of hits) {
    const names = matched.get(ref.tech);
    if (!names) {
      matched.set(ref.tech, [name]);
    } else if (!names.includes(name)) {
      names.push(name);
    }
  }

  return matched;
}

export function matchDependencies(pkgs: string[], type: SupportedDeps): Map<AllowedKeys, string[]> {
  return reasonsOf(matchRules(pkgs, type));
}

/** For every technology, the names that made it match, in input order and without repeats. */
export function matchedPackages(pkgs: string[], type: SupportedDeps): Map<AllowedKeys, string[]> {
  return namesOf(matchRules(pkgs, type));
}

/**
 * What `matchDependencies` and `matchedPackages` give, from a single pass over the rules:
 * matching is the expensive part, and a caller that needs both should not pay for it twice.
 */
export function matchDependenciesWithNames(
  pkgs: string[],
  type: SupportedDeps
): { reasons: Map<AllowedKeys, string[]>; names: Map<AllowedKeys, string[]> } {
  const hits = matchRules(pkgs, type);
  return { reasons: reasonsOf(hits), names: namesOf(hits) };
}

/** What a name of this ecosystem is evidence of: an image, an action, a Terraform resource or provider, or a package. */
export function evidenceKind(type: SupportedDeps): EvidenceKind {
  if (type === 'docker') return 'image';
  if (type === 'githubAction') return 'action';
  if (type === 'terraform' || type === 'terraform.resource') return 'terraform';
  return 'package';
}
