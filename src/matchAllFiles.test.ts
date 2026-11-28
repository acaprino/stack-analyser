import { describe, expect, it } from 'vitest';

import { matchAllFiles, matchAllFilesWithEvidence } from './matchAllFiles.js';
import './autoload.js';

describe('matchAllFiles', () => {
  it('should find nothing', () => {
    const res = matchAllFiles([], '/');

    expect(res).toStrictEqual(new Map());
  });

  it('should find extension based matching: typescript', () => {
    const res = matchAllFiles([{ fp: '/index.tsx', name: 'index.tsx', type: 'file' }], '/');

    const exp = new Map();
    exp.set('typescript', ['matched extension: .tsx']);
    exp.set('jsx', ['matched extension: .tsx']);

    expect(res).toStrictEqual(exp);
  });

  it('should find file based matching: nodejs', () => {
    const res = matchAllFiles([{ fp: '/package.json', name: 'package.json', type: 'file' }], '/');

    const exp = new Map();
    exp.set('nodejs', ['matched file: package.json']);

    expect(res).toStrictEqual(exp);
  });

  it('should keep the reasons of matchAllFiles when it adds the evidence', () => {
    const files = [
      { fp: '/app/package.json', name: 'package.json', type: 'file' as const },
      { fp: '/app/index.tsx', name: 'index.tsx', type: 'file' as const },
    ];
    const withEvidence = matchAllFilesWithEvidence(files, { basePath: '/', folder: '/app' });

    expect([...withEvidence].map(([tech, match]) => [tech, match.reason])).toStrictEqual([
      ...matchAllFiles(files, '/'),
    ]);
  });

  it('should give the file found as evidence of a file rule', () => {
    const res = matchAllFilesWithEvidence(
      [{ fp: '/app/package.json', name: 'package.json', type: 'file' }],
      { basePath: '/', folder: '/app' }
    );

    expect(res.get('nodejs')).toStrictEqual({
      reason: ['matched file: package.json'],
      evidence: [{ kind: 'file', value: 'package.json', path: '/app/package.json' }],
    });
  });

  it('should give the analysed folder as evidence of an extension rule', () => {
    const res = matchAllFilesWithEvidence(
      [{ fp: '/app/index.tsx', name: 'index.tsx', type: 'file' }],
      { basePath: '/', folder: '/app' }
    );

    expect(res.get('typescript')).toStrictEqual({
      reason: ['matched extension: .tsx'],
      evidence: [{ kind: 'extension', value: '.tsx', path: '/app' }],
    });
  });
});
