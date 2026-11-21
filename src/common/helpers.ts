import path from 'node:path';

export function portablePath(value: string): string {
  return value.split(path.sep).join('/');
}

export function cleanPath(paths: string[], root: string): string[] {
  const base = portablePath(root);
  return paths.map((value) => {
    const normalized = portablePath(value);
    return normalized.startsWith(base) ? normalized.slice(base.length) : normalized;
  });
}
