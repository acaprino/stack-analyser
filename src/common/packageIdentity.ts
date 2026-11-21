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
  if (type === 'githubAction') {
    const [owner, repo, ...subpath] = name.split('/');
    if (!subpath.length) return new RegExp(`^${escape(name)}$`, 'i');
    // GitHub folds case for repository identity but retains case in paths within the repository.
    const repository = escape(`${owner}/${repo}`).replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
    return new RegExp(`^${repository}/${escape(subpath.join('/'))}$`);
  }
  const literal = type === 'python' ? name.split(/[-_.]+/).map(escape).join('[-_.]+')
    : escape(type === 'docker' ? imageReference(name).name : name);
  const end = type === 'golang' ? '(?:/|$)' : '$';
  const insensitive = type === 'python' || type === 'nuget' || type === 'swiftpm';
  return new RegExp(`^${literal}${end}`, insensitive ? 'i' : '');
}
