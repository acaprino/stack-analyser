import type { SupportedDeps } from '../types/rule.js';

/** A tag follows the last slash. A colon before it belongs to a registry port. */
export function imageReference(image: string): { name: string; version: string } {
  const [tagged, digest] = image.split('@', 2);
  const colon = tagged.indexOf(':', tagged.lastIndexOf('/') + 1);
  const hasTag = colon >= 0;
  const repository = (hasTag ? tagged.slice(0, colon) : tagged).toLowerCase();
  const name = repository.replace(/^(?:(?:index\.|registry-1\.)?docker\.io\/)?library\/(?=[^/]+$)/, '')
    .replace(/^(?:index\.|registry-1\.)?docker\.io\//, '');
  const tag = hasTag ? tagged.slice(colon + 1) : '';
  return { name, version: digest ? (tag ? `${tag}@${digest}` : digest) : tag || 'latest' };
}

export function packagePattern(name: string, type: SupportedDeps): RegExp {
  const escape = (part: string): string => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const literal = type === 'python' ? name.split(/[-_.]+/).map(escape).join('[-_.]+')
    : escape(type === 'docker' ? imageReference(name).name : name);
  const end = type === 'golang' ? '(?:/|$)' : '$';
  const insensitive = type === 'python' || type === 'nuget' || type === 'swiftpm';
  return new RegExp(`^${literal}${end}`, insensitive ? 'i' : '');
}
