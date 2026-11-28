import type { SupportedDeps } from '../types/rule.js';

/** The repository of an image as it is written, without its tag or digest. A tag follows the last slash. A colon before it belongs to a registry port. */
export function imageRepository(image: string): string {
  const [tagged] = image.split('@', 1);
  const colon = tagged.indexOf(':', tagged.lastIndexOf('/') + 1);
  return colon === -1 ? tagged : tagged.slice(0, colon);
}

/** The repository as the rules compare it, in lower case and without Docker Hub's registry and `library/`, and the tag or digest. */
export function imageReference(image: string): { name: string; version: string } {
  const [tagged, digest] = image.split('@', 2);
  const repository = imageRepository(tagged);
  const name = repository
    .toLowerCase()
    .replace(/^(?:(?:index\.|registry-1\.)?docker\.io\/)?library\/(?=[^/]+$)/, '')
    .replace(/^(?:index\.|registry-1\.)?docker\.io\//, '');
  const tag = tagged.slice(repository.length + 1);
  return { name, version: digest ? (tag ? `${tag}@${digest}` : digest) : tag || 'latest' };
}

/** `part` with every character that means something in a regular expression escaped. */
function escape(part: string): string {
  return part.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function packagePattern(name: string, type: SupportedDeps): RegExp {
  if (type === 'githubAction') {
    const [owner, repo, ...subpath] = name.split('/');
    if (subpath.length === 0) return new RegExp(`^${escape(name)}$`, 'i');
    // GitHub folds case for repository identity but retains case in paths within the repository.
    const repository = escape(`${owner}/${repo}`).replaceAll(
      /[a-z]/gi,
      (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`
    );
    return new RegExp(`^${repository}/${escape(subpath.join('/'))}$`);
  }
  const literal =
    type === 'python'
      ? name
          .split(/[-_.]+/)
          .map((part) => escape(part))
          .join('[-_.]+')
      : escape(type === 'docker' ? imageReference(name).name : name);
  const end = type === 'golang' ? '(?:/|$)' : '$';
  const insensitive = type === 'python' || type === 'nuget' || type === 'swiftpm';
  return new RegExp(`^${literal}${end}`, insensitive ? 'i' : '');
}
