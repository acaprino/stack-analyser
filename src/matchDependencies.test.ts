import { describe, expect, it } from 'vitest';

import './autoload.js';
import { evidenceKind, matchDependencies, matchDependenciesWithNames, matchedPackages } from './matchDependencies.js';

describe('matchedPackages', () => {
  it('lists, for every technology, the names that matched it in input order', () => {
    expect(matchedPackages(['left-pad', 'pg', 'postgres'], 'npm').get('postgresql')).toEqual(['pg', 'postgres']);
  });

  it('leaves the output of matchDependencies untouched', () => {
    expect(matchDependencies(['pg'], 'npm')).toEqual(new Map([['postgresql', ['postgresql matched: /^pg$/']]]));
  });

  it('names an image as it was declared, without its tag, and matches it by its repository', () => {
    expect(matchedPackages(['docker.io/library/redis:7'], 'docker').get('redis')).toEqual(['docker.io/library/redis']);
    expect(matchedPackages(['registry-1.docker.io/bitnami/postgresql'], 'docker').get('postgresql'))
      .toEqual(['registry-1.docker.io/bitnami/postgresql']);
  });

  it('names a package of any other ecosystem as it was declared', () => {
    expect(matchedPackages(['Sentry_SDK'], 'python').get('sentry')).toEqual(['Sentry_SDK']);
    expect(matchedPackages(['github.com/aws/aws-sdk-go-v2/service/s3'], 'golang').get('aws.s3'))
      .toEqual(['github.com/aws/aws-sdk-go-v2/service/s3']);
  });

  it('does not repeat a name that matched through several rules or several times', () => {
    expect(matchedPackages(['redis:6', 'redis:7'], 'docker').get('redis')).toEqual(['redis']);
  });

  it('finds nothing for an unknown name', () => {
    expect(matchedPackages(['left-pad'], 'npm')).toEqual(new Map());
  });
});

describe('matchDependenciesWithNames', () => {
  it.each([
    [['left-pad', 'pg', 'postgres', 'react'], 'npm'],
    [['redis:6', 'docker.io/library/redis:7', 'node'], 'docker'],
    [['actions/setup-node'], 'githubAction'],
    [['left-pad'], 'npm'],
    [[], 'python'],
  ] as const)('gives what matchDependencies and matchedPackages give for %j (%s)', (names, type) => {
    expect(matchDependenciesWithNames([...names], type)).toEqual({
      reasons: matchDependencies([...names], type),
      names: matchedPackages([...names], type),
    });
  });
});

describe('evidenceKind', () => {
  it.each([
    ['docker', 'image'],
    ['githubAction', 'action'],
    ['terraform', 'terraform'],
    ['terraform.resource', 'terraform'],
    ['npm', 'package'],
    ['python', 'package'],
    ['maven', 'package'],
  ] as const)('maps %s to %s', (type, kind) => {
    expect(evidenceKind(type)).toBe(kind);
  });
});
