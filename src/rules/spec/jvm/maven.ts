import { parseProjectXml } from '../../../common/xml.js';

import type { Dependency } from '../../../types/index.js';

type XmlElement = Record<string, unknown>;

function element(value: unknown): XmlElement | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as XmlElement : undefined;
}

function children(parent: XmlElement | undefined, key: string): XmlElement[] {
  const value = parent?.[key];
  return (Array.isArray(value) ? value : [value]).map(element).filter((item): item is XmlElement => !!item);
}

export function mavenProject(content: string): { name: string; dependencies: Dependency[] } | null {
  const root = element(parseProjectXml(content)?.project);
  if (!root || typeof root.artifactId !== 'string') return null;
  const parent = element(root.parent);
  const properties: XmlElement = {
    ...element(root.properties),
    'project.groupId': root.groupId ?? parent?.groupId,
    'project.version': root.version ?? parent?.version,
    'project.artifactId': root.artifactId,
  };
  function resolve(value: unknown): string {
    if (typeof value !== 'string') return '';
    const key = /^\$\{([^}]+)\}$/.exec(value)?.[1];
    const result = key ? properties[key] : value;
    return typeof result === 'string' && !result.includes('$') ? result : '';
  }

  const dependencies: Dependency[] = [];
  function add(entry: XmlElement, defaultGroup?: string) {
    const group = resolve(entry.groupId ?? defaultGroup);
    const artifact = resolve(entry.artifactId);
    if (group && artifact) dependencies.push(['maven', `${group}:${artifact}`, resolve(entry.version)]);
  }
  if (parent) add(parent);
  for (const dependency of children(element(root.dependencies), 'dependency')) add(dependency);
  for (const plugin of children(element(element(root.build)?.plugins), 'plugin')) {
    add(plugin, 'org.apache.maven.plugins');
  }
  return { name: root.artifactId, dependencies };
}
