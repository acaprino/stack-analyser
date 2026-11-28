import { parseProjectXml } from '../../../common/xml.js';

import type { Dependency } from '../../../types/index.js';

type XmlElement = Record<string, unknown>;

function element(value: unknown): undefined | XmlElement {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as XmlElement)
    : undefined;
}

function children(parent: undefined | XmlElement, key: string): XmlElement[] {
  const value = parent?.[key];
  return (Array.isArray(value) ? value : [value])
    .map(element)
    .filter((item): item is XmlElement => !!item);
}

export function mavenProject(content: string): { name: string; dependencies: Dependency[] } | null {
  const root = element(
    parseProjectXml(content, [
      'http://maven.apache.org/POM/4.0.0',
      'http://maven.apache.org/POM/4.1.0',
    ])?.project
  );
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
    let result = value;
    for (let depth = 0; result.includes('${') && depth < 16; depth++) {
      if (result.length > 1024) return '';
      let unresolved = false;
      result = result.replaceAll(/\$\{([^}]+)\}/g, (_, key: string) => {
        const property = Object.hasOwn(properties, key) ? properties[key] : undefined;
        if (typeof property === 'string' && property.length <= 1024) return property;
        unresolved = true;
        return '';
      });
      if (unresolved) return '';
    }
    return result.length <= 1024 && !result.includes('$') ? result : '';
  }

  const dependencies: Dependency[] = [];
  function add(entry: XmlElement, defaultGroup?: string) {
    const group = resolve(entry.groupId ?? defaultGroup);
    const artifact = resolve(entry.artifactId);
    if (group && artifact)
      dependencies.push(['maven', `${group}:${artifact}`, resolve(entry.version)]);
  }
  if (parent) add(parent);
  for (const dependency of children(element(root.dependencies), 'dependency')) add(dependency);
  for (const plugin of children(element(element(root.build)?.plugins), 'plugin')) {
    add(plugin, 'org.apache.maven.plugins');
  }
  // A profile's dependencies and plugins are the project's when the profile is active (`-P`, a property, the JDK):
  // possible build targets, as the conditional item groups of MSBuild.
  for (const profile of children(element(root.profiles), 'profile')) {
    for (const dependency of children(element(profile.dependencies), 'dependency')) add(dependency);
    for (const plugin of children(element(element(profile.build)?.plugins), 'plugin')) {
      add(plugin, 'org.apache.maven.plugins');
    }
  }
  return { name: root.artifactId, dependencies };
}
