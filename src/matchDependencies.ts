import { imageReference, imageRepository } from './common/packageIdentity.js';
import { dependencies } from './loader.js';

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
    for (const ref of rulesMatching(compared, type)) hits.push({ name, ref });
  }

  return hits;
}

/** The rules each name matched, per ecosystem, for as long as that ecosystem keeps the same number of rules. */
const matchesByType = new Map<
  SupportedDeps,
  { rules: number; byName: Map<string, DependencyRule[]> }
>();

/**
 * The rules of `type` that match `compared`, in rule order. A project names the same packages in many manifests,
 * and every name would otherwise be tested against every rule each time.
 */
function rulesMatching(compared: string, type: SupportedDeps): DependencyRule[] {
  const rules = dependencies[type];
  let known = matchesByType.get(type);
  if (known?.rules !== rules.length) {
    known = { rules: rules.length, byName: new Map() };
    matchesByType.set(type, known);
  }
  let hits = known.byName.get(compared);
  if (!hits) {
    hits = rules.filter((ref) => {
      // Third-party rules may use a global or sticky expression.
      ref.match.lastIndex = 0;
      return ref.match.test(compared);
    });
    known.byName.set(compared, hits);
  }
  return hits;
}

type Hits = ReturnType<typeof matchRules>;

function reasonsOf(hits: Hits): Map<AllowedKeys, string[]> {
  const matched = new Map<AllowedKeys, string[]>();
  for (const { ref } of hits) {
    const prior = matched.get(ref.tech);
    if (prior) {
      matched.set(ref.tech, [...prior, `matched: ${ref.tech}`]);
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
