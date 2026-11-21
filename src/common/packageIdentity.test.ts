import { describe, expect, it } from 'vitest';

import { imageReference, packagePattern } from './packageIdentity.js';

describe('declared package identity', () => {
  it('honors ecosystem rules for literal coordinates', () => {
    expect(packagePattern('hyperscript.org', 'npm').test('hyperscriptXorg')).toBe(false);
    expect(packagePattern('django-rest.example', 'python').test('Django_REST-example')).toBe(true);
    expect(packagePattern('Mono.Cecil', 'nuget').test('mono.cecil')).toBe(true);
    expect(packagePattern('gopkg.in/yaml.v3', 'golang').test('gopkg.in/yaml.v30')).toBe(false);
    expect(packagePattern('github.com/test/go', 'golang').test('github.com/test/go/v3')).toBe(true);
  });

  it('distinguishes a registry port, tag, digest and official Docker Hub names', () => {
    expect(imageReference('localhost:5000/library/redis:7@sha256:abcd')).toEqual({
      name: 'localhost:5000/library/redis', version: '7@sha256:abcd',
    });
    expect(imageReference('index.docker.io/library/redis:7').name).toBe('redis');
    expect(imageReference('registry-1.docker.io/bitnami/redis:latest').name).toBe('bitnami/redis');
    expect(imageReference('gcr.io/cloud/redis@sha256:abcd')).toEqual({ name: 'gcr.io/cloud/redis', version: 'sha256:abcd' });
  });
});
