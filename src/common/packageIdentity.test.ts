import { describe, expect, it } from 'vitest';

import { imageReference, imageRepository, packagePattern } from './packageIdentity.js';

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
      name: 'localhost:5000/library/redis',
      version: '7@sha256:abcd',
    });
    expect(imageReference('index.docker.io/library/redis:7').name).toBe('redis');
    expect(imageReference('registry-1.docker.io/bitnami/redis:latest').name).toBe('bitnami/redis');
    expect(imageReference('gcr.io/cloud/redis@sha256:abcd')).toEqual({
      name: 'gcr.io/cloud/redis',
      version: 'sha256:abcd',
    });
  });

  it('gives the repository of an image as it is written, without its tag or digest', () => {
    expect(imageRepository('docker.io/apache/tika')).toBe('docker.io/apache/tika');
    expect(imageRepository('index.docker.io/library/postgres:15@sha256:abcd')).toBe(
      'index.docker.io/library/postgres'
    );
    expect(imageRepository('localhost:5000/Acme/redis:7')).toBe('localhost:5000/Acme/redis');
    expect(imageRepository('gcr.io/cloud/redis@sha256:abcd')).toBe('gcr.io/cloud/redis');
  });
});
