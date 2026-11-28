import type { Rule, RuleDependency } from './types/rule.js';

/** A regular expression as a caller can rebuild it: `new RegExp(pattern, flags)`. `flags` is there only when there are some. */
export interface CataloguePattern {
  pattern: string;
  flags?: string;
}

export type CatalogueDependency =
  | { type: RuleDependency['type']; name: string }
  | ({ type: RuleDependency['type'] } & CataloguePattern);

/** What the catalogue says of a rule, with the keys in this order. A key a rule has no value for is not there. */
export interface CatalogueEntry {
  tech: string;
  name: string;
  type: string;
  hosts?: string[];
  dependencies?: CatalogueDependency[];
  /** The file names, a pattern for them, or `{ computed: true }` when the rule gives them in a way a file cannot hold. */
  files?: { computed: true } | CataloguePattern | string[];
  dotenv?: string[];
  extensions?: string[];
}

function patternOf(expression: RegExp): CataloguePattern {
  return expression.flags === ''
    ? { pattern: expression.source }
    : { pattern: expression.source, flags: expression.flags };
}

function dependencyOf(dependency: RuleDependency): CatalogueDependency {
  return typeof dependency.name === 'string'
    ? { type: dependency.type, name: dependency.name }
    : { type: dependency.type, ...patternOf(dependency.name) };
}

function filesOf(files: unknown): CatalogueEntry['files'] {
  if (Array.isArray(files)) return files.length > 0 ? [...(files as string[])] : undefined;
  if (files instanceof RegExp) return patternOf(files);
  return files === undefined ? undefined : { computed: true };
}

/** The list, copied, unless there is nothing in it. */
function listOf(list: readonly string[] | undefined): string[] | undefined {
  return list !== undefined && list.length > 0 ? [...list] : undefined;
}

/**
 * The rules as plain data, sorted by `tech` in code unit order (not by locale), so that the same rules always give the same bytes.
 * Only `tech`, `name`, `type`, `hosts`, `dependencies`, `files`, `dotenv` and `extensions` are kept. The rules are not changed.
 */
export function catalogue(rules: readonly Rule[]): CatalogueEntry[] {
  return [...rules]
    .sort((a, b) => (a.tech < b.tech ? -1 : a.tech > b.tech ? 1 : 0))
    .map((rule) => {
      const entry: CatalogueEntry = { tech: rule.tech, name: rule.name, type: rule.type };
      const hosts = listOf(rule.hosts);
      if (hosts) entry.hosts = hosts;
      if (rule.dependencies && rule.dependencies.length > 0)
        entry.dependencies = rule.dependencies.map((dep) => dependencyOf(dep));
      const files = filesOf(rule.files);
      if (files) entry.files = files;
      const dotenv = listOf(rule.dotenv);
      if (dotenv) entry.dotenv = dotenv;
      const extensions = listOf(rule.extensions);
      if (extensions) entry.extensions = extensions;
      return entry;
    });
}
