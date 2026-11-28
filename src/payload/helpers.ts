import { listIndexed } from '../register.js';
import { Payload } from './index.js';

import type { Evidence, EvidenceItem, HostMention } from '../types/index.js';
import type { AllowedKeys, TechType } from '../types/techs.js';

/** Who reads a project by itself, when an evidence item does not name another source. */
export const DEFAULT_EVIDENCE_SOURCE = 'stack-analyser';

const notAComponent = new Set<TechType>([
  'ci',
  'language',
  'runtime',
  'tool',
  'framework',
  'validation',
  'builder',
  'linter',
  'test',
  'orm',
  'package_manager',
  'ui',
  'ui_framework',
  'iac',
]);

/**
 * When receive a tech in a component, we can deduct a new Component that was missing
 * For example we receive:
 *  - "pg" from a package.json
 *  - we deduct there is a Postgresql
 *  - Create an eponymous component
 *
 * Obviously there could be some false positive.
 */
export function findImplicitComponent({
  pl,
  tech,
  reason,
  evidence,
}: {
  pl: Payload;
  tech: AllowedKeys;
  reason: string[];
  evidence?: EvidenceItem[];
}): void {
  const ref = listIndexed[tech];
  if (notAComponent.has(ref.type)) {
    return;
  }

  const comp = new Payload({
    name: ref.name,
    tech: tech,
    folderPath: pl.path,
    parent: pl,
    reason,
    evidence,
  });
  const target = pl.addChild(comp);
  if (ref.type !== 'hosting' && ref.type !== 'cloud') {
    pl.addEdges(target);
  }
}

/**
 * Give an evidence item its technology and its source.
 * It builds a new object, so the caller's item is never shared.
 */
export function toEvidence(tech: AllowedKeys, item: EvidenceItem): Evidence {
  return {
    tech,
    kind: item.kind,
    value: item.value,
    path: item.path,
    ...(item.line !== undefined && { line: item.line }),
    source: item.source ?? DEFAULT_EVIDENCE_SOURCE,
  };
}

/** Two mentions are the same when they agree on technology, host, path and line. */
export function mentionKey({ tech, host, path, line }: HostMention): string {
  return JSON.stringify([tech, host, path, line]);
}

/**
 * Two evidences are the same when they agree on technology, kind, value, path, line and source.
 */
export function evidenceKey(evidence: Evidence): string {
  const { tech, kind, value, path, line, source } = evidence;
  return JSON.stringify([tech, kind, value, path, line ?? null, source]);
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Stable output order: technology, kind, path, line, value (then source, to break any remaining tie).
 * Plain code-unit comparison, so the order does not depend on the locale of the machine.
 * An evidence without a line comes before the ones with a line.
 */
export function compareEvidence(a: Evidence, b: Evidence): number {
  return (
    compareText(a.tech, b.tech) ||
    compareText(a.kind, b.kind) ||
    compareText(a.path, b.path) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    compareText(a.value, b.value) ||
    compareText(a.source, b.source)
  );
}

export function findHosting(pl: Payload, fileMatches: ReadonlyMap<AllowedKeys, unknown>): void {
  const candidates = pl.childs.filter((child) => child.tech && listIndexed[child.tech].deploymentConfig && fileMatches.has(child.tech));
  if (candidates.length === 1) pl.inComponent = candidates[0];
}

/**
 * Some edges can be found in the dependencies, i.e:
 * - in monorepo or in some language you can have many folders and import another folder.
 *
 * We try to find those import, using only the dependencies (not opening the code),
 * it can lead to some false positive with very generic names.
 */
export function findEdgesInDependencies(pl: Payload): void {
  const byName = new Map<string, Payload | null>();
  for (const child of pl.childs) byName.set(child.name, byName.has(child.name) ? null : child);

  for (const child of pl.childs) {
    for (const dep of child.dependencies) {
      const name = dep[1];
      const target = byName.get(name);
      if (target && target !== child && name !== child.tech) child.addEdges(target);
    }
  }
}

function pushChilds(src: Payload, dest: Payload): void {
  for (const pl of src.childs) {
    const cp = pl.copy();
    pushChilds(cp, dest);
    cp.childs = [];
    dest.childs.push(cp);
  }
}

/**
 * flatten takes a nested Payload and brings everything down to a single level.
 * It deduplicates components that are strictly similar, and keep references in path.
 *
 * The root always keeps the fields of `src` itself (techs, evidence, mentions, reasons, paths, languages, ...),
 * such as the technologies of declarations, which analyser() puts on the root.
 * If merge = true, it also merges the fields of every child down to the root (e.g: dependencies).
 * Merging is only useful to get a summary of everything at the root level.
 */
export function flatten(src: Payload, options: { merge?: boolean } = {}): Payload {
  // Generate a flat list of childs
  const merge = options.merge || false;
  const dest = new Payload({ name: 'flatten', folderPath: '/' });
  // The root's mentions first, as they were before the components' ones are merged in.
  dest.mentions = src.mentions.map((mention) => ({ ...mention }));
  pushChilds(src, dest);

  // Only equal technology IDs represent the same known service. Keep each project
  // component independently, even when it happens to share a display name with a service.
  const byTech = new Map<AllowedKeys, Payload>();
  const byId = new Map<string, Payload>([[src.id, dest]]);
  const unique: Payload[] = [];
  for (const child of dest.childs) {
    const canonical = child.tech ? byTech.get(child.tech) : undefined;
    if (canonical) {
      canonical.combine(child);
      for (const edge of child.edges) canonical.addEdges(edge.target);
      byId.set(child.id, canonical);
    } else {
      if (child.tech) byTech.set(child.tech, child);
      unique.push(child);
      byId.set(child.id, child);
    }
  }

  dest.childs = unique;
  dest.edges = src.edges.map((edge) => ({ ...edge }));
  dest.inComponent = src.inComponent;
  for (const child of [dest, ...unique]) {
    if (child.inComponent) child.inComponent = byId.get(child.inComponent.id) ?? null;
    if (child.parent) child.parent = byId.get(child.parent.id) ?? null;
    const edges = child.edges;
    child.edges = [];
    for (const edge of edges) {
      const target = byId.get(edge.target.id);
      if (target && target !== child && !child.edges.some((prior) => prior.target === target)) {
        child.edges.push({ ...edge, target });
      }
    }
  }

  findEdgesInDependencies(dest);
  if (merge) {
    for (const child of unique) dest.combine(child);
  }
  // `dest` stands for `src`, so every field of `src` itself is kept, even without merge.
  dest.combine(src);
  return dest;
}
