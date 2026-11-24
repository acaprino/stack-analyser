import { describe, expect, it } from 'vitest';

import { analyser } from './index.js';
import { flatten } from '../payload/helpers.js';
import { FakeProvider } from '../provider/fake.js';
import '../autoload.js';

const project = () => new FakeProvider({
  paths: { '/': ['package.json', 'setup.cfg'] },
  files: { '/package.json': JSON.stringify({ name: 'app', dependencies: { react: '18' } }), '/setup.cfg': '' },
});

describe('declarations', () => {
  it('recognises external declarations and keeps their source', async () => {
    const result = await analyser({ provider: project(), declarations: [
      { type: 'python', name: 'requests', version: '>=2', path: 'setup.cfg', line: 4, source: 'python-build' },
      { type: 'python', name: 'not-a-known-package', path: 'setup.cfg', source: 'python-build' },
    ] });
    expect(result.toJson('').evidence).toContainEqual(
      { tech: 'requests', kind: 'package', value: 'requests', path: '/setup.cfg', line: 4, source: 'python-build' });
  });

  it('keeps both proofs when the fork and a declaration agree', async () => {
    const result = flatten(await analyser({ provider: project(), declarations: [
      { type: 'npm', name: 'react', path: 'package.json', line: 1, source: 'renovate' },
    ] }), { merge: true });
    const sources = result.toJson('').evidence
      .filter((e) => e.tech === 'react').map((e) => e.source).sort();
    expect(sources).toEqual(['renovate', 'stack-analyser']);
  });

  it('rejects a declaration outside the project or of an unknown type', async () => {
    const bad = (declaration: object) => analyser({ provider: project(), declarations: [declaration as never] });
    await expect(bad({ type: 'npm', name: 'react', path: '../other/package.json', source: 'x' })).rejects.toThrow(/declaration 0/);
    await expect(bad({ type: 'cobol', name: 'react', path: 'package.json', source: 'x' })).rejects.toThrow(/declaration 0/);
    await expect(bad({ type: 'npm', name: 'react', path: 'package.json' })).rejects.toThrow(/declaration 0/);
  });

  it('keeps an unknown name out of the result', async () => {
    const result = await analyser({ provider: project(), declarations: [
      { type: 'python', name: 'not-a-known-package', path: 'setup.cfg', source: 'python-build' },
    ] });
    const baseline = await analyser({ provider: project() });
    expect(result.toJson('')).toEqual({ ...baseline.toJson(''), id: result.id, childs: expect.anything() });
    expect(result.evidence).toEqual([]);
    expect(result.techs.size).toBe(0);
  });

  it('puts the technologies and their evidence on the root component', async () => {
    const result = await analyser({ provider: project(), declarations: [
      { type: 'python', name: 'requests', path: 'setup.cfg', line: 4, source: 'python-build' },
    ] });
    expect(result.techs.has('requests')).toBe(true);
    expect(result.evidence.map((e) => e.tech)).toEqual(['requests']);
    // The only other place is the component the technology implies, the same as for a manifest.
    const others = result.childs.flatMap((c) => c.evidence).filter((e) => e.source === 'python-build');
    expect(others.every((e) => e.tech === 'requests')).toBe(true);
    expect(result.childs.find((c) => c.name === 'app')!.evidence.some((e) => e.source === 'python-build')).toBe(false);
  });

  it('gives each ecosystem its own evidence kind and reduces an image to its repository', async () => {
    const result = await analyser({ provider: project(), declarations: [
      { type: 'docker', name: 'postgres:15.1-alpine', path: 'Dockerfile', line: 1, source: 'image-scan' },
      { type: 'githubAction', name: 'google-github-actions/auth', version: 'v4', path: '.github/workflows/ci.yml', line: 9, source: 'workflow-scan' },
    ] });
    const evidence = result.toJson('').evidence;
    expect(evidence).toContainEqual(
      { tech: 'postgresql', kind: 'image', value: 'postgres', path: '/Dockerfile', line: 1, source: 'image-scan' });
    expect(evidence).toContainEqual({
      tech: 'gcp', kind: 'action', value: 'google-github-actions/auth', path: '/.github/workflows/ci.yml', line: 9, source: 'workflow-scan',
    });
  });

  it('reports a declared image by the name that was sent, not by the repository it is matched as', async () => {
    const result = await analyser({ provider: project(), declarations: [
      { type: 'docker', name: 'docker.io/apache/tika', path: 'compose.yaml', line: 3, source: 'image-scan' },
      { type: 'docker', name: 'index.docker.io/library/postgres', path: 'compose.yaml', line: 7, source: 'image-scan' },
      { type: 'docker', name: 'registry-1.docker.io/bitnami/postgresql', path: 'compose.yaml', line: 9, source: 'image-scan' },
    ] });
    const evidence = result.toJson('').evidence;
    expect(evidence).toContainEqual({
      tech: 'apachetika', kind: 'image', value: 'docker.io/apache/tika', path: '/compose.yaml', line: 3, source: 'image-scan',
    });
    expect(evidence).toContainEqual({
      tech: 'postgresql', kind: 'image', value: 'index.docker.io/library/postgres', path: '/compose.yaml', line: 7, source: 'image-scan',
    });
    expect(evidence).toContainEqual({
      tech: 'postgresql', kind: 'image', value: 'registry-1.docker.io/bitnami/postgresql', path: '/compose.yaml', line: 9,
      source: 'image-scan',
    });
  });

  it('writes the path of a declaration the way the readers write theirs', async () => {
    // The same file, the same name and the same source as the fork's own evidence: they are one item.
    const result = flatten(await analyser({ provider: project(), declarations: [
      { type: 'npm', name: 'react', path: './package.json', source: 'stack-analyser' },
    ] }), { merge: true });
    expect(result.toJson('').evidence.filter((e) => e.tech === 'react')).toEqual([
      { tech: 'react', kind: 'package', value: 'react', path: '/package.json', source: 'stack-analyser' },
    ]);
  });

  it('does not change anything when the list is empty', async () => {
    const withList = await analyser({ provider: project(), declarations: [] });
    const without = await analyser({ provider: project() });
    expect(withList.toJson('').evidence).toEqual(without.toJson('').evidence);
    expect(withList.toJson('').techs).toEqual(without.toJson('').techs);
  });

  describe('validation', () => {
    const valid = { type: 'npm', name: 'react', path: 'package.json', source: 'x' };
    const run = (...declarations: unknown[]) => analyser({ provider: project(), declarations: declarations as never });

    it.each([
      ['an absolute path', { ...valid, path: '/etc/package.json' }, /"path"/],
      ['a Windows absolute path', { ...valid, path: String.raw`C:\other\package.json` }, /"path"/],
      ['a Windows drive-relative path', { ...valid, path: 'C:package.json' }, /"path"/],
      ['a path that leaves the root', { ...valid, path: 'a/../../package.json' }, /"path"/],
      ['a backslash path that leaves the root', { ...valid, path: String.raw`..\package.json` }, /"path"/],
      ['the root itself', { ...valid, path: '.' }, /"path"/],
      ['an unknown type', { ...valid, type: 'cobol' }, /"type"/],
      ['an inherited property as a type', { ...valid, type: 'constructor' }, /"type"/],
      ['no type', { name: 'react', path: 'package.json', source: 'x' }, /missing "type"/],
      ['no name', { type: 'npm', path: 'package.json', source: 'x' }, /missing "name"/],
      ['no path', { type: 'npm', name: 'react', source: 'x' }, /missing "path"/],
      ['no source', { type: 'npm', name: 'react', path: 'package.json' }, /missing "source"/],
      ['an empty source', { ...valid, source: '' }, /"source"/],
      ['a name that is not text', { ...valid, name: 7 }, /"name"/],
      ['a version that is not text', { ...valid, version: 18 }, /"version"/],
      ['a line that is not a positive integer', { ...valid, line: 0 }, /"line"/],
      ['a line that is not a number', { ...valid, line: '4' }, /"line"/],
      ['an entry that is not an object', 'react', /expected an object/],
      ['a null entry', null, /expected an object/],
    ])('rejects %s, naming the entry', async (_label, entry, message) => {
      await expect(run(entry)).rejects.toThrow(message);
      await expect(run(valid, entry)).rejects.toThrow(/declaration 1/);
    });

    it('rejects a value that is not an array', async () => {
      const bad = (declarations: unknown) => analyser({ provider: project(), declarations: declarations as never });
      await expect(bad({ type: 'npm' })).rejects.toThrow(/must be an array/);
      await expect(bad('react')).rejects.toThrow(/must be an array/);
    });

    it('accepts every supported type', async () => {
      const types = ['deno', 'docker', 'githubAction', 'golang', 'hex', 'maven', 'npm', 'nuget', 'php', 'pub', 'python',
        'ruby', 'rust', 'swiftpm', 'terraform.resource', 'terraform'];
      await expect(run(...types.map((type) => ({ ...valid, type })))).resolves.toBeDefined();
    });
  });
});
