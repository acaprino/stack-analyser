import { describe, expect, it } from 'vitest';

import './autoload.js';
import {
  evidenceKind,
  matchDependencies,
  matchDependenciesWithNames,
  matchedPackages,
} from './matchDependencies.js';

describe('matchedPackages', () => {
  it('should list, for every technology, the names that matched it in input order', () => {
    expect(matchedPackages(['left-pad', 'pg', 'postgres'], 'npm').get('postgresql')).toStrictEqual([
      'pg',
      'postgres',
    ]);
  });

  it('should leave the output of matchDependencies untouched', () => {
    expect(matchDependencies(['pg'], 'npm')).toStrictEqual(
      new Map([['postgresql', ['postgresql matched: /^pg$/']]])
    );
  });

  it('should name an image as it was declared, without its tag, and match it by its repository', () => {
    expect(matchedPackages(['docker.io/library/redis:7'], 'docker').get('redis')).toStrictEqual([
      'docker.io/library/redis',
    ]);
    expect(
      matchedPackages(['registry-1.docker.io/bitnami/postgresql'], 'docker').get('postgresql')
    ).toStrictEqual(['registry-1.docker.io/bitnami/postgresql']);
  });

  it('should name a package of any other ecosystem as it was declared', () => {
    expect(matchedPackages(['Sentry_SDK'], 'python').get('sentry')).toStrictEqual(['Sentry_SDK']);
    expect(
      matchedPackages(['github.com/aws/aws-sdk-go-v2/service/s3'], 'golang').get('aws.s3')
    ).toStrictEqual(['github.com/aws/aws-sdk-go-v2/service/s3']);
  });

  it('should not repeat a name that matched through several rules or several times', () => {
    expect(matchedPackages(['redis:6', 'redis:7'], 'docker').get('redis')).toStrictEqual(['redis']);
  });

  it('should find nothing for an unknown name', () => {
    expect(matchedPackages(['left-pad'], 'npm')).toStrictEqual(new Map());
  });
});

describe('matchDependenciesWithNames', () => {
  it.each([
    [['left-pad', 'pg', 'postgres', 'react'], 'npm'],
    [['redis:6', 'docker.io/library/redis:7', 'node'], 'docker'],
    [['actions/setup-node'], 'githubAction'],
    [['left-pad'], 'npm'],
    [[], 'python'],
  ] as const)(
    'should give what matchDependencies and matchedPackages give for %j (%s)',
    (names, type) => {
      expect(matchDependenciesWithNames([...names], type)).toStrictEqual({
        reasons: matchDependencies([...names], type),
        names: matchedPackages([...names], type),
      });
    }
  );
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
  ] as const)('should map %s to %s', (type, kind) => {
    expect(evidenceKind(type)).toBe(kind);
  });
});
